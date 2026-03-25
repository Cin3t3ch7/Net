// ─── OTP Service ─────────────────────────────────────────────────────────────
// Generates, stores (hashed), and validates OTP codes.
// Anti-brute-force: tracks attempts and blocks after OTP_MAX_ATTEMPTS.
// Uses PostgreSQL as the OTP store — NOT in-memory.

import bcrypt from "bcryptjs"
import { randomInt } from "crypto"
import { query } from "../db/pool"
import { env } from "../config/env"
import { logger } from "../db/logger"
import { sendOtpMessage } from "./telegram.service"
import type { OtpCodeRow } from "../types"

const BCRYPT_ROUNDS = 10

function generateOtp(): string {
  // Cryptographically secure, uniform 6-digit code via Node.js CSPRNG
  return randomInt(100_000, 1_000_000).toString()
}

/**
 * Invalidates any existing, unused OTP for this Telegram ID.
 */
async function invalidatePreviousCodes(telegramId: string): Promise<void> {
  await query(
    `UPDATE otp_codes SET used = true
     WHERE telegram_id = $1 AND used = false`,
    [telegramId]
  )
}

/**
 * Checks if the Telegram ID is currently blocked due to too many failed attempts.
 */
async function isBlocked(telegramId: string): Promise<boolean> {
  const { rows } = await query<{ blocked_until: Date | null }>(
    `SELECT blocked_until FROM otp_codes
     WHERE telegram_id = $1 AND blocked_until IS NOT NULL
       AND blocked_until > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [telegramId]
  )
  return rows.length > 0
}

/**
 * Creates a new OTP for the given Telegram ID, saves the hash to DB,
 * then sends it via Telegram bot.
 */
export async function createAndSendOtp(
  telegramId: string,
  ipAddress?: string
): Promise<void> {
  // Check for active block
  if (await isBlocked(telegramId)) {
    throw Object.assign(
      new Error(`Demasiados intentos fallidos. Espera ${env.OTP_BLOCK_DURATION_MINUTES} minutos.`),
      { statusCode: 429 }
    )
  }

  // Invalidate previous codes
  await invalidatePreviousCodes(telegramId)

  const otp = generateOtp()
  const codeHash = await bcrypt.hash(otp, BCRYPT_ROUNDS)
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000)

  await query(
    `INSERT INTO otp_codes (telegram_id, code_hash, expires_at, ip_address)
     VALUES ($1, $2, $3, $4)`,
    [telegramId, codeHash, expiresAt, ipAddress ?? null]
  )

  logger.info({ telegramId }, "OTP created and stored")

  // Send via Telegram (throws if bot fails)
  await sendOtpMessage(telegramId, otp)
}

/**
 * Verifies the OTP entered by the user.
 * Returns true on success, throws on failure.
 * Handles expiry, attempts, and blocking.
 */
export async function verifyOtp(
  telegramId: string,
  inputOtp: string
): Promise<void> {
  // Get the most recent unused, non-expired code
  const { rows } = await query<OtpCodeRow>(
    `SELECT * FROM otp_codes
     WHERE telegram_id = $1
       AND used = false
       AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [telegramId]
  )

  if (rows.length === 0) {
    throw Object.assign(
      new Error("No hay un código activo. Solicita uno nuevo."),
      { statusCode: 400 }
    )
  }

  const record = rows[0]

  // Increment attempt counter
  await query(
    `UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`,
    [record.id]
  )

  const currentAttempts = record.attempts + 1

  // Check brute force threshold
  if (currentAttempts >= env.OTP_MAX_ATTEMPTS) {
    const blockedUntil = new Date(
      Date.now() + env.OTP_BLOCK_DURATION_MINUTES * 60 * 1000
    )
    await query(
      `UPDATE otp_codes SET blocked_until = $1, used = true WHERE id = $2`,
      [blockedUntil, record.id]
    )
    logger.warn({ telegramId }, "OTP blocked after too many attempts")
    throw Object.assign(
      new Error(`Demasiados intentos. Acceso bloqueado por ${env.OTP_BLOCK_DURATION_MINUTES} minutos.`),
      { statusCode: 429 }
    )
  }

  const isValid = await bcrypt.compare(inputOtp, record.code_hash)

  if (!isValid) {
    const remaining = env.OTP_MAX_ATTEMPTS - currentAttempts
    throw Object.assign(
      new Error(`Código incorrecto. Te quedan ${remaining} intentos.`),
      { statusCode: 401 }
    )
  }

  // Mark code as used
  await query(
    `UPDATE otp_codes SET used = true WHERE id = $1`,
    [record.id]
  )

  logger.info({ telegramId }, "OTP verified successfully")
}

/**
 * Cleanup job: deletes expired and used OTP codes to keep the table small.
 * Call this periodically (e.g., every hour).
 */
export async function cleanupExpiredOtps(): Promise<number> {
  const { rowCount } = await query(
    `DELETE FROM otp_codes
     WHERE used = true OR expires_at < now() - INTERVAL '1 hour'`
  )
  return rowCount ?? 0
}

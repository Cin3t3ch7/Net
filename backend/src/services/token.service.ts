// ─── Token Service ───────────────────────────────────────────────────────────
// Manages JWT Access Tokens and Refresh Tokens.
// Refresh tokens are stored HASHED in the DB (bcrypt) for revocation.
//
// Secret separation:
//   - JWT_SECRET       → Access tokens only  (issuer: "smartime", audience: "smartime-client")
//   - UID_COOKIE_SECRET → UID cookie tokens only (purpose: "uid-session")
//   Never cross-use these secrets.

import jwt, { type SignOptions } from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { env } from "../config/env"
import { query } from "../db/pool"
import { logger } from "../db/logger"
import type { JwtPayload, RefreshTokenRow } from "../types"

const BCRYPT_ROUNDS = 10

// ─── Duration parsing (shared) ────────────────────────────────────────────────

const DURATION_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

function parseDurationParts(expiresIn: string): { value: number; unit: string } | null {
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  if (!match) return null
  return { value: parseInt(match[1], 10), unit: match[2] }
}

/** Converts a duration string (e.g. "7d", "15m") to milliseconds. Returns 7d fallback on invalid. */
export function parseDurationToMs(expiresIn: string): number {
  const parts = parseDurationParts(expiresIn)
  if (!parts) return 604_800_000 // 7d fallback
  return parts.value * DURATION_MS[parts.unit]
}

/** Converts a duration string to a future Date. Throws on invalid format (used at startup validation). */
function parseRefreshExpiry(expiresIn: string): Date {
  const parts = parseDurationParts(expiresIn)
  if (!parts) throw new Error(`Invalid REFRESH_TOKEN_EXPIRES_IN format: ${expiresIn}`)
  return new Date(Date.now() + parts.value * DURATION_MS[parts.unit])
}

// ─── Access Token ─────────────────────────────────────────────────────────────
// Signed with JWT_SECRET. Claims: issuer, audience, all user payload.

export function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: "smartime",
    audience: "smartime-client",
  }
  return jwt.sign(payload as object, env.JWT_SECRET, options)
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: "smartime",
    audience: "smartime-client",
  }) as JwtPayload
}

// ─── UID Cookie Token ─────────────────────────────────────────────────────────
// Signed with UID_COOKIE_SECRET (SEPARATE from JWT_SECRET).
// purpose claim = "uid-session" prevents an access token from being used as a uid cookie.

const UID_TOKEN_ISSUER = "smartime"
const UID_TOKEN_AUDIENCE = "smartime-uid"
const UID_TOKEN_PURPOSE = "uid-session"

export function signUidCookie(userId: string): string {
  return jwt.sign(
    { sub: userId, purpose: UID_TOKEN_PURPOSE },
    env.UID_COOKIE_SECRET,
    {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
      issuer: UID_TOKEN_ISSUER,
      audience: UID_TOKEN_AUDIENCE,
    }
  )
}

export function verifyUidCookie(token: string): string {
  const payload = jwt.verify(token, env.UID_COOKIE_SECRET, {
    issuer: UID_TOKEN_ISSUER,
    audience: UID_TOKEN_AUDIENCE,
  }) as { sub?: string; purpose?: string }

  if (payload.purpose !== UID_TOKEN_PURPOSE) {
    throw new Error("Invalid token purpose for uid cookie")
  }
  if (!payload.sub) {
    throw new Error("UID token missing sub claim")
  }
  return payload.sub
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

/**
 * Creates a new refresh token for a user, stores its hash in DB.
 * Returns the raw token (to be set as httpOnly cookie).
 */
export async function createRefreshToken(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const rawToken = randomUUID()
  const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS)
  const expiresAt = parseRefreshExpiry(env.REFRESH_TOKEN_EXPIRES_IN)

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, expiresAt, ipAddress ?? null, userAgent ?? null]
  )

  return rawToken
}

/**
 * Validates the raw refresh token: looks up non-revoked records for the user,
 * compares bcrypt hashes, checks expiry.
 * Returns the DB row on success, throws on failure.
 */
export async function validateRefreshToken(
  rawToken: string,
  userId: string
): Promise<RefreshTokenRow> {
  const { rows } = await query<RefreshTokenRow>(
    `SELECT * FROM refresh_tokens
     WHERE user_id = $1 AND revoked = false AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  )

  for (const row of rows) {
    const match = await bcrypt.compare(rawToken, row.token_hash)
    if (match) return row
  }

  throw Object.assign(
    new Error("Refresh token inválido o expirado."),
    { statusCode: 401 }
  )
}

/**
 * Revokes a specific refresh token by ID.
 */
export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked = true WHERE id = $1`,
    [tokenId]
  )
  logger.info({ tokenId }, "Refresh token revoked")
}

/**
 * Revokes ALL refresh tokens for a user (logout from all devices).
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  const { rowCount } = await query(
    `UPDATE refresh_tokens SET revoked = true
     WHERE user_id = $1 AND revoked = false`,
    [userId]
  )
  logger.info({ userId, count: rowCount }, "All refresh tokens revoked for user")
}

/**
 * Rotates a refresh token: revokes old one, creates new one.
 * Returns the new raw token.
 */
export async function rotateRefreshToken(
  oldTokenRow: RefreshTokenRow,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  await revokeRefreshToken(oldTokenRow.id)
  return createRefreshToken(oldTokenRow.user_id, ipAddress, userAgent)
}

// ─── Cookie options ───────────────────────────────────────────────────────────

export function refreshTokenCookieOptions(clear = false): object {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: clear ? 0 : parseDurationToMs(env.REFRESH_TOKEN_EXPIRES_IN),
  }
}

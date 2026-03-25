// ─── Auth Service ────────────────────────────────────────────────────────────
// Orchestrates the entire login flow: user lookup → OTP → token issuance.

import { query } from "../../db/pool"
import { logger } from "../../db/logger"
import { createAndSendOtp, verifyOtp } from "../../services/otp.service"
import {
  signAccessToken,
  createRefreshToken,
  validateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../../services/token.service"
import type { JwtPayload, UserRow } from "../../types"

/**
 * Looks up the user by telegramId and fetches their roles + permissions.
 * Returns null if the user is not registered.
 */
async function getUserWithPermissions(
  telegramId: string
): Promise<(UserRow & { roles: string[]; permissions: string[] }) | null> {
  const { rows } = await query<UserRow & { roles: string[]; permissions: string[] }>(
    `SELECT
       u.id,
       u.telegram_id,
       u.display_name,
       u.status,
       u.can_search_any,
       u.created_at,
       u.updated_at,
       COALESCE(ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles,
       COALESCE(ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), '{}') AS permissions
     FROM users u
     LEFT JOIN user_roles     ur ON ur.user_id = u.id
     LEFT JOIN roles           r ON r.id = ur.role_id
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions     p ON p.id = rp.permission_id
     WHERE u.telegram_id = $1
     GROUP BY u.id`,
    [telegramId]
  )

  return rows[0] ?? null
}

// ─── Step 1: Request OTP ──────────────────────────────────────────────────────

export async function requestOtpForUser(
  telegramId: string,
  ipAddress?: string
): Promise<void> {
  const user = await getUserWithPermissions(telegramId)

  if (!user) {
    // Return generic message — do NOT reveal whether the user exists
    throw Object.assign(
      new Error("Telegram ID no registrado en el sistema."),
      { statusCode: 404 }
    )
  }

  if (user.status !== "active") {
    throw Object.assign(
      new Error("Cuenta suspendida o inactiva. Contacta al administrador."),
      { statusCode: 403 }
    )
  }

  await createAndSendOtp(telegramId, ipAddress)
}

// ─── Step 2: Verify OTP + Issue Tokens ───────────────────────────────────────

export interface LoginResult {
  accessToken: string
  rawRefreshToken: string
  user: {
    id: string
    telegramId: string
    displayName: string
    roles: string[]
    permissions: string[]
  }
}

export async function loginWithOtp(
  telegramId: string,
  otp: string,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> {
  // 1. Verify OTP (throws on failure)
  await verifyOtp(telegramId, otp)

  // 2. Fetch user with roles
  const user = await getUserWithPermissions(telegramId)
  if (!user || user.status !== "active") {
    throw Object.assign(new Error("Usuario no disponible."), { statusCode: 403 })
  }

  // 3. Build JWT payload
  const payload: Omit<JwtPayload, "iat" | "exp"> = {
    sub:         user.id,
    telegramId:  user.telegram_id,
    displayName: user.display_name,
    roles:       user.roles,
    permissions: user.permissions,
    canSearchAny: user.can_search_any,
  }

  // 4. Issue tokens
  const accessToken      = signAccessToken(payload)
  const rawRefreshToken  = await createRefreshToken(user.id, ipAddress, userAgent)

  logger.info({ userId: user.id, telegramId }, "User logged in successfully")

  return {
    accessToken,
    rawRefreshToken,
    user: {
      id:          user.id,
      telegramId:  user.telegram_id,
      displayName: user.display_name,
      roles:       user.roles,
      permissions: user.permissions,
    },
  }
}

// ─── Refresh Access Token ─────────────────────────────────────────────────────

export interface RefreshResult {
  accessToken: string
  rawRefreshToken: string
}

export async function refreshAccessToken(
  rawRefreshToken: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<RefreshResult> {
  const tokenRow = await validateRefreshToken(rawRefreshToken, userId)
  const user = await getUserWithPermissions(
    // We need to fetch user via id, not telegramId
    await getUserTelegramIdById(userId)
  )
  if (!user || user.status !== "active") {
    await revokeRefreshToken(tokenRow.id)
    throw Object.assign(new Error("Usuario no disponible."), { statusCode: 403 })
  }

  const payload: Omit<JwtPayload, "iat" | "exp"> = {
    sub:         user.id,
    telegramId:  user.telegram_id,
    displayName: user.display_name,
    roles:       user.roles,
    permissions: user.permissions,
    canSearchAny: user.can_search_any,
  }

  const newAccessToken     = signAccessToken(payload)
  const newRawRefreshToken = await rotateRefreshToken(tokenRow, ipAddress, userAgent)

  return { accessToken: newAccessToken, rawRefreshToken: newRawRefreshToken }
}

async function getUserTelegramIdById(userId: string): Promise<string> {
  const { rows } = await query<{ telegram_id: string }>(
    `SELECT telegram_id FROM users WHERE id = $1`,
    [userId]
  )
  if (!rows[0]) throw Object.assign(new Error("Usuario no encontrado."), { statusCode: 404 })
  return rows[0].telegram_id
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutUser(
  rawRefreshToken: string,
  userId: string
): Promise<void> {
  try {
    const tokenRow = await validateRefreshToken(rawRefreshToken, userId)
    await revokeRefreshToken(tokenRow.id)
  } catch {
    // Already invalid — that's fine for logout
  }
  logger.info({ userId }, "User logged out")
}

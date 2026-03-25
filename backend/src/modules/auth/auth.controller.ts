// ─── Auth Controller ─────────────────────────────────────────────────────────
// Thin HTTP layer — delegates all logic to auth.service.ts.

import type { Request, Response } from "express"
import { env } from "../../config/env"
import { asyncHandler } from "../../middlewares/error.middleware"
import { refreshTokenCookieOptions, signUidCookie, verifyUidCookie, parseDurationToMs } from "../../services/token.service"
import {
  requestOtpForUser,
  loginWithOtp,
  refreshAccessToken,
  logoutUser,
} from "./auth.service"

/**
 * Cookie options for the non-sensitive userId cookie.
 * httpOnly: true — cannot be read or written by frontend JavaScript.
 * This replaces the previous `document.cookie` approach in the frontend.
 */
function uidCookieOptions(clear = false): object {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
    // Derived from env so it always stays in sync with the refresh token lifetime
    maxAge: clear ? 0 : parseDurationToMs(env.REFRESH_TOKEN_EXPIRES_IN),
  }
}

// ─── POST /api/auth/otp/request ──────────────────────────────────────────────

export const handleRequestOtp = asyncHandler(async (req: Request, res: Response) => {
  const { telegramId } = req.body as { telegramId: string }
  const ipAddress = req.ip

  await requestOtpForUser(telegramId, ipAddress)

  res.json({
    success: true,
    message: `Código enviado por Telegram. Tienes ${env.OTP_EXPIRY_SECONDS} segundos.`,
  })
})

// ─── POST /api/auth/otp/verify ───────────────────────────────────────────────

export const handleVerifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { telegramId, otp } = req.body as { telegramId: string; otp: string }
  const ipAddress = req.ip
  const userAgent = req.headers["user-agent"]

  const result = await loginWithOtp(telegramId, otp, ipAddress, userAgent)

  // Set httpOnly refresh token cookie
  res.cookie(
    env.REFRESH_TOKEN_COOKIE_NAME,
    result.rawRefreshToken,
    refreshTokenCookieOptions() as object
  )

  // Set httpOnly userId cookie for the refresh flow.
  // Modificado: Ahora es un JWT firmado, previniendo tampering en el Edge middleware.
  const signedUid = signUidCookie(result.user.id)
  res.cookie("smartime_uid", signedUid, uidCookieOptions() as object)

  // Return access token and user info (no sensitive data)
  res.json({
    success: true,
    accessToken: result.accessToken,
    user: result.user,
  })
})

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

export const handleRefresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies[env.REFRESH_TOKEN_COOKIE_NAME] as string | undefined

  if (!rawRefreshToken) {
    res.status(401).json({ error: "Refresh token no encontrado." })
    return
  }

  // We need the userId — read it securely from the signed JWT cookie
  const uidToken = req.cookies["smartime_uid"] as string | undefined
  if (!uidToken) {
    res.status(401).json({ error: "Sesión no identificada." })
    return
  }

  let userId: string;
  try {
    userId = verifyUidCookie(uidToken);
  } catch {
    res.status(401).json({ error: "Firma de sesión inválida." })
    return
  }

  const ipAddress = req.ip
  const userAgent = req.headers["user-agent"]

  const result = await refreshAccessToken(rawRefreshToken, userId, ipAddress, userAgent)

  // Rotate the refresh token cookie
  res.cookie(
    env.REFRESH_TOKEN_COOKIE_NAME,
    result.rawRefreshToken,
    refreshTokenCookieOptions() as object
  )

  // Re-emit the httpOnly uid cookie so it stays in sync after rotation
  const signedUid = signUidCookie(userId)
  res.cookie("smartime_uid", signedUid, uidCookieOptions() as object)

  res.json({
    success: true,
    accessToken: result.accessToken,
  })
})

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

export const handleLogout = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies[env.REFRESH_TOKEN_COOKIE_NAME] as string | undefined
  const userId = req.user?.sub

  if (rawRefreshToken && userId) {
    await logoutUser(rawRefreshToken, userId)
  }

  // Clear both httpOnly cookies
  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, refreshTokenCookieOptions(true) as object)
  res.clearCookie("smartime_uid", uidCookieOptions(true) as object)

  res.json({ success: true, message: "Sesión cerrada correctamente." })
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

export const handleGetMe = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!
  res.json({
    id:          user.sub,
    telegramId:  user.telegramId,
    displayName: user.displayName,
    roles:       user.roles,
    permissions: user.permissions,
  })
})

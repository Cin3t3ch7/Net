// ─── Auth Service ─────────────────────────────────────────────────────────────
// Connects to the real Express backend.
// OTP is generated, stored, and delivered ENTIRELY on the server.
// The frontend never sees or handles the raw OTP.
//
// Endpoints:
//   requestOtp → POST /api/auth/otp/request  { telegramId }
//   verifyOtp  → POST /api/auth/otp/verify   { telegramId, otp }
//   logout     → POST /api/auth/logout
//   getSession → GET  /api/auth/me

import type { Session } from "@/types/auth"
import { setSession, clearSession, getSession } from "@/lib/session"
import { apiRequest, setAccessToken } from "@/lib/api-client"

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RequestOtpResult {
  success: boolean
  message: string
}

/**
 * Step 1: Request an OTP for the given Telegram ID.
 * The backend sends the OTP directly via Telegram bot — never via the browser.
 */
export async function requestOtp(telegramId: string): Promise<RequestOtpResult> {
  return apiRequest<RequestOtpResult>("/api/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ telegramId }),
    skipAuth: true,
  })
}

export interface VerifyOtpResult {
  success: boolean
  session?: Session
  message?: string
}

/**
 * Step 2: Verify the OTP.
 * Backend returns a JWT access token and sets an httpOnly refresh token cookie.
 */
export async function verifyOtp(
  telegramId: string,
  otp: string
): Promise<VerifyOtpResult> {
  const data = await apiRequest<{
    success: boolean
    accessToken: string
    user: {
      id: string
      telegramId: string
      displayName: string
      roles: string[]
    }
  }>("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ telegramId, otp }),
    skipAuth: true,
  })

  // Store access token in memory (NOT in localStorage/sessionStorage)
  setAccessToken(data.accessToken)

  // NOTE: smartime_uid is now set as httpOnly by the backend on /otp/verify.
  // The frontend no longer writes this cookie — it cannot be tampered with from JS.

  // Build the session object for the frontend guards
  const session: Session = {
    telegramId:      data.user.telegramId,
    displayName:     data.user.displayName,
    role:            data.user.roles.includes("admin") ? "admin" : "user",
    authenticatedAt: new Date().toISOString(),
    expiresAt:       new Date(Date.now() + 15 * 60 * 1000).toISOString(), // AT lifespan
  }

  setSession(session)
  return { success: true, session }
}

/**
 * Logs out the current user.
 * Calls backend to revoke the refresh token server-side.
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" })
  } catch { /* silently ignore network errors on logout */ }
  setAccessToken(null)
  clearSession()
}

/**
 * Returns the current in-memory session, or null if not authenticated.
 * Validates against the server — call on app mount.
 */
export async function validateSession(): Promise<Session | null> {
  try {
    const data = await apiRequest<{
      id: string
      telegramId: string
      displayName: string
      roles: string[]
    }>("/api/auth/me")

    const session: Session = {
      telegramId:      data.telegramId,
      displayName:     data.displayName,
      role:            data.roles.includes("admin") ? "admin" : "user",
      authenticatedAt: new Date().toISOString(),
      expiresAt:       new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }
    setSession(session)
    return session
  } catch {
    setAccessToken(null)
    clearSession()
    return null
  }
}

/**
 * @deprecated Use `getSession()` from `@/lib/session` directly instead.
 * Kept for backwards compatibility only.
 */
export function getAuthSession(): Session | null {
  return getSession()
}

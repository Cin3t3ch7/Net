// ─── Session Helpers ──────────────────────────────────────────────────────────
// sessionStorage is used only for UI state (display name, role, telegram ID).
// Real authentication is controlled server-side via JWT + httpOnly cookie.
// On app mount, useSession calls validateSession() to confirm server-side auth.

import type { Session } from "@/types/auth"
import { SESSION_KEY } from "@/lib/constants"

/**
 * Safely reads the current session from sessionStorage.
 * Returns null if no session exists or if parsing fails.
 * NOTE: This is for UI display only — the server validates the actual JWT.
 */
export function getSession(): Session | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    clearSession()
    return null
  }
}

/**
 * Writes a session to sessionStorage.
 */
export function setSession(session: Session): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

/**
 * Removes the session from sessionStorage.
 * Call this on logout.
 */
export function clearSession(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(SESSION_KEY)
}

/**
 * Returns true if a local session record exists.
 * Use validateSession() to confirm with the server.
 */
export function isAuthenticated(): boolean {
  return getSession() !== null
}


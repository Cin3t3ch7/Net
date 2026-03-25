// ─── App Constants ────────────────────────────────────────────────────────────
// NOTE: No secrets or admin IDs here — those live in backend/.env only.

/**
 * OTP expiry in seconds — used by the frontend countdown timer.
 * The backend enforces this value server-side via its own .env.
 */
export const OTP_EXPIRY_SECONDS = 60

/** Session storage key for the user session. */
export const SESSION_KEY = "smartime_session"

/** App version */
export const APP_VERSION = "2.0.0"

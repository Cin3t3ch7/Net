// ─── Auth Types ───────────────────────────────────────────────────────────────

/** Steps in the Telegram OTP login flow */
export type OtpFlowStep =
  | "idle"      // Initial state, waiting for Telegram ID
  | "sending"   // Requesting OTP from backend/bot
  | "sent"      // OTP was sent, waiting for user to enter it
  | "verifying" // Verifying the entered OTP
  | "error"     // An error occurred at any step
  | "success"   // OTP verified successfully

/** User roles in the system */
export type UserRole = "admin" | "user"

/** Session object stored in sessionStorage after successful login */
export interface Session {
  telegramId: string
  displayName: string
  role: UserRole
  authenticatedAt: string // ISO timestamp
  expiresAt: string       // ISO timestamp — for future server-side validation
}

/** State for the OTP login flow */
export interface OtpFlowState {
  step: OtpFlowStep
  telegramId: string
  errorMessage: string | null
  otpRequestedAt: string | null // ISO timestamp when OTP was sent
}

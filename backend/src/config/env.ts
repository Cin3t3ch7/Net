// ─── Environment Configuration ─────────────────────────────────────────────
// Loads and validates all environment variables at startup.
// If a required variable is missing or invalid, the app will NOT start.

import { config } from "dotenv"
import path from "path"

// Load .env from backend root
config({ path: path.resolve(__dirname, "../../.env") })

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`[CONFIG] Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

/** Validates that a secret is a hex string of the required byte length. Throws on startup if invalid. */
function requireHexSecret(key: string, byteLength: number): string {
  const value = requireEnv(key)
  const expectedLen = byteLength * 2
  if (value.length !== expectedLen || !/^[0-9a-fA-F]+$/.test(value)) {
    throw new Error(
      `[CONFIG] ${key} must be exactly ${expectedLen} hex characters (${byteLength} bytes). ` +
      `Got ${value.length} chars. Generate with: node -e "console.log(require('crypto').randomBytes(${byteLength}).toString('hex'))"`
    )
  }
  return value
}

/** Validates that a string secret meets a minimum length. Throws on startup if invalid. */
function requireMinLengthSecret(key: string, minLen: number): string {
  const value = requireEnv(key)
  if (value.length < minLen) {
    throw new Error(
      `[CONFIG] ${key} must be at least ${minLen} characters long. ` +
      `Got ${value.length}. Generate with: node -e "console.log(require('crypto').randomBytes(${Math.ceil(minLen / 2)}).toString('hex'))"`
    )
  }
  return value
}

export const env = {
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  PORT: parseInt(optionalEnv("PORT", "4000"), 10),
  FRONTEND_URL: optionalEnv("FRONTEND_URL", "http://localhost:3000"),

  // Database
  DATABASE_URL: requireEnv("DATABASE_URL"),
  DB_SSL: optionalEnv("DB_SSL", "false") === "true",

  // JWT — Access Token
  // Used ONLY for signing and verifying access tokens. Never reuse for other purposes.
  JWT_SECRET: requireMinLengthSecret("JWT_SECRET", 64),
  JWT_EXPIRES_IN: optionalEnv("JWT_EXPIRES_IN", "15m"),

  // JWT — UID Cookie Token
  // SEPARATE secret used ONLY for the smartime_uid cookie JWT.
  // Must differ from JWT_SECRET to prevent cross-purpose token abuse.
  UID_COOKIE_SECRET: requireMinLengthSecret("UID_COOKIE_SECRET", 64),

  // Refresh Token
  // REFRESH_TOKEN_SECRET is NOT used for JWT signing — refresh tokens are
  // random UUIDs stored hashed in DB. This secret is reserved for future
  // HMAC signing of refresh token values if a stateless variant is needed.
  REFRESH_TOKEN_EXPIRES_IN: optionalEnv("REFRESH_TOKEN_EXPIRES_IN", "7d"),
  REFRESH_TOKEN_COOKIE_NAME: optionalEnv("REFRESH_TOKEN_COOKIE_NAME", "smartime_rt"),

  // Cookie Signing (express cookie-parser signed cookies)
  COOKIE_SECRET: requireMinLengthSecret("COOKIE_SECRET", 32),

  // Telegram
  TELEGRAM_BOT_TOKEN: requireEnv("TELEGRAM_BOT_TOKEN"),
  TELEGRAM_ADMIN_ID: requireEnv("TELEGRAM_ADMIN_ID"),

  // IMAP password encryption — AES-256-GCM requires exactly 32 bytes (64 hex chars)
  IMAP_ENCRYPTION_KEY: requireHexSecret("IMAP_ENCRYPTION_KEY", 32),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(optionalEnv("RATE_LIMIT_WINDOW_MS", "60000"), 10),
  RATE_LIMIT_GENERAL_MAX: parseInt(optionalEnv("RATE_LIMIT_GENERAL_MAX", "100"), 10),
  RATE_LIMIT_AUTH_MAX: parseInt(optionalEnv("RATE_LIMIT_AUTH_MAX", "10"), 10),
  RATE_LIMIT_SEARCH_MAX: parseInt(optionalEnv("RATE_LIMIT_SEARCH_MAX", "15"), 10),

  // OTP
  OTP_EXPIRY_SECONDS: parseInt(optionalEnv("OTP_EXPIRY_SECONDS", "60"), 10),
  OTP_MAX_ATTEMPTS: parseInt(optionalEnv("OTP_MAX_ATTEMPTS", "5"), 10),
  OTP_BLOCK_DURATION_MINUTES: parseInt(optionalEnv("OTP_BLOCK_DURATION_MINUTES", "15"), 10),

  get isProduction() {
    return this.NODE_ENV === "production"
  },
  get isDevelopment() {
    return this.NODE_ENV === "development"
  },
}

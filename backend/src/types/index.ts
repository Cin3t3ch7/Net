// ─── Shared Backend Types ────────────────────────────────────────────────────

export type UserRole   = "admin" | "user"
export type UserStatus = "active" | "inactive" | "suspended"
export type EmailStatus = "active" | "inactive"

// ─── DB Row shapes (snake_case = postgres column names) ──────────────────────

export interface UserRow {
  id:             string
  telegram_id:    string
  display_name:   string
  status:         UserStatus
  can_search_any: boolean
  created_at:     Date
  updated_at:     Date | null
  // Joined fields (when roles are fetched)
  roles?:         string[]
  permissions?:   string[]
}

export interface OtpCodeRow {
  id:            string
  telegram_id:   string
  code_hash:     string
  expires_at:    Date
  used:          boolean
  attempts:      number
  blocked_until: Date | null
  ip_address:    string | null
  created_at:    Date
}

export interface RefreshTokenRow {
  id:         string
  user_id:    string
  token_hash: string
  expires_at: Date
  revoked:    boolean
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

export interface EmailRow {
  id:         string
  user_id:    string
  address:    string
  verified:   boolean
  status:     EmailStatus
  created_at: Date
}

export interface ImapConfigRow {
  id:           string
  domain:       string
  server:       string
  port:         number
  email:        string
  password_enc: string  // NEVER returned to client — decrypted only internally
  use_ssl:      boolean
  created_by:   string | null
  created_at:   Date
  updated_at:   Date | null
}

// ─── JWT Payload ─────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub:         string     // user id (UUID)
  telegramId:  string
  displayName: string
  roles:       string[]
  permissions: string[]
  canSearchAny: boolean
  iat?:        number
  exp?:        number
}

// ─── Request enrichment ───────────────────────────────────────────────────────
// After auth middleware, req.user is populated

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

// ─── API Response shapes (camelCase for the frontend) ────────────────────────

export interface ApiUser {
  id:            string
  telegramId:    string
  displayName:   string
  status:        UserStatus
  canSearchAny:  boolean
  roles:         string[]
  allowedEmails: string[]
  createdAt:     string
  updatedAt?:    string
}

export interface ApiImapConfig {
  id:        string
  domain:    string
  server:    string
  port:      number
  email:     string
  // password is NEVER included
  useSsl:    boolean
  createdAt: string
  createdBy: string | null
}

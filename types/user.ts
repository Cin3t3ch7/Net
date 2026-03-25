// ─── User Types ───────────────────────────────────────────────────────────────

import type { UserRole } from "./auth"

/** Status of a user account */
export type UserStatus = "active" | "inactive" | "suspended"

/**
 * Core user entity. Designed to match a future backend schema.
 * No passwords stored — auth is entirely Telegram OTP-based.
 */
export interface User {
  id: string
  telegramId: string
  displayName: string
  role: UserRole
  status: UserStatus
  allowedEmails: string[]
  canSearchAny: boolean
  createdAt: string // ISO date string
  updatedAt?: string
}

/** Input shape for creating a new user (form → service) */
export interface CreateUserInput {
  telegramId: string
  displayName: string
  role: UserRole
  status: UserStatus
  allowedEmails?: string[]
  canSearchAny?: boolean
}

/** Input shape for updating an existing user */
export interface UpdateUserInput {
  displayName?: string
  role?: UserRole
  status?: UserStatus
  allowedEmails?: string[]
  canSearchAny?: boolean
}

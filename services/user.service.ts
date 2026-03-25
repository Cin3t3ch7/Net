// ─── User Service ────────────────────────────────────────────────────────────
// Connects to the real Express backend for all user management operations.
// All requests are authenticated (Bearer token attached by api-client).
//
// Endpoints:
//   listUsers        → GET    /api/users
//   createUser       → POST   /api/users
//   updateUser       → PATCH  /api/users/:id
//   deleteUser       → DELETE /api/users/:id
//   toggleSearchAny  → PATCH  /api/users/:id/search-any
//   updateUserEmails → PATCH  /api/users/:id/emails

import type { User, CreateUserInput, UpdateUserInput } from "@/types/user"
import { apiRequest } from "@/lib/api-client"

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns all users. */
export async function listUsers(): Promise<User[]> {
  return apiRequest<User[]>("/api/users")
}

/** Creates a new user. Throws if telegramId already exists. */
export async function createUser(data: CreateUserInput): Promise<User> {
  return apiRequest<User>("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

/** Updates a user by id. Throws if user not found. */
export async function updateUser(id: string, data: UpdateUserInput): Promise<User> {
  return apiRequest<User>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

/** Deletes a user by id. Throws if user not found. */
export async function deleteUser(id: string): Promise<void> {
  return apiRequest<void>(`/api/users/${id}`, { method: "DELETE" })
}

/** Toggles the canSearchAny flag for a user. */
export async function toggleSearchAny(id: string): Promise<User> {
  return apiRequest<User>(`/api/users/${id}/search-any`, { method: "PATCH" })
}

/** Updates the entire list of allowed emails for a user. */
export async function updateUserEmails(id: string, emails: string[]): Promise<User> {
  return apiRequest<User>(`/api/users/${id}/emails`, {
    method: "PATCH",
    body: JSON.stringify({ emails }),
  })
}


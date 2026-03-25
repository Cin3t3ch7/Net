// ─── Users Repository ────────────────────────────────────────────────────────
// All SQL queries for user management in one place.
// Uses DB transactions for multi-step writes (createUser, updateUser).
// listUsers() uses a single JOIN query to avoid the N+1 problem.

import { query, pool } from "../../db/pool"
import { logger } from "../../db/logger"
import type { ApiUser, UserRow, UserStatus } from "../../types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetches a single user by their UUID, including roles, permissions, and emails.
 * Used after single-user mutations (create, update) to return the canonical shape.
 */
async function getUserById(id: string): Promise<
  (UserRow & { roles: string[]; permissions: string[]; emails: string[] }) | null
> {
  const { rows } = await query<UserRow & { roles: string[]; permissions: string[]; emails: string[] }>(
    `SELECT
       u.id, u.telegram_id, u.display_name, u.status, u.can_search_any,
       u.created_at, u.updated_at,
       COALESCE(ARRAY_AGG(DISTINCT r.name)  FILTER (WHERE r.name    IS NOT NULL), '{}') AS roles,
       COALESCE(ARRAY_AGG(DISTINCT p.name)  FILTER (WHERE p.name    IS NOT NULL), '{}') AS permissions,
       COALESCE(ARRAY_AGG(DISTINCT e.address) FILTER (WHERE e.address IS NOT NULL), '{}') AS emails
     FROM users u
     LEFT JOIN user_roles     ur ON ur.user_id = u.id
     LEFT JOIN roles           r ON r.id = ur.role_id
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions     p ON p.id = rp.permission_id
     LEFT JOIN emails          e ON e.user_id = u.id AND e.status = 'active'
     WHERE u.id = $1
     GROUP BY u.id`,
    [id]
  )
  return rows[0] ?? null
}

function toApiUser(
  row: UserRow & { roles: string[]; emails: string[] }
): ApiUser {
  return {
    id:            row.id,
    telegramId:    row.telegram_id,
    displayName:   row.display_name,
    status:        row.status,
    canSearchAny:  row.can_search_any,
    roles:         row.roles,
    allowedEmails: row.emails,
    createdAt:     row.created_at.toISOString(),
    updatedAt:     row.updated_at?.toISOString(),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Lists all users. Uses a single query with left-joins for roles and emails,
 * eliminating the previous N+1 pattern (one getUserEmails call per user).
 */
export async function listUsers(): Promise<ApiUser[]> {
  const { rows } = await query<UserRow & { roles: string[]; emails: string[] }>(
    `SELECT
       u.id, u.telegram_id, u.display_name, u.status, u.can_search_any,
       u.created_at, u.updated_at,
       COALESCE(ARRAY_AGG(DISTINCT r.name)    FILTER (WHERE r.name    IS NOT NULL), '{}') AS roles,
       COALESCE(ARRAY_AGG(DISTINCT e.address) FILTER (WHERE e.address IS NOT NULL), '{}') AS emails
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r       ON r.id = ur.role_id
     LEFT JOIN emails e      ON e.user_id = u.id AND e.status = 'active'
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  )

  return rows.map(toApiUser)
}

export interface CreateUserData {
  telegramId:   string
  displayName:  string
  role:         string
  status:       UserStatus
  allowedEmails?: string[]
  canSearchAny?: boolean
}

/**
 * Creates a user with their role and initial emails in a single transaction.
 * If any step fails the entire operation is rolled back — no partial state.
 */
export async function createUser(data: CreateUserData): Promise<ApiUser> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // 1. Uniqueness check
    const { rows: existing } = await client.query(
      `SELECT id FROM users WHERE telegram_id = $1`,
      [data.telegramId]
    )
    if (existing.length > 0) {
      throw Object.assign(
        new Error(`Ya existe un usuario con el Telegram ID ${data.telegramId}`),
        { statusCode: 409 }
      )
    }

    // 2. Resolve role id
    const { rows: roleRows } = await client.query<{ id: number }>(
      `SELECT id FROM roles WHERE name = $1`,
      [data.role]
    )
    if (!roleRows[0]) {
      throw Object.assign(new Error(`Rol '${data.role}' no existe.`), { statusCode: 400 })
    }
    const roleId = roleRows[0].id

    // 3. Insert user
    const { rows: userRows } = await client.query<{ id: string }>(
      `INSERT INTO users (telegram_id, display_name, status, can_search_any)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [data.telegramId, data.displayName, data.status, data.canSearchAny ?? false]
    )
    const userId = userRows[0].id

    // 4. Assign role
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
      [userId, roleId]
    )

    // 5. Insert initial emails (deduplicated, lowercased)
    if (data.allowedEmails?.length) {
      const unique = [...new Set(data.allowedEmails.map((e) => e.toLowerCase()))]
      for (const address of unique) {
        await client.query(
          `INSERT INTO emails (user_id, address) VALUES ($1, $2)
           ON CONFLICT (user_id, address) DO NOTHING`,
          [userId, address]
        )
      }
    }

    await client.query("COMMIT")
    logger.info({ userId, telegramId: data.telegramId }, "User created")

    // Fetch and return the canonical shape using the shared helper
    const user = await getUserById(userId)
    return toApiUser(user!)
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export interface UpdateUserData {
  displayName?:  string
  role?:         string
  status?:       UserStatus
  canSearchAny?: boolean
}

/**
 * Updates user fields and optionally their role in a single transaction.
 * Prevents partial updates where displayName is saved but role update fails.
 */
export async function updateUser(id: string, data: UpdateUserData): Promise<ApiUser> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Check existence
    const { rows: existing } = await client.query(
      `SELECT id FROM users WHERE id = $1`,
      [id]
    )
    if (!existing[0]) {
      throw Object.assign(new Error("Usuario no encontrado."), { statusCode: 404 })
    }

    // Update scalar fields (only if at least one is provided)
    if (
      data.displayName !== undefined ||
      data.status !== undefined ||
      data.canSearchAny !== undefined
    ) {
      await client.query(
        `UPDATE users SET
           display_name   = COALESCE($2, display_name),
           status         = COALESCE($3, status),
           can_search_any = COALESCE($4, can_search_any),
           updated_at     = now()
         WHERE id = $1`,
        [id, data.displayName ?? null, data.status ?? null, data.canSearchAny ?? null]
      )
    }

    // Update role if provided (delete + re-insert in same transaction)
    if (data.role) {
      const { rows: roleRows } = await client.query<{ id: number }>(
        `SELECT id FROM roles WHERE name = $1`,
        [data.role]
      )
      if (!roleRows[0]) {
        throw Object.assign(new Error(`Rol '${data.role}' no existe.`), { statusCode: 400 })
      }
      await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [id])
      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [id, roleRows[0].id]
      )
    }

    await client.query("COMMIT")
    logger.info({ userId: id }, "User updated")

    const user = await getUserById(id)
    return toApiUser(user!)
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function deleteUser(id: string): Promise<void> {
  const { rowCount } = await query(`DELETE FROM users WHERE id = $1`, [id])
  if (!rowCount) throw Object.assign(new Error("Usuario no encontrado."), { statusCode: 404 })
  logger.info({ userId: id }, "User deleted")
}

export async function toggleSearchAny(id: string): Promise<ApiUser> {
  await query(
    `UPDATE users SET can_search_any = NOT can_search_any, updated_at = now() WHERE id = $1`,
    [id]
  )
  const user = await getUserById(id)
  if (!user) throw Object.assign(new Error("Usuario no encontrado."), { statusCode: 404 })
  return toApiUser(user)
}

export async function updateUserEmails(id: string, emails: string[]): Promise<ApiUser> {
  // Replace emails atomically
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const { rows: existing } = await client.query(`SELECT id FROM users WHERE id = $1`, [id])
    if (!existing[0]) throw Object.assign(new Error("Usuario no encontrado."), { statusCode: 404 })

    await client.query(`DELETE FROM emails WHERE user_id = $1`, [id])

    const unique = [...new Set(emails.map((e) => e.toLowerCase()))]
    for (const address of unique) {
      await client.query(
        `INSERT INTO emails (user_id, address) VALUES ($1, $2)`,
        [id, address]
      )
    }

    await client.query("COMMIT")
    logger.info({ userId: id, count: unique.length }, "User emails updated")

    const user = await getUserById(id)
    return toApiUser(user!)
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

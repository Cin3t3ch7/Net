// ─── PostgreSQL Connection Pool ──────────────────────────────────────────────
// Single shared pool for the entire application.
// Never create per-request connections.

import fs from "fs"
import path from "path"
import { Pool, type PoolClient } from "pg"
import { env } from "../config/env"
import { logger } from "./logger"

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // DB_SSL: Set to true only if your provider requires it AND you supply a valid cert.
  // rejectUnauthorized: false is intentionally NOT used — connections to Neon.tech
  // use sslmode=require in the connection string which handles TLS at the driver level.
  ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle PostgreSQL client")
})

// ─── Auto Migration Runner ────────────────────────────────────────────────────
// Executes all .sql files in migrations/ in alphabetical order at startup.
// Safe to run on every boot — all statements use IF NOT EXISTS / ON CONFLICT.

async function runMigrations(client: PoolClient): Promise<void> {
  const migrationsDir = path.resolve(__dirname, "../db/migrations")

  // Gracefully skip if folder doesn't exist
  if (!fs.existsSync(migrationsDir)) {
    logger.warn({ migrationsDir }, "Migrations directory not found — skipping")
    return
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort() // lexicographic order: 001_, 002_, …

  if (files.length === 0) {
    logger.info("No migration files found — skipping")
    return
  }

  logger.info({ count: files.length }, "Running DB migrations…")

  // Named constant — prevents collision with other advisory locks in the DB.
  // This ID is unique to SmarTime migration locking. Do not reuse elsewhere.
  const MIGRATION_ADVISORY_LOCK_ID = 1_357_924_680
  logger.info("Adquiriendo lock de migración (prevención de race conditions)...")
  await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_ADVISORY_LOCK_ID])

  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, "utf8")
      try {
        await client.query(sql)
        logger.info({ file }, "Migration applied")
      } catch (err) {
        logger.error({ file, err }, "Migration failed")
        throw err // crash fast — don't start with broken schema
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_ADVISORY_LOCK_ID])
    logger.info("Lock de migración liberado")
  }

  logger.info("All DB migrations complete")
}

export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query("SELECT 1")
    logger.info("Database connection verified")
    await runMigrations(client)
    logger.info("Database ready")
  } finally {
    client.release()
  }
}

/**
 * Run a query with automatic release.
 */
export async function query<T extends object = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<import("pg").QueryResult<T>> {
  const start = Date.now()
  const result = await pool.query<T>(text, params)
  const duration = Date.now() - start
  logger.debug({ query: text, duration, rows: result.rowCount }, "DB query executed")
  return result
}

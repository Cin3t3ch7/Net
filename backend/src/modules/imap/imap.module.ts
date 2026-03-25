// ─── IMAP Module ──────────────────────────────────────────────────────────────
// Passwords are encrypted with AES-256-GCM before storing in PostgreSQL.
// The raw password is NEVER returned to any API client.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"
import { z } from "zod"
import type { Request, Response } from "express"
import { Router } from "express"
import { query } from "../../db/pool"
import { logger } from "../../db/logger"
import { env } from "../../config/env"
import { authenticate } from "../../middlewares/auth.middleware"
import { requirePermission } from "../../middlewares/permission.middleware"
import { validateBody, validateParams } from "../../middlewares/validate.middleware"
import { asyncHandler } from "../../middlewares/error.middleware"
import type { ApiImapConfig, ImapConfigRow } from "../../types"

// ─── AES-256-GCM Encryption ───────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm"
const KEY = Buffer.from(env.IMAP_ENCRYPTION_KEY, "hex")

function encrypt(plaintext: string): string {
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // Store as: iv:tag:ciphertext (all base64)
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`
}

function decrypt(stored: string): string {
  const [ivB64, tagB64, encB64] = stored.split(":")
  if (!ivB64 || !tagB64 || !encB64) throw new Error("Invalid encrypted format")
  const iv        = Buffer.from(ivB64,  "base64")
  const tag       = Buffer.from(tagB64, "base64")
  const encrypted = Buffer.from(encB64, "base64")
  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8")
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createImapSchema = z.object({
  domain:  z.string().min(1).max(253),
  server:  z.string().min(1).max(253),
  port:    z.coerce.number().int().min(1).max(65535).default(993),
  email:   z.string().email(),
  password: z.string().min(1).max(500),
  useSsl:  z.boolean().default(true),
})

const updateImapSchema = createImapSchema.partial().omit({ password: true }).extend({
  password: z.string().min(1).max(500).optional(),
})

// ─── Repository ───────────────────────────────────────────────────────────────

function toApiConfig(row: ImapConfigRow): ApiImapConfig {
  return {
    id:        row.id,
    domain:    row.domain,
    server:    row.server,
    port:      row.port,
    email:     row.email,
    // password_enc is intentionally omitted here
    useSsl:    row.use_ssl,
    createdAt: row.created_at.toISOString(),
    createdBy: row.created_by,
  }
}

// ─── Controller Handlers ──────────────────────────────────────────────────────

const handleList = asyncHandler(async (_req: Request, res: Response) => {
  // LIMIT prevents unbounded result sets as the config table grows
  const { rows } = await query<ImapConfigRow>(
    `SELECT * FROM imap_configs ORDER BY created_at DESC LIMIT 100`
  )
  res.json(rows.map(toApiConfig))
})

const handleCreate = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof createImapSchema>
  const userId = req.user!.sub

  const { rows: existing } = await query(
    `SELECT id FROM imap_configs WHERE domain = $1 AND email = $2`,
    [data.domain, data.email]
  )
  if (existing.length > 0) {
    res.status(409).json({
      error: `La configuración IMAP para ${data.domain} / ${data.email} ya existe.`,
    })
    return
  }

  const passwordEnc = encrypt(data.password)

  const { rows } = await query<ImapConfigRow>(
    `INSERT INTO imap_configs (domain, server, port, email, password_enc, use_ssl, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.domain, data.server, data.port, data.email, passwordEnc, data.useSsl, userId]
  )

  logger.info({ configId: rows[0].id, domain: data.domain }, "IMAP config created")
  res.status(201).json(toApiConfig(rows[0]))
})

const handleUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const data = req.body as z.infer<typeof updateImapSchema>

  const { rows: existing } = await query<ImapConfigRow>(
    `SELECT * FROM imap_configs WHERE id = $1`,
    [id]
  )
  if (!existing[0]) {
    res.status(404).json({ error: "Configuración no encontrada." })
    return
  }

  const passwordEnc = data.password ? encrypt(data.password) : existing[0].password_enc

  const { rows } = await query<ImapConfigRow>(
    `UPDATE imap_configs SET
       domain       = COALESCE($2, domain),
       server       = COALESCE($3, server),
       port         = COALESCE($4, port),
       email        = COALESCE($5, email),
       password_enc = $6,
       use_ssl      = COALESCE($7, use_ssl),
       updated_at   = now()
     WHERE id = $1 RETURNING *`,
    [id, data.domain ?? null, data.server ?? null, data.port ?? null, data.email ?? null, passwordEnc, data.useSsl ?? null]
  )

  logger.info({ configId: id }, "IMAP config updated")
  res.json(toApiConfig(rows[0]))
})

const handleDelete = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { rowCount } = await query(`DELETE FROM imap_configs WHERE id = $1`, [id])
  if (!rowCount) {
    res.status(404).json({ error: "Configuración no encontrada." })
    return
  }
  logger.info({ configId: id }, "IMAP config deleted")
  res.status(204).send()
})

// ─── Routes ───────────────────────────────────────────────────────────────────

const uuidParam = z.object({ id: z.string().uuid({ message: "ID inválido: debe ser un UUID válido." }) })

const router = Router()
router.use(authenticate)
router.use(requirePermission("imap:manage"))

router.get(   "/",     handleList)
router.post(  "/",     validateBody(createImapSchema), handleCreate)
router.patch( "/:id",  validateParams(uuidParam), validateBody(updateImapSchema), handleUpdate)
router.delete("/:id",  validateParams(uuidParam), handleDelete)

export { router as imapRouter, decrypt as decryptImapPassword }

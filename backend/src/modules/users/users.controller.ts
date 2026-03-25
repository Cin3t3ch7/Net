// ─── Users Schemas & Controller ──────────────────────────────────────────────
import { z } from "zod"
import type { Request, Response } from "express"
import { asyncHandler } from "../../middlewares/error.middleware"
import * as repo from "./users.repository"

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  telegramId:    z.string().min(5).max(20).regex(/^\d+$/),
  displayName:   z.string().min(1).max(100),
  role:          z.enum(["admin", "user"]),
  status:        z.enum(["active", "inactive", "suspended"]),
  allowedEmails: z.array(z.string().email()).optional().default([]),
  canSearchAny:  z.boolean().optional().default(false),
})

export const updateUserSchema = z.object({
  displayName:   z.string().min(1).max(100).optional(),
  role:          z.enum(["admin", "user"]).optional(),
  status:        z.enum(["active", "inactive", "suspended"]).optional(),
  canSearchAny:  z.boolean().optional(),
})

export const updateEmailsSchema = z.object({
  emails: z.array(z.string().email()).max(50),
})

type CreateInput  = z.infer<typeof createUserSchema>
type UpdateInput  = z.infer<typeof updateUserSchema>

// ─── Controller ───────────────────────────────────────────────────────────────

export const handleListUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await repo.listUsers()
  res.json(users)
})

export const handleCreateUser = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as CreateInput
  const user = await repo.createUser(data)
  res.status(201).json(user)
})

export const handleUpdateUser = asyncHandler(async (req: Request, res: Response) => {
  const id   = req.params["id"] as string
  const data = req.body as UpdateInput
  const user = await repo.updateUser(id, data)
  res.json(user)
})

export const handleDeleteUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params["id"] as string
  await repo.deleteUser(id)
  res.status(204).send()
})

export const handleToggleSearchAny = asyncHandler(async (req: Request, res: Response) => {
  const id   = req.params["id"] as string
  const user = await repo.toggleSearchAny(id)
  res.json(user)
})

export const handleUpdateEmails = asyncHandler(async (req: Request, res: Response) => {
  const id     = req.params["id"] as string
  const { emails } = req.body as { emails: string[] }
  const user   = await repo.updateUserEmails(id, emails)
  res.json(user)
})


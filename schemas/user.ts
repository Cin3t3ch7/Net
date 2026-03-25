// ─── Zod Schemas: User ────────────────────────────────────────────────────────
import { z } from "zod"

const userRoleSchema = z.enum(["admin", "user"])
const userStatusSchema = z.enum(["active", "inactive", "suspended"])

/**
 * Schema for creating a new user in the admin panel.
 * Now based on Telegram ID — no username or password.
 */
export const createUserSchema = z.object({
  telegramId: z
    .string()
    .min(5, "El ID de Telegram debe tener al menos 5 dígitos")
    .max(15, "El ID de Telegram no puede tener más de 15 dígitos")
    .regex(/^\d+$/, "Solo puede contener números"),
  displayName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede tener más de 50 caracteres"),
  role: userRoleSchema,
  status: userStatusSchema,
  canSearchAny: z.boolean().default(false),
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>

/**
 * Schema for editing an existing user.
 * telegramId is immutable after creation.
 */
export const updateUserSchema = z.object({
  displayName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede tener más de 50 caracteres"),
  role: userRoleSchema,
  status: userStatusSchema,
  canSearchAny: z.boolean(),
})

export type UpdateUserFormValues = z.infer<typeof updateUserSchema>

/**
 * Schema for updating a user's allowed emails via a bulk text area.
 * We accept a single string containing multiple emails separated by newlines or commas.
 */
export const updateEmailsSchema = z.object({
  emailsText: z.string(),
})

export type UpdateEmailsFormValues = z.infer<typeof updateEmailsSchema>

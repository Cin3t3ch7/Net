// ─── Zod Schemas: Auth ────────────────────────────────────────────────────────
import { z } from "zod"

/**
 * Schema for step 1: entering a Telegram ID.
 * Telegram IDs are numeric strings, typically 9-10 digits.
 */
export const telegramIdSchema = z.object({
  telegramId: z
    .string()
    .min(5, "El ID de Telegram debe tener al menos 5 dígitos")
    .max(15, "El ID de Telegram no puede tener más de 15 dígitos")
    .regex(/^\d+$/, "El ID de Telegram solo puede contener números"),
})

export type TelegramIdFormValues = z.infer<typeof telegramIdSchema>

/**
 * Schema for step 2: entering the 6-digit OTP.
 */
export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "El código OTP debe tener exactamente 6 dígitos")
    .regex(/^\d+$/, "El código OTP solo puede contener números"),
})

export type OtpFormValues = z.infer<typeof otpSchema>

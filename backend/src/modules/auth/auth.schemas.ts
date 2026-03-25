// ─── Auth Module — Zod Schemas ────────────────────────────────────────────────
import { z } from "zod"

export const requestOtpSchema = z.object({
  telegramId: z
    .string()
    .min(5, "Telegram ID debe tener al menos 5 dígitos.")
    .max(20, "Telegram ID muy largo.")
    .regex(/^\d+$/, "Telegram ID debe ser numérico."),
})

export const verifyOtpSchema = z.object({
  telegramId: z
    .string()
    .min(5)
    .max(20)
    .regex(/^\d+$/),
  otp: z
    .string()
    .length(6, "El código OTP debe tener exactamente 6 dígitos.")
    .regex(/^\d{6}$/, "El código OTP debe ser numérico."),
})

export type RequestOtpInput = z.infer<typeof requestOtpSchema>
export type VerifyOtpInput  = z.infer<typeof verifyOtpSchema>

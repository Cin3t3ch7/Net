// ─── Telegram Bot Service ────────────────────────────────────────────────────
// Manages the singleton bot instance.
// All Telegram interaction is SERVER-SIDE ONLY — never exposed to the frontend.

import TelegramBot from "node-telegram-bot-api"
import { env } from "../config/env"
import { logger } from "../db/logger"

let botInstance: TelegramBot | null = null

export function getTelegramBot(): TelegramBot {
  if (!botInstance) {
    botInstance = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: false })
    logger.info("Telegram bot instance initialized")
  }
  return botInstance
}

/**
 * Sends an OTP message to the given Telegram chat ID.
 * The actual OTP code is only passed here — never stored in plain text.
 */
export async function sendOtpMessage(telegramId: string, otp: string): Promise<void> {
  const bot = getTelegramBot()

  const message = [
    `🔐 *SmarTime — Código de Acceso*`,
    ``,
    `Tu código OTP es:`,
    ``,
    `\`${otp}\``,
    ``,
    `⏱ Válido por *${env.OTP_EXPIRY_SECONDS} segundos*.`,
    `⚠️ No compartas este código con nadie.`,
    ``,
    `Si no solicitaste este código, ignora este mensaje.`,
  ].join("\n")

  try {
    await bot.sendMessage(telegramId, message, { parse_mode: "Markdown" })
    logger.info({ telegramId }, "OTP message sent via Telegram")
  } catch (err) {
    // Log without the OTP value
    logger.error({ telegramId, err }, "Failed to send OTP via Telegram")
    throw new Error("No se pudo enviar el código por Telegram. Verifica que el Telegram ID sea correcto y que hayas iniciado el bot.")
  }
}

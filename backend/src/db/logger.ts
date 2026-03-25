// ─── Structured Logger (Pino) ────────────────────────────────────────────────
// Uses JSON in production, pretty-printed in development.
// NEVER logs secrets, passwords, tokens, or OTP codes.

import pino from "pino"
import { env } from "../config/env"

export const logger = pino({
  level: env.isDevelopment ? "debug" : "info",
  ...(env.isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
      }
    : {}),
  redact: {
    paths: [
      "password",
      "otp",
      "token",
      "refreshToken",
      "accessToken",
      "cookie",
      "authorization",
      "*.password",
      "*.otp",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
})

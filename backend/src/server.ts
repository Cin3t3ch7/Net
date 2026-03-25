// ─── Server Entry Point ───────────────────────────────────────────────────────
// Starts the Express server after verifying the database connection.

import { env } from "./config/env"
import { checkDatabaseConnection } from "./db/pool"
import { logger } from "./db/logger"
import { app } from "./app"
import { cleanupExpiredOtps } from "./services/otp.service"
import { imapPool } from "./services/imap-search.service"

const GRACEFUL_SHUTDOWN_TIMEOUT = 10_000

async function start(): Promise<void> {
  // Validate DB connection before accepting traffic
  await checkDatabaseConnection()

  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, frontend: env.FRONTEND_URL },
      "SmarTime backend started"
    )
  })

  // ─── OTP cleanup job ───────────────────────────────────────────────────────
  // cleanupExpiredOtps() was defined but never invoked. Run every hour to
  // prevent the otp_codes table from growing indefinitely.
  const OTP_CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // 1 hour
  setInterval(async () => {
    try {
      const deleted = await cleanupExpiredOtps()
      if (deleted > 0) {
        logger.info({ deleted }, "OTP cleanup: removed expired/used codes")
      }
    } catch (err) {
      logger.error({ err }, "OTP cleanup job failed")
    }
  }, OTP_CLEANUP_INTERVAL_MS)

  // ─── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully...")
    server.close(async () => {
      logger.info("HTTP server closed")
      // Close all pooled IMAP connections before exiting
      await imapPool.closeAll().catch((err) =>
        logger.error({ err }, "Error closing IMAP pool during shutdown")
      )
      logger.info("IMAP pool closed")
      process.exit(0)
    })

    // Force exit after timeout
    setTimeout(() => {
      logger.error("Forced shutdown after timeout")
      process.exit(1)
    }, GRACEFUL_SHUTDOWN_TIMEOUT)
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT", () => shutdown("SIGINT"))

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled promise rejection")
  })

  process.on("uncaughtException", (err) => {
    logger.error({ err }, "Uncaught exception — shutting down")
    process.exit(1)
  })
}

start().catch((err) => {
  logger.error({ err }, "Failed to start server")
  process.exit(1)
})

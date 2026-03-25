// ─── Global Error Handler ────────────────────────────────────────────────────
// Catches all errors thrown in route handlers.
// NEVER exposes stack traces or internal details in production.

import type { Request, Response, NextFunction } from "express"
import { logger } from "../db/logger"

export interface AppError extends Error {
  statusCode?: number
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500

  // Always log internally (with stack in development)
  logger.error(
    {
      err: {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      method: req.method,
      url: req.url,
      status: statusCode,
    },
    "Request error"
  )

  // Never expose internal error details to the client in production
  const message =
    statusCode < 500
      ? err.message
      : process.env.NODE_ENV === "development"
        ? err.message
        : "Error interno del servidor."

  res.status(statusCode).json({ error: message })
}

/**
 * Catches async errors and forwards them to the error handler.
 * Usage: router.get('/...', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next)
  }
}

/**
 * 404 handler — place AFTER all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` })
}

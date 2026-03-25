// ─── Input Validation Middleware ─────────────────────────────────────────────
// Uses Zod schemas to validate request body, params, and query.
// Returns a structured 422 error on failure.

import type { Request, Response, NextFunction } from "express"
import { ZodSchema, ZodError } from "zod"

/**
 * Validate req.body against a Zod schema.
 * On failure: 422 with array of issues.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(422).json({
        error: "Datos de entrada inválidos.",
        issues: formatZodError(result.error),
      })
      return
    }
    req.body = result.data
    next()
  }
}

/**
 * Validate req.params against a Zod schema.
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      res.status(422).json({
        error: "Parámetros inválidos.",
        issues: formatZodError(result.error),
      })
      return
    }
    next()
  }
}

/**
 * Validate req.query against a Zod schema.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      res.status(422).json({
        error: "Parámetros de consulta inválidos.",
        issues: formatZodError(result.error),
      })
      return
    }
    next()
  }
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }))
}

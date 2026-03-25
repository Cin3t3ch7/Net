// ─── Auth Middleware ─────────────────────────────────────────────────────────
// Validates the JWT Bearer token on every protected route.
// Populates req.user with the decoded payload.

import type { Request, Response, NextFunction } from "express"
import { verifyAccessToken } from "../services/token.service"
import { logger } from "../db/logger"
import { query } from "../db/pool"

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de acceso requerido." })
    return
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyAccessToken(token)
    
    // Verificación stateful: protege contra tokens vivos de usuarios suspendidos/eliminados
    const { rows } = await query(`SELECT status FROM users WHERE id = $1`, [payload.sub])
    if (!rows.length || rows[0].status !== "active") {
      logger.warn({ userId: payload.sub }, "Intento de acceso con token válido pero cuenta inactiva")
      res.status(401).json({ error: "Cuenta inactiva o suspendida." })
      return
    }

    req.user = payload
    next()
  } catch (err) {
    logger.warn({ err }, "Invalid access token")
    res.status(401).json({ error: "Token inválido o expirado." })
  }
}

/**
 * Optional authentication — populates req.user if token is present and valid,
 * but does not reject the request if missing.
 */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(authHeader.slice(7))
      const { rows } = await query(`SELECT status FROM users WHERE id = $1`, [payload.sub])
      if (rows.length && rows[0].status === "active") {
         req.user = payload
      }
    } catch {
      // Silently ignore invalid token for optional auth
    }
  }
  next()
}

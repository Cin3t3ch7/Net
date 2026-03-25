// ─── Permission Middleware ───────────────────────────────────────────────────
// Role-based and permission-based access control.
// Must be used AFTER authenticate middleware.

import type { Request, Response, NextFunction } from "express"

/**
 * Require one or more roles (user must have AT LEAST ONE).
 * Usage: router.get('/...', authenticate, requireRole('admin'), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: "No autenticado." })
      return
    }

    const hasRole = roles.some((role) => user.roles.includes(role))
    if (!hasRole) {
      res.status(403).json({
        error: "Acceso denegado. Rol insuficiente.",
        required: roles,
      })
      return
    }

    next()
  }
}

/**
 * Require a specific permission string (e.g., 'users:write').
 * Usage: router.post('/...', authenticate, requirePermission('users:write'), handler)
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: "No autenticado." })
      return
    }

    if (!user.permissions.includes(permission)) {
      res.status(403).json({
        error: "Acceso denegado. Permiso insuficiente.",
        required: permission,
      })
      return
    }

    next()
  }
}

/**
 * Require ALL listed permissions.
 */
export function requireAllPermissions(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user
    if (!user) {
      res.status(401).json({ error: "No autenticado." })
      return
    }

    const missing = permissions.filter((p) => !user.permissions.includes(p))
    if (missing.length > 0) {
      res.status(403).json({
        error: "Acceso denegado. Permisos insuficientes.",
        missing,
      })
      return
    }

    next()
  }
}

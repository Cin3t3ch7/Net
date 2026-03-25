import type { Request, Response, NextFunction } from "express";
import { query } from "../db/pool";
import { logger } from "../db/logger";

/**
 * Middleware para validar si el usuario autenticado tiene permisos
 * para buscar correos de la dirección objetivo.
 * No revela si el correo existe en el sistema o no.
 */
export async function requireEmailSearchPermission(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user || !user.sub) {
      res.status(401).json({ success: false, error: "No autenticado." });
      return;
    }

    const targetEmail = req.body.email || req.query.email;
    if (!targetEmail || typeof targetEmail !== "string") {
      res.status(400).json({ success: false, error: "Email objetivo requerido." });
      return;
    }

    const normalizedEmail = targetEmail.trim().toLowerCase();

    // 1. Verificar si el usuario es super admin (can_search_any) leyendo el JWT (sin I/O de DB)
    if (user.canSearchAny === true) {
      next();
      return;
    }

    // 2. Si no es admin, verificar propiedad explícita en la tabla emails
    const { rows: emailRows } = await query(
      `SELECT id FROM emails WHERE user_id = $1 AND address = $2 AND status = 'active' LIMIT 1`,
      [user.sub, normalizedEmail]
    );

    if (emailRows.length === 0) {
      // Error genérico. No revelamos si el correo existe para otro usuario.
      logger.warn({ userId: user.sub, targetEmail: normalizedEmail }, "Búsqueda denegada por falta de permisos o email inexistente.");
      res.status(403).json({ success: false, error: "No tienes permisos o no se encontraron resultados." });
      return;
    }

    // Permiso concedido
    next();
  } catch (error) {
    logger.error({ err: error }, "Error en middleware de autorización de correos");
    res.status(500).json({ success: false, error: "Error interno verificando permisos." });
  }
}

import { z } from "zod";
import type { Request, Response } from "express";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { logger } from "../../db/logger";
import { env } from "../../config/env";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireEmailSearchPermission } from "../../middlewares/search-auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../middlewares/error.middleware";
import { resolveImapConfig } from "../../services/domain-resolution.service";
import { searchInImap } from "../../services/imap-search.service";
import { SearchType } from "../../services/extraction.service";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const searchRequestSchema = z.object({
  email: z.string().email({ message: "El formato de email no es válido." }),
  searchType: z.nativeEnum(SearchType, {
    errorMap: () => ({ message: "Tipo de búsqueda no soportado." })
  }),
});

// ─── Rate Limiter (Search-specific) ──────────────────────────────────────────
// /api/search is expensive: IMAP connection + email fetch + simpleParser + 2 DB queries.
// The general limiter (100/min) is too permissive.
// This limiter enforces RATE_LIMIT_SEARCH_MAX per window (default 15/min) keyed by IP.
// The OTP/auth mechanism already ensures the user is authenticated, providing
// a secondary layer of accountability.

const searchLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_SEARCH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Prefer user ID from the JWT (set by authenticate middleware) for more precise limiting.
    // Falls back to IP if the middleware hasn't run yet (defensive).
    return (req as Request & { user?: { sub: string } }).user?.sub ?? req.ip ?? "unknown"
  },
  message: {
    success: false,
    error: "Demasiadas búsquedas. Intenta de nuevo en un momento.",
  },
  skip: (_req, res) => {
    // Don't consume limit slots for requests that will be rejected by auth middleware
    return res.statusCode === 401 || res.statusCode === 403
  },
});

// ─── Controller Handlers ──────────────────────────────────────────────────────

const handleSearch = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof searchRequestSchema>;

  logger.info({ email: data.email, searchType: data.searchType, userId: (req as any).user?.sub }, "Iniciando búsqueda IMAP solicitada");

  try {
    // 1. Resolver la configuración o fallback (lanza Error si falta config o falla fallback)
    const resolvedConfig = await resolveImapConfig(data.email);

    // 2. Conectar al IMAP via imapflow, parsear con mailparser y aplicar Extracción de Regex.
    const extractionResult = await searchInImap(resolvedConfig, data.searchType);

    // 3. Evaluar respuesta del motor
    if (extractionResult.found && extractionResult.value) {
      res.json({
        success: true,
        result: extractionResult.value,
        searchType: data.searchType,
      });
      return;
    }

    // Respuesta si terminó bien pero no se hallaron resultados en correos recientes
    logger.info({ email: data.email, searchType: data.searchType }, "Búsqueda finalizada sin resultados encontrados");
    res.json({
      success: false,
      error: "No se encontró el código solicitado en los correos recientes.",
    });

  } catch (err: any) {
    logger.warn({ err: err.message, email: data.email }, "Búsqueda abortada por error interno de resolución o conexión IMAP");
    // Strict contract: never reveal internal details
    res.status(500).json({
      success: false,
      error: "Error interno procesando la solicitud. Intente más tarde.",
    });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────

const router = Router();

// authenticate runs first so req.user is available for the rate limiter keyGenerator.
// Order: authenticate → searchLimiter → validateBody → requireEmailSearchPermission → handler
router.post(
  "/",
  authenticate,
  searchLimiter,
  validateBody(searchRequestSchema),
  requireEmailSearchPermission,
  handleSearch
);

export { router as searchRouter };

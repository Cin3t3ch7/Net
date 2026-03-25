// ─── Auth Routes ─────────────────────────────────────────────────────────────
import { Router } from "express"
import rateLimit from "express-rate-limit"
import { env } from "../../config/env"
import { authenticate } from "../../middlewares/auth.middleware"
import { validateBody } from "../../middlewares/validate.middleware"
import { requestOtpSchema, verifyOtpSchema } from "./auth.schemas"
import {
  handleRequestOtp,
  handleVerifyOtp,
  handleRefresh,
  handleLogout,
  handleGetMe,
} from "./auth.controller"

const router = Router()

// Strict rate limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Espera un momento e intenta de nuevo." },
  keyGenerator: (req) => req.ip ?? "unknown",
})

router.post("/otp/request", authLimiter, validateBody(requestOtpSchema), handleRequestOtp)
router.post("/otp/verify",  authLimiter, validateBody(verifyOtpSchema),  handleVerifyOtp)
router.post("/refresh",     authLimiter, handleRefresh)
router.post("/logout",      authenticate, handleLogout)
router.get("/me",           authenticate, handleGetMe)

export default router

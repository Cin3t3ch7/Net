// ─── Express Application ─────────────────────────────────────────────────────
// All middleware configuration in one place.
// No business logic here — only HTTP plumbing.

import express from "express"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit"

import { env } from "./config/env"
import { logger } from "./db/logger"

import authRouter from "./modules/auth/auth.routes"
import usersRouter from "./modules/users/users.routes"
import { imapRouter } from "./modules/imap/imap.module"
import { searchRouter } from "./modules/search/search.module"
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware"

const app = express()

// ─── Trust proxy (for correct IP behind reverse proxy in prod) ────────────────
if (env.isProduction) {
  app.set("trust proxy", 1)
}

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: env.isProduction,
    crossOriginEmbedderPolicy: env.isProduction,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
)

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins: string[] = [env.FRONTEND_URL.trim()]

// Allow localhost only in development — prevents local servers hitting the production API
if (env.isDevelopment) {
  allowedOrigins.push("http://localhost:3000", "http://127.0.0.1:3000")
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        logger.warn({ origin }, "[CORS] Request from disallowed origin rejected")
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,                  // Required for cookie exchange
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true, limit: "1mb" }))
app.use(cookieParser(env.COOKIE_SECRET))

// ─── General Rate Limit ───────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_GENERAL_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiadas solicitudes. Intenta más tarde." },
  })
)

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip }, "Incoming request")
  next()
})

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",  authRouter)
app.use("/api/users", usersRouter)
app.use("/api/imap",  imapRouter)
app.use("/api/search", searchRouter)

// ─── 404 & Error Handlers (must be last) ─────────────────────────────────────
app.use(notFoundHandler)
app.use(errorHandler)

export { app }

// ─── Next.js 16 Proxy (Middleware) ───────────────────────────────────────────
// In Next.js 16+ the middleware file convention was renamed from "middleware.ts"
// to "proxy.ts". This is the active routing middleware.
//
// Strategy:
//   - Production (same-domain via reverse proxy):
//     The refresh token cookie (smartime_rt) is readable here. Presence check
//     gates protected routes at the server level.
//   - Development (different ports: 3000 vs 4000):
//     The backend's httpOnly cookies are NOT readable here (different host/port).
//     Client-side guards (AuthGuard / AdminGuard) take over in this case.
//
// JWT Validation:
//   Validates the smartime_uid cookie using UID_COOKIE_SECRET (separate from
//   JWT_SECRET used for access tokens). Checks issuer, audience, and purpose
//   claims to prevent cross-token abuse.
//
// SECURITY: There is NO fallback secret. If UID_COOKIE_SECRET is not set,
// the middleware throws at module evaluation time, preventing the app from
// serving protected routes in an insecure state.

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

// Fail-fast: The Edge runtime must have UID_COOKIE_SECRET available.
// Expose it via next.config.mjs → env: { UID_COOKIE_SECRET: process.env.UID_COOKIE_SECRET }
// or via Vercel / hosting environment variables.
const UID_COOKIE_SECRET_RAW = process.env.UID_COOKIE_SECRET
if (!UID_COOKIE_SECRET_RAW) {
  throw new Error(
    "[proxy] UID_COOKIE_SECRET is not set in the Edge runtime environment. " +
    "Add it to next.config.mjs under `env` or your hosting provider's env vars."
  )
}
const UID_SECRET = new TextEncoder().encode(UID_COOKIE_SECRET_RAW)

const PROTECTED_ROUTES = ["/admin", "/dashboard"]

// Cookie names set by the backend on login/refresh
const REFRESH_COOKIE = process.env.REFRESH_TOKEN_COOKIE_NAME ?? "smartime_rt"
const UID_COOKIE = "smartime_uid"

// Claims the uid token must have — must match token.service.ts constants
const UID_TOKEN_ISSUER   = "smartime"
const UID_TOKEN_AUDIENCE = "smartime-uid"
const UID_TOKEN_PURPOSE  = "uid-session"

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  // Cookie is only present when frontend & backend share the same domain
  // (production with a reverse proxy). Both cookies must be present.
  const hasRefreshToken = req.cookies.has(REFRESH_COOKIE)
  const uidToken = req.cookies.get(UID_COOKIE)?.value

  if (!hasRefreshToken || !uidToken) {
    return redirectToLogin(req, pathname)
  }

  // Verify cryptographic signature + issuer + audience of the uid cookie JWT.
  // The purpose claim is also validated to prevent an access token from being
  // used as a uid cookie (they now use DIFFERENT secrets, making this doubly safe).
  try {
    const { payload } = await jwtVerify(uidToken, UID_SECRET, {
      issuer:   UID_TOKEN_ISSUER,
      audience: UID_TOKEN_AUDIENCE,
    })

    // Explicit purpose check — defense-in-depth even with separate secrets
    if (payload["purpose"] !== UID_TOKEN_PURPOSE) {
      throw new Error("Token purpose mismatch")
    }
  } catch {
    // Invalid signature, wrong claims, expired, or wrong purpose
    return redirectToLogin(req, pathname)
  }

  return NextResponse.next()
}

function redirectToLogin(req: NextRequest, pathname: string): NextResponse {
  const loginUrl = new URL("/", req.url)
  loginUrl.searchParams.set("redirect", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|public/).*)",
  ],
}

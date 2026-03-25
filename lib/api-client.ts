// ─── API Client — shared fetch wrapper ──────────────────────────────────────
// All requests to the backend go through here.
// - Attaches Authorization header automatically
// - Handles 401 refresh flow transparently
// - Throws structured errors the services can catch
//
// SSR Safety:
//   _accessToken is a module-level variable. In Node.js (SSR), modules are
//   cached per process — shared across requests. Token state is ONLY read/written
//   on the client side (typeof window !== "undefined"). SSR requests always
//   treat the access token as null and rely on httpOnly cookies via `credentials: "include"`.
//
// Client-side deduplication:
//   A single _refreshPromise ensures concurrent 401s only trigger one refresh call.

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000"

// ─── Access token state ───────────────────────────────────────────────────────
// Module-level but intentionally write-protected in SSR via the guards below.
// Only meaningful in the browser; SSR always sees null.

let _accessToken: string | null = null

/** Sets the in-memory access token. No-op in SSR to prevent cross-request contamination. */
export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return // SSR guard
  _accessToken = token
}

/** Reads the current access token. Returns null in SSR. */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return _accessToken
}

/** Clears the access token. Equivalent to setAccessToken(null) but explicit. */
export function clearAccessToken(): void {
  if (typeof window === "undefined") return
  _accessToken = null
}

// ─── Error type ───────────────────────────────────────────────────────────────

export interface ApiError extends Error {
  statusCode: number
}

function mkError(message: string, statusCode: number): ApiError {
  const err = new Error(message) as ApiError
  err.statusCode = statusCode
  return err
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

export async function apiRequest<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  }

  // Only attach Authorization header client-side (SSR returns null)
  const token = getAccessToken()
  if (!skipAuth && token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include", // Sends httpOnly refresh token cookie automatically
  })

  // Handle 401 → attempt one silent refresh (client-side only)
  if (res.status === 401 && !skipAuth && !path.includes("/auth/refresh")) {
    const refreshed = await silentRefresh()
    if (refreshed) {
      // Retry original request with new token
      return apiRequest<T>(path, options)
    }
    // Refresh failed — let the caller handle
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json() as { error?: string }
      message = body.error ?? message
    } catch { /* ignore parse error */ }
    throw mkError(message, res.status)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

// ─── Silent token refresh ─────────────────────────────────────────────────────
// Deduplicates concurrent 401 refresh attempts in the browser.
// Multiple in-flight requests hitting 401 at the same time all share one Promise.

let _refreshPromise: Promise<boolean> | null = null

async function silentRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    try {
      const data = await apiRequest<{ accessToken: string }>("/api/auth/refresh", {
        method: "POST",
        skipAuth: true,
      })
      setAccessToken(data.accessToken)
      return true
    } catch {
      clearAccessToken()
      return false
    } finally {
      _refreshPromise = null
    }
  })()

  return _refreshPromise
}

"use client"
// ─── useSession Hook ──────────────────────────────────────────────────────────
// On mount: validates the session against the backend (GET /api/auth/me).
// Falls back to local sessionStorage for immediate UI rendering.
// isAdmin is derived from the server-issued role — not from a hardcoded ID.
//
// Optimisation: if the user JUST logged in (session in storage + access token in
// memory), we trust the local session immediately and skip the validateSession()
// round-trip. This prevents the auth guards from redirecting back to "/" while
// the server call is in-flight.

import { useState, useEffect } from "react"
import type { Session } from "@/types/auth"
import { getSession } from "@/lib/session"
import { getAccessToken } from "@/lib/api-client"
import { validateSession } from "@/services/auth.service"

export interface UseSessionReturn {
  session: Session | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
}

export function useSession(): UseSessionReturn {
  // Initialize from local storage for instant render
  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window === "undefined") return null
    return getSession()
  })

  // If we already have a local session AND an in-memory access token (fresh login),
  // we can trust it immediately — no need to ask the server.
  const hasLocalSession = session !== null
  const hasMemoryToken  = typeof window !== "undefined" && getAccessToken() !== null

  const [isLoading, setIsLoading] = useState(!hasLocalSession || !hasMemoryToken)

  useEffect(() => {
    // Already trusted locally — nothing to do
    if (hasLocalSession && hasMemoryToken) return

    // Confirm session validity with backend on mount (hard refresh or first load)
    validateSession()
      .then((s) => setSession(s))
      .catch(() => setSession(null))
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isAuthenticated = session !== null
  // Role is set by the server — trust the JWT payload, not a hardcoded ID
  const isAdmin = session?.role === "admin"

  return { session, isAuthenticated, isAdmin, isLoading }
}

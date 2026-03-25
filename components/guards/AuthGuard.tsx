"use client"
// ─── AuthGuard Component ──────────────────────────────────────────────────────
// Wraps authenticated-only pages. Redirects to / if no valid session exists.
// Usage: wrap your page content with <AuthGuard>...</AuthGuard>

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/hooks/useSession"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-neon-green/30 border-t-neon-green rounded-full animate-spin" />
          <p className="text-neon-green font-mono text-sm animate-pulse">
            Verificando sesión...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return <>{children}</>
}

"use client"
// ─── AdminGuard Component ─────────────────────────────────────────────────────
// Wraps admin-only pages. Redirects to /dashboard if session exists but user
// is not admin. Redirects to / if no session at all.

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/hooks/useSession"

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, isAdmin, isLoading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/")
      } else if (!isAdmin) {
        router.replace("/dashboard")
      }
    }
  }, [isAuthenticated, isAdmin, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-neon-green/30 border-t-neon-green rounded-full animate-spin" />
          <p className="text-neon-green font-mono text-sm animate-pulse">
            Verificando acceso de administrador...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) return null

  return <>{children}</>
}

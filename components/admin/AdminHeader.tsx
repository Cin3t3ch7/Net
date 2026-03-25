"use client"
// ─── AdminHeader ──────────────────────────────────────────────────────────────

import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SmartiмeLogo } from "@/components/smartime-logo"
import { LogoutButton } from "@/components/auth/LogoutButton"
import type { Session } from "@/types/auth"

interface AdminHeaderProps {
  session: Session | null
}

export function AdminHeader({ session }: AdminHeaderProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-50 bg-cyber-darker/95 backdrop-blur-sm border-b border-cyber-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SmartiмeLogo size="sm" />
          <div className="hidden md:block">
            <h1 className="text-foreground font-mono font-bold">Panel de Administración</h1>
            {session && (
              <p className="text-xs text-cyber-muted font-mono">
                Telegram ID:{" "}
                <span className="text-neon-green">{session.telegramId}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-cyber-muted font-mono">
            <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" />
            ADMIN_CONNECTED
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="border-neon-green/50 text-neon-green hover:bg-neon-green/10 font-mono"
          >
            <Search className="w-4 h-4 mr-2" />
            Buscador
          </Button>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}

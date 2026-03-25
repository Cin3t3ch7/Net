"use client"
// ─── LogoutButton ─────────────────────────────────────────────────────────────
// Reusable logout button. Calls the auth service and redirects to /.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logout } from "@/services/auth.service"

interface LogoutButtonProps {
  variant?: "outline" | "ghost"
  size?: "sm" | "default"
  className?: string
  label?: string
}

export function LogoutButton({
  variant = "outline",
  size = "sm",
  className = "",
  label = "Cerrar Sesión",
}: LogoutButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await logout()
      router.replace("/")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoading}
      className={`border-cyber-border text-cyber-light hover:text-destructive hover:border-destructive font-mono transition-colors ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4 mr-2" />
      )}
      {isLoading ? "Saliendo..." : label}
    </Button>
  )
}

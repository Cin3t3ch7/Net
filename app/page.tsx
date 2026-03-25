"use client"
// ─── Login Page ───────────────────────────────────────────────────────────────
// Entry point of the application.
// Shows the Telegram ID + OTP login flow, redirects to /admin or /dashboard.

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Terminal } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartiмeLogo } from "@/components/smartime-logo"
import { LoginForm } from "@/components/auth/LoginForm"
import { getSession } from "@/lib/session"
import { APP_VERSION } from "@/lib/constants"

// ─── Inner component (needs useSearchParams, must be inside Suspense) ─────────
function LoginPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // If already logged in, redirect away
  useEffect(() => {
    const session = getSession()
    if (session) {
      const redirectParam = searchParams.get("redirect")
      const defaultDest   = session.role === "admin" ? "/admin" : "/dashboard"
      router.replace(redirectParam ?? defaultDest)
    }
  }, [router, searchParams])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'var(--cyber-black)' }}>
      {/* Background */}
      <div className="bg-scene" />
      <div className="fixed inset-0 grid-pattern opacity-20" />
      <div className="fixed inset-0 scanlines pointer-events-none" />
      <div className="absolute w-96 h-96 bg-neon-green/15 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-4 -translate-y-12 sm:-translate-y-16">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <SmartiмeLogo size="lg" />
        </div>

        <Card className="bg-cyber-card/90 backdrop-blur-sm border-cyber-border">
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center gap-2 text-sm text-cyber-light mb-2 font-mono">
              <Terminal className="w-4 h-4" />
              <span className="text-neon-green">&gt;</span>
              <span>auth.telegram.init()</span>
            </div>
            <CardTitle className="text-xl font-mono text-foreground">
              Acceso al Sistema
            </CardTitle>
            <CardDescription className="text-cyber-light font-mono text-sm leading-relaxed mt-2 text-balance">
              Ingresa tu ID de Telegram. Recibirás un código OTP de 6 dígitos a través del bot de la plataforma.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-xs text-cyber-light font-mono text-center mt-6">
          <span className="text-neon-green">&gt;</span> Smartime {APP_VERSION} | Telegram Auth
          <span className="cursor-blink ml-1" />
        </p>
      </div>
    </div>
  )
}

// ─── Page export — wrapped in Suspense for useSearchParams ───────────────────
export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}

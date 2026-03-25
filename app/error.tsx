"use client"
// ─── Global Error Boundary ────────────────────────────────────────────────────
// Next.js App Router error boundary — catches runtime errors in the component
// tree below. Provides a controlled UI instead of a blank/broken page.
// https://nextjs.org/docs/app/building-your-application/routing/error-handling

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error("[ErrorBoundary]", error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--cyber-black)" }}
    >
      <div className="relative z-10 text-center space-y-6 p-8 max-w-md mx-auto">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-sm bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-lg font-mono font-bold text-foreground">
            <span className="text-red-400">&gt;</span> Error inesperado
          </h2>
          <p className="text-sm text-cyber-light font-mono leading-relaxed">
            Ocurrió un error al renderizar esta página.
            {error.digest && (
              <span className="block mt-1 text-xs text-cyber-muted">
                Ref: {error.digest}
              </span>
            )}
          </p>
        </div>

        {/* Action */}
        <Button
          onClick={reset}
          className="bg-neon-green hover:bg-neon-green-dim text-white font-mono gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </Button>
      </div>
    </div>
  )
}

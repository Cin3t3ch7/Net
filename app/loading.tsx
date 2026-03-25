"use client"

import { Terminal } from "lucide-react"

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-cyber-black flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-sm text-cyber-muted font-mono">
          <Terminal className="w-4 h-4 text-neon-green animate-pulse" />
          <span className="text-neon-green">&gt;</span>
          <span>loading</span>
          <span className="inline-flex">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
          </span>
        </div>
      </div>
    </div>
  )
}

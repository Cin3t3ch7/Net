"use client"
// ─── LoginForm Component ──────────────────────────────────────────────────────
// Orchestrates the 2-step Telegram OTP login flow.
// Manages flow state independently from UI components.
// Respects ?redirect= query parameter after successful login.

import { useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { OtpFlowStep } from "@/types/auth"
import { requestOtp, verifyOtp } from "@/services/auth.service"
import { TelegramIdStep } from "./TelegramIdStep"
import { OtpStep } from "./OtpStep"

type FlowState = {
  step: OtpFlowStep
  telegramId: string
  errorMessage: string | null
}

export function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [flow, setFlow] = useState<FlowState>({
    step: "idle",
    telegramId: "",
    errorMessage: null,
  })

  const handleRequestOtp = useCallback(async (telegramId: string) => {
    setFlow({ step: "sending", telegramId, errorMessage: null })
    try {
      const result = await requestOtp(telegramId)
      if (result.success) {
        setFlow({ step: "sent", telegramId, errorMessage: null })
      } else {
        setFlow({ step: "error", telegramId, errorMessage: result.message })
      }
    } catch {
      setFlow({
        step: "error",
        telegramId,
        errorMessage: "Error al enviar el código. Intenta de nuevo.",
      })
    }
  }, [])

  const handleVerifyOtp = useCallback(
    async (otp: string) => {
      setFlow((prev) => ({ ...prev, step: "verifying", errorMessage: null }))
      try {
        const result = await verifyOtp(flow.telegramId, otp)
        if (result.success && result.session) {
          setFlow((prev) => ({ ...prev, step: "success" }))

          // Honour ?redirect= param or fall back to role-based default
          const redirectParam = searchParams.get("redirect")
          const defaultDest   = result.session.role === "admin" ? "/admin" : "/dashboard"
          const dest          = redirectParam ?? defaultDest

          // Use router.push so the back-button still works if needed
          router.push(dest)
        } else {
          setFlow((prev) => ({
            ...prev,
            step: "sent", // Go back to OTP entry state, not error
            errorMessage: result.message ?? "Código incorrecto.",
          }))
        }
      } catch {
        setFlow((prev) => ({
          ...prev,
          step: "sent",
          errorMessage: "Error al verificar el código. Intenta de nuevo.",
        }))
      }
    },
    [flow.telegramId, router, searchParams]
  )

  const handleResend = useCallback(async () => {
    await handleRequestOtp(flow.telegramId)
  }, [flow.telegramId, handleRequestOtp])

  const handleBack = useCallback(() => {
    setFlow({ step: "idle", telegramId: "", errorMessage: null })
  }, [])

  const isSendingOrVerifying = flow.step === "sending" || flow.step === "verifying"
  void isSendingOrVerifying // used in child props below

  // Step 1: Telegram ID
  if (flow.step === "idle" || flow.step === "sending" || (flow.step === "error" && !flow.telegramId)) {
    return (
      <TelegramIdStep
        onSubmit={handleRequestOtp}
        isLoading={flow.step === "sending"}
        errorMessage={flow.step === "error" ? flow.errorMessage : null}
      />
    )
  }

  // Step 2: OTP
  return (
    <OtpStep
      telegramId={flow.telegramId}
      onSubmit={handleVerifyOtp}
      onResend={handleResend}
      onBack={handleBack}
      isLoading={flow.step === "verifying"}
      errorMessage={flow.errorMessage}
    />
  )
}

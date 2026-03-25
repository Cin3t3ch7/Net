"use client"
// ─── OtpStep Component ────────────────────────────────────────────────────────
// Step 2 of the login flow: user enters the 6-digit OTP received on Telegram.

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShieldCheck, Loader2, Clock, RefreshCw, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { useOtpTimer } from "@/hooks/useOtpTimer"
import { otpSchema, type OtpFormValues } from "@/schemas/auth"

interface OtpStepProps {
  telegramId: string
  onSubmit: (otp: string) => Promise<void>
  onResend: () => Promise<void>
  onBack: () => void
  isLoading: boolean
  errorMessage: string | null
}

export function OtpStep({ telegramId, onSubmit, onResend, onBack, isLoading, errorMessage }: OtpStepProps) {
  const { secondsLeft, restart, formattedTime } = useOtpTimer(true)
  const [otpValue, setOtpValue] = useState("")
  const [isResending, setIsResending] = useState(false)

  const {
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  })

  // Sync OTP input with react-hook-form
  useEffect(() => {
    setValue("otp", otpValue, { shouldValidate: otpValue.length === 6 })
  }, [otpValue, setValue])

  const handleFormSubmit = async (values: OtpFormValues) => {
    await onSubmit(values.otp)
  }

  const handleResend = async () => {
    setIsResending(true)
    setOtpValue("")
    reset()
    await onResend()
    restart()
    setIsResending(false)
  }

  const isTimerExpired = secondsLeft === 0

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Info header */}
      <div className="space-y-1.5">
        <p className="text-xs text-cyber-light font-mono">Código enviado al ID de Telegram:</p>
        <div className="flex items-center gap-2 bg-cyber-darker px-3 py-2 rounded-sm border border-cyber-border">
          <span className="text-neon-green font-mono font-bold text-sm tracking-widest">{telegramId}</span>
        </div>
        <p className="text-[10px] text-cyber-muted font-mono">
          Abre Telegram y copia el código de 6 dígitos que enviaste el bot.
        </p>
      </div>

      {/* OTP Input */}
      <div className="space-y-3">
        <label className="text-cyber-light font-mono text-xs flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 text-neon-green" />
          Código OTP
        </label>

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otpValue}
            onChange={setOtpValue}
            disabled={isLoading || isTimerExpired}
            containerClassName="gap-2"
          >
            <InputOTPGroup className="gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className={`w-11 h-13 text-lg font-bold font-mono bg-cyber-darker border-2 rounded-sm transition-all
                    data-[active=true]:border-neon-green data-[active=true]:shadow-[0_0_12px_rgba(0,255,136,0.4)]
                    border-cyber-border text-foreground`}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {errors.otp && (
          <p className="text-destructive text-[11px] font-mono text-center">
            [ERR] {errors.otp.message}
          </p>
        )}
      </div>

      {/* Timer */}
      <div className="flex items-center justify-between px-1">
        <div className={`flex items-center gap-2 text-xs font-mono ${isTimerExpired ? "text-destructive" : "text-cyber-muted"}`}>
          <Clock className="w-3 h-3" />
          {isTimerExpired ? (
            <span className="text-destructive font-bold">Código expirado</span>
          ) : (
            <span>
              Expira en <span className="text-neon-green font-bold">{formattedTime}</span>
            </span>
          )}
        </div>

        {isTimerExpired && (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="flex items-center gap-1.5 text-xs font-mono text-neon-green hover:text-neon-green-dim transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isResending ? "animate-spin" : ""}`} />
            {isResending ? "Reenviando..." : "Reenviar código"}
          </button>
        )}
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-sm p-3 text-destructive text-xs font-mono">
          <span className="font-bold">[ERROR]</span> {errorMessage}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          disabled={isLoading || isTimerExpired || otpValue.length < 6}
          className="w-full h-11 bg-neon-green hover:bg-neon-green-dim text-white font-mono font-bold glow-green disabled:opacity-60"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Verificar código
            </span>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="w-full border-cyber-border text-cyber-light hover:border-neon-green/40 hover:text-neon-green font-mono"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cambiar ID de Telegram
        </Button>
      </div>
    </form>
  )
}

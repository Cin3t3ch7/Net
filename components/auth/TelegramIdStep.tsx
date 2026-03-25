"use client"
// ─── TelegramIdStep Component ─────────────────────────────────────────────────
// Step 1 of the login flow: user enters their Telegram ID.

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Send, MessageCircle, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { telegramIdSchema, type TelegramIdFormValues } from "@/schemas/auth"

interface TelegramIdStepProps {
  onSubmit: (telegramId: string) => Promise<void>
  isLoading: boolean
  errorMessage: string | null
}

export function TelegramIdStep({ onSubmit, isLoading, errorMessage }: TelegramIdStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TelegramIdFormValues>({
    resolver: zodResolver(telegramIdSchema),
  })

  const handleFormSubmit = async (values: TelegramIdFormValues) => {
    await onSubmit(values.telegramId)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Info banner */}
      <div className="bg-neon-green/5 border border-neon-green/20 rounded-sm p-4">
        <div className="flex items-start gap-3">
          <MessageCircle className="w-4 h-4 text-neon-green mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-xs text-cyber-light font-mono">
              <span className="text-neon-green font-bold">Autenticación Telegram</span>
            </p>
            <p className="text-[11px] text-cyber-muted font-mono leading-relaxed">
              Ingresa tu ID de Telegram. Recibirás un código OTP de 6 dígitos a través del bot de la plataforma.
            </p>
          </div>
        </div>
      </div>

      {/* Telegram ID Input */}
      <div className="space-y-2">
        <label className="text-cyber-light font-mono text-xs flex items-center gap-2">
          <span className="text-neon-green font-bold">#</span>
          Telegram ID
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted font-mono text-xs select-none">
            ID:
          </span>
          <Input
            {...register("telegramId")}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="1234567890"
            disabled={isLoading}
            className="pl-10 bg-cyber-darker border-cyber-border text-foreground placeholder:text-cyber-muted h-11 font-mono focus:ring-1 focus:ring-neon-green/50 focus:border-neon-green/50 tracking-widest"
          />
        </div>
        {errors.telegramId && (
          <p className="text-destructive text-[11px] font-mono flex items-center gap-1">
            <span>[ERR]</span> {errors.telegramId.message}
          </p>
        )}
      </div>

      {/* Server error */}
      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-sm p-3 text-destructive text-xs font-mono">
          <span className="text-destructive font-bold">[ERROR]</span> {errorMessage}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 bg-neon-green hover:bg-neon-green-dim text-white font-mono font-bold transition-all glow-green disabled:opacity-60"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando código...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Enviar código por Telegram
          </span>
        )}
      </Button>
    </form>
  )
}

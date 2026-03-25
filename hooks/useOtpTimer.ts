"use client"
// ─── useOtpTimer Hook ─────────────────────────────────────────────────────────
// Countdown timer for OTP expiry.

import { useState, useEffect, useRef, useCallback } from "react"
import { OTP_EXPIRY_SECONDS } from "@/lib/constants"

export interface UseOtpTimerReturn {
  secondsLeft: number
  isExpired: boolean
  restart: () => void
  formattedTime: string // MM:SS format
}

export function useOtpTimer(autoStart = false): UseOtpTimerReturn {
  const [secondsLeft, setSecondsLeft] = useState(autoStart ? OTP_EXPIRY_SECONDS : 0)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [hasStarted, setHasStarted] = useState(autoStart)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
  }, [])

  const restart = useCallback(() => {
    stop()
    setSecondsLeft(OTP_EXPIRY_SECONDS)
    setHasStarted(true)
    setIsRunning(true)
  }, [stop])

  useEffect(() => {
    if (!isRunning) return

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stop()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, stop])

  // isExpired = timer has started AND run all the way down to 0
  const isExpired = hasStarted && !isRunning && secondsLeft === 0

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  return { secondsLeft, isExpired, restart, formattedTime }
}

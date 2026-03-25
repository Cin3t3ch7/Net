"use client"

import Image from "next/image"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function SmartiмeLogo({ className = "", size = "md", showText = false }: LogoProps) {
  const sizes = {
    sm: { width: 48, height: 48, fontSize: "text-sm" },
    md: { width: 110, height: 110, fontSize: "text-lg" },
    lg: { width: 200, height: 200, fontSize: "text-2xl" },
  }

  const { width, height } = sizes[size]

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <Image
        src="/Logo.png"
        alt="SmarTime Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
    </div>
  )
}

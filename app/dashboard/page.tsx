"use client"
// ─── Dashboard Page ───────────────────────────────────────────────────────────
// Protected by AuthGuard. Adds logout button and session-aware header.
// Core dashboard UI preserved from before.

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Terminal, Home, RefreshCw, Tv, Plane, Search, ChevronRight, Link2, Key, LogOut, Check, Copy, Loader2, AlertCircle } from "lucide-react"
import { SmartiмeLogo } from "@/components/smartime-logo"
import { AuthGuard } from "@/components/guards/AuthGuard"
import { LogoutButton } from "@/components/auth/LogoutButton"
import { useSession } from "@/hooks/useSession"
import { apiRequest } from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"

interface Particle {
  id: number
  left: string
  top: string
  animationDelay: string
  animationDuration: string
  opacity: number
}

const options = [
  {
    id: "link-restablecimiento",
    icon: Link2,
    title: "Link de Restablecimiento",
    description: "Recibe un enlace directo para restablecer tu contraseña o recuperar el acceso a tu cuenta de Netflix de forma rápida y segura.",
    image: "/Reset.png"
  },
  {
    id: "codigo-inicio-sesion",
    icon: Key,
    title: "Código de Inicio de Sesión",
    description: "Genera un código numérico temporal para iniciar sesión en un televisor u otro dispositivo sin necesidad de ingresar tu contraseña manualmente.",
    image: "/codigoInicioSesion.png"
  },
  {
    id: "codigo-cerrar-sesiones",
    icon: LogOut,
    title: "Código de Cerrar Sesiones",
    description: "Desconecta tu cuenta de Netflix de todos los dispositivos activos usando un código de seguridad para proteger tu perfil inmediatamente.",
    image: "/codigoCerrarSesion.png"
  },
  {
    id: "actualizar-hogar",
    icon: RefreshCw,
    title: "Actualiza Hogar",
    description: "Se usa para establecer o cambiar la ubicación principal donde se consume Netflix.",
    image: "/ActualizarHoga.png"
  },
  {
    id: "codigo-hogar",
    icon: Home,
    title: "Código Hogar",
    description: "Es una medida de seguridad para verificar un televisor. Netflix genera un código en la TV que debes ingresar desde tu teléfono.",
    image: "/CodigoHogarEstoy.png"
  },
  {
    id: "estoy-de-viaje",
    icon: Plane,
    title: "Estoy de Viaje",
    description: "Permite usar la cuenta temporalmente fuera de tu ubicación principal. Recibes un código de acceso temporal válido por ~30 días.",
    image: "/CodigoHogarEstoy.png"
  },
  {
    id: "activar-tv",
    icon: Tv,
    title: "Activar TV",
    description: "Vincula por primera vez la aplicación de Netflix de un televisor con tu cuenta. Incluye escanear un código QR o ingresar una clave.",
    image: "/activarTv.png"
  }
]

function DashboardContent() {
  const { session } = useSession()
  const [email, setEmail] = useState("")
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchResult, setSearchResult] = useState<{ found: boolean; value?: string; error?: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setMounted(true)
    setParticles(
      [...Array(20)].map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${8 + Math.random() * 12}s`,
        opacity: Math.random() * 0.4 + 0.1,
      }))
    )
  }, [])

  const executeSearch = async (optionId: string) => {
    if (!email) {
      document.getElementById("email-input-section")?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    const typeMap: Record<string, string> = {
      "link-restablecimiento": "PASSWORD_RESET",
      "codigo-inicio-sesion": "LOGIN_CODE",
      "codigo-cerrar-sesiones": "LOGOUT_CODE",
      "actualizar-hogar": "UPDATE_HOME",
      "codigo-hogar": "HOME_CODE",
      "estoy-de-viaje": "TRAVELING",
      "activar-tv": "ACTIVATE_TV",
    }

    const searchType = typeMap[optionId];
    if (!searchType) return;

    setSelectedOption(optionId);
    setSearchResult(null);
    setCopied(false);
    setIsLoading(true);
    setIsModalOpen(true);

    try {
      const data = await apiRequest<{ success: boolean; result?: string; error?: string }>("/api/search", {
        method: "POST",
        body: JSON.stringify({ email, searchType })
      });

      if (data.success && data.result) {
        setSearchResult({ found: true, value: data.result });
      } else {
        setSearchResult({ found: false, error: data.error || "No se encontraron resultados." });
      }
    } catch (error: any) {
      setSearchResult({ found: false, error: error.message || "Error interno de servidor o de red." });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCopy = () => {
    if (searchResult?.value) {
      navigator.clipboard.writeText(searchResult.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const handleCardClick = (option: string, event: React.MouseEvent) => {
    event.stopPropagation()
    executeSearch(option)
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--cyber-black)' }}>
      <div className="bg-scene" />
      <div className="fixed inset-0 grid-pattern opacity-15" />
      <div className="fixed inset-0 scanlines pointer-events-none" />

      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {mounted && particles.map((p) => (
          <div
            key={p.id}
            className="absolute w-px h-px bg-neon-green rounded-full"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.animationDelay,
              animationDuration: p.animationDuration,
              opacity: p.opacity,
              animation: `float-subtle ${p.animationDuration} linear infinite`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 md:px-6 py-4">
        <SmartiмeLogo size="md" />

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-sm text-cyber-light font-mono">
            <span className="w-1.5 h-1.5 bg-neon-green-bright rounded-full animate-pulse" />
            <span className="text-neon-cyan-bright">SMARTIME_ACTIVE</span>
            {session && (
              <span className="text-cyber-light ml-2">
                · ID: <span className="text-neon-green">{session.telegramId}</span>
              </span>
            )}
          </div>
          <LogoutButton label="Cerrar Sesión" />
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-32 md:pt-40 pb-16">

        {/* Hero Section */}
        <div className="w-full max-w-4xl mx-auto mb-16">
          <div className="text-center px-4 py-8 md:py-12">

            <div className="inline-flex items-center gap-2 text-sm text-cyber-light mb-6 font-mono">
              <Terminal className="w-4 h-4" />
              <span className="text-neon-green-bright">&gt;</span>
              <span>smartime.init()</span>
              <span className="cursor-blink" />
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-tight">
              <span className="text-neon-green-bright text-glow">[</span>
              Smartime
              <span className="text-neon-cyan-bright text-glow">]</span>
            </h1>

            <p className="text-base md:text-lg text-cyber-light mb-10 font-mono">
              Gestión inteligente de tu cuenta Netflix
            </p>

            {/* Instructions */}
            <div className="max-w-2xl mx-auto mb-8 bg-cyber-card/80 backdrop-blur-sm rounded-sm p-5 border border-neon-green/30 glow-green">
              <div className="flex items-start gap-3 text-left">
                <div className="flex-shrink-0 w-6 h-6 rounded-sm bg-neon-green/20 flex items-center justify-center mt-0.5 border border-neon-green/40">
                  <ChevronRight className="w-3 h-3 text-neon-green-bright" />
                </div>
                <div className="flex-1">
                  <p className="text-cyber-light text-sm md:text-base leading-relaxed font-mono">
                    <span className="text-foreground font-medium">Selecciona una opción para continuar:</span>
                  </p>
                  <ol className="mt-3 space-y-1.5 text-cyber-light text-sm font-mono list-none">
                    <li className="flex items-center gap-2">
                      <span className="text-neon-green-bright">01.</span> Ingresa tu correo electrónico
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-neon-cyan-bright">02.</span> Selecciona la opción necesaria
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-neon-green-bright">03.</span> Sigue las instrucciones
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Email input */}
            <div id="email-input-section" className="max-w-md mx-auto mb-8">
              <div className="relative group">
                <div className="absolute -inset-px bg-neon-green/0 group-focus-within:bg-neon-green/20 rounded-sm transition duration-300 blur-sm" />
                <div className="relative flex gap-2">
                  <Input
                    type="email"
                    placeholder="usuario@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-cyber-card border-neon-green/30 text-foreground placeholder:text-cyber-muted h-11 text-sm rounded-sm focus:ring-1 focus:ring-neon-green-bright/70 focus:border-neon-green-bright font-mono"
                  />
                  <Button
                    size="icon"
                    className="h-11 w-11 rounded-sm bg-gradient-to-r from-neon-green-bright to-neon-cyan-bright hover:from-neon-green hover:to-neon-cyan text-white transition-all border-0 font-bold"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-wrap justify-center gap-3">
                {options.map((option) => (
                  <Button
                    key={option.id}
                    variant="outline"
                    size="sm"
                    onClick={() => executeSearch(option.id)}
                    className={`rounded-sm transition-all font-mono text-sm border-2 px-4 py-2 h-auto ${selectedOption === option.id
                      ? "bg-neon-green text-white border-neon-green font-bold shadow-[0_0_20px_rgba(0,255,136,0.5)] hover:bg-neon-green-dim"
                      : "bg-cyber-card/60 border-neon-green/40 text-cyber-light hover:bg-cyber-card hover:text-neon-green hover:border-neon-green"
                      }`}
                  >
                    <option.icon className={`w-3.5 h-3.5 mr-2 ${selectedOption === option.id ? "text-white" : ""}`} />
                    {option.title}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="w-full py-16">
          <div className="w-full max-w-7xl mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-sm text-cyber-light mb-3 font-mono">
                <span className="text-neon-green-bright">&gt;</span>
                <span>load_features()</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-neon-green-bright to-neon-cyan-bright bg-clip-text text-transparent font-mono">
                Funciones Disponibles
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {options.map((option, index) => (
                <Card
                  key={option.id}
                  className={`group bg-cyber-card/80 border-neon-green/30 hover:border-neon-green-bright hover:glow-green transition-all duration-300 cursor-pointer overflow-hidden rounded-sm border-glow ${selectedOption === option.id ? "ring-1 ring-neon-green-bright border-neon-green-bright glow-green" : ""
                    }`}
                  onClick={(e) => handleCardClick(option.id, e)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-sm bg-neon-green/20 flex items-center justify-center border border-neon-green/40 group-hover:bg-neon-green/30 transition-colors">
                        <option.icon className="w-4 h-4 text-neon-green-bright" />
                      </div>
                      <div>
                        <div className="text-xs text-cyber-light font-mono mb-0.5">
                          OPTION_{String(index + 1).padStart(2, "0")}
                        </div>
                        <CardTitle className="text-foreground text-lg font-mono font-medium">
                          {option.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video mb-4 rounded-sm overflow-hidden bg-cyber-darker border border-cyber-border relative">
                      <Image
                        src={option.image}
                        alt={option.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                      />
                    </div>
                    <CardDescription className="text-cyber-light leading-relaxed text-sm font-mono">
                      {option.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-4xl mx-auto mt-16 px-4">
          <div className="border-t border-neon-green/30 pt-6 text-center">
            <p className="text-xs text-cyber-light font-mono">
              <span className="text-neon-green-bright">&gt;</span> Smartime v2.0 | Sistema Inteligente de Gestión
            </p>
          </div>
        </div>

      </div>

      {/* Result Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-cyber-card border-neon-green/30 text-cyber-light font-mono">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-neon-green-bright flex items-center gap-2">
              <Search className="w-5 h-5" />
              Resultados de Búsqueda
            </DialogTitle>
            <DialogDescription className="text-cyber-muted mt-2">
              Buscando coincidencias para <strong className="text-white font-normal">{options.find(o => o.id === selectedOption)?.title}</strong> en <strong className="text-white font-normal">{email}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center min-h-[160px] py-4 bg-cyber-darker/30 rounded-md border border-cyber-border">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4 text-neon-cyan">
                <Loader2 className="w-10 h-10 animate-spin opacity-80" />
                <p className="animate-pulse text-sm">Escaneando buzón...</p>
              </div>
            ) : searchResult ? (
              searchResult.found ? (
                <div className="w-full space-y-3 px-4 md:px-8 flex flex-col items-center">
                  <p className="text-xs text-cyber-muted uppercase tracking-widest text-center">Valor Encontrado</p>
                  <div className="w-full bg-cyber-darker p-4 md:p-6 rounded-md border border-neon-green/40 shadow-[0_0_15px_rgba(0,255,136,0.1)] max-h-[250px] overflow-y-auto styled-scrollbar">
                    <p
                      className={`font-bold text-white break-all select-all selection:bg-neon-green/30 ${searchResult.value!.length > 20
                        ? "text-sm md:text-base leading-relaxed text-left"
                        : "text-3xl md:text-4xl tracking-widest text-center"
                        }`}
                    >
                      {searchResult.value}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-red-400 px-6">
                  <div className="mb-3 opacity-80 flex justify-center">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <p className="text-sm font-medium">{searchResult.error}</p>
                </div>
              )
            ) : null}
          </div>

          <DialogFooter className="sm:justify-between flex-row gap-2 mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-cyber-border text-cyber-light hover:text-white bg-transparent">
                Cerrar
              </Button>
            </DialogClose>
            {searchResult?.found && (
              <Button
                type="button"
                onClick={handleCopy}
                className="bg-neon-green/20 text-neon-green hover:bg-neon-green hover:text-black border border-neon-green transition-colors"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Page export (wrapped in guard) ──────────────────────────────────────────

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}

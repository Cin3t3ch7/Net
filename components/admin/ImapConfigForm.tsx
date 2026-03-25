"use client"
// ─── ImapConfigManager ─────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react"
import { Server, Hash, Mail, Key, Loader2, CheckCircle2, Trash2, Globe, Edit2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listImapConfigs, createImapConfig, deleteImapConfig, updateImapConfig } from "@/services/imap.service"
import type { ImapConfig, CreateImapConfigInput } from "@/types/imap"

export function ImapConfigForm() {
  const [configs, setConfigs] = useState<ImapConfig[]>([])
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true)

  const [form, setForm] = useState<CreateImapConfigInput>({
    domain: "",
    server: "imap.gmail.com",
    port: "993",
    email: "",
    password: "",
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listImapConfigs().then((data) => {
      setConfigs(data)
      setIsLoadingConfigs(false)
    }).catch(err => {
      console.error(err)
      setIsLoadingConfigs(false)
    })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaved(false)
    setError(null)

    try {
      if (!form.domain || !form.email || !form.password) {
        throw new Error("Por favor completa los campos obligatorios (Dominio, Correo, Password).")
      }
      
      if (editingId) {
        const updatedConfig = await updateImapConfig(editingId, form)
        setConfigs(prev => prev.map(c => c.id === editingId ? updatedConfig : c))
        setEditingId(null)
      } else {
        const newConfig = await createImapConfig(form)
        setConfigs(prev => [...prev, newConfig])
      }

      setForm({ domain: "", server: "imap.gmail.com", port: "993", email: "", password: "" })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || "Error al guardar la configuración")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(id)
    try {
      await deleteImapConfig(id)
      setConfigs(prev => prev.filter(c => c.id !== id))
      if (editingId === id) {
        setEditingId(null)
        setForm({ domain: "", server: "imap.gmail.com", port: "993", email: "", password: "" })
      }
    } catch (err: any) {
      alert(err.message || "Error al eliminar la configuración.")
    } finally {
      setIsDeleting(null)
    }
  }
  
  const handleEdit = (config: ImapConfig) => {
    setEditingId(config.id)
    setForm({
      domain:   config.domain   ?? "",
      server:   config.server   ?? "",
      port:     config.port     ?? "993",
      email:    config.email    ?? "",
      // password is NEVER returned by the API (encrypted in DB).
      // The user must re-enter it when editing. Start with empty string
      // to avoid controlled → uncontrolled React warning.
      password: "",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ domain: "", server: "imap.gmail.com", port: "993", email: "", password: "" })
  }

  const update = (key: keyof CreateImapConfigInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const filteredConfigs = useMemo(() => {
    if (!search.trim()) return configs
    const lower = search.toLowerCase()
    return configs.filter(c => 
      c.domain.toLowerCase().includes(lower) || 
      c.email.toLowerCase().includes(lower) || 
      c.server.toLowerCase().includes(lower)
    )
  }, [configs, search])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-mono font-bold text-foreground flex items-center gap-2">
          <span className="text-neon-green">&gt;</span>
          Gestión de Servidores IMAP
        </h2>
        <p className="text-xs text-white font-mono mt-1">
          Configura y administra las conexiones a múltiples servidores de correo
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Form */}
        <Card className="bg-cyber-card/80 border-cyber-border sticky top-4">
          <CardHeader className="pb-4 border-b border-cyber-border/50">
            <CardTitle className="text-foreground font-mono text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editingId ? <Edit2 className="w-4 h-4 text-neon-green" /> : <Server className="w-4 h-4 text-neon-green" />}
                {editingId ? "Editar Servidor" : "Añadir Servidor"}
              </div>
              {editingId && (
                <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 text-xs text-cyber-muted hover:text-white">
                  Cancelar
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-4">
              {/* Domain */}
              <div className="space-y-1.5">
                <label className="text-white font-mono text-xs flex items-center gap-2">
                  <Globe className="w-3 h-3 text-neon-green" /> Dominio
                </label>
                <Input value={form.domain} onChange={update("domain")} placeholder="empresa.com"
                  className="bg-cyber-darker text-white border-cyber-border font-mono text-sm" />
              </div>

              {/* Server */}
              <div className="space-y-1.5">
                <label className="text-white font-mono text-xs flex items-center gap-2">
                  <Server className="w-3 h-3 text-neon-green" /> Servidor IMAP
                </label>
                <Input value={form.server} onChange={update("server")} placeholder="imap.gmail.com"
                  className="bg-cyber-darker text-white border-cyber-border font-mono text-sm" />
              </div>

              {/* Port */}
              <div className="space-y-1.5">
                <label className="text-white font-mono text-xs flex items-center gap-2">
                  <Hash className="w-3 h-3 text-neon-green" /> Puerto
                </label>
                <Input value={form.port} onChange={update("port")} placeholder="993"
                  className="bg-cyber-darker text-white border-cyber-border font-mono text-sm" />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-white font-mono text-xs flex items-center gap-2">
                  <Mail className="w-3 h-3 text-neon-green" /> Correo
                </label>
                <Input type="email" value={form.email} onChange={update("email")} placeholder="bot@empresa.com"
                  className="bg-cyber-darker text-white border-cyber-border font-mono text-sm" />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-white font-mono text-xs flex items-center gap-2">
                  <Key className="w-3 h-3 text-neon-green" /> Contraseña (App Password)
                </label>
                <Input type="password" value={form.password} onChange={update("password")} placeholder="••••••••••••"
                  className="bg-cyber-darker text-white border-cyber-border font-mono text-sm" />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-sm p-3 mt-2 text-destructive text-xs font-mono">
                  [ERROR] {error}
                </div>
              )}

              <div className="pt-4 border-t border-cyber-border flex items-center gap-3">
                <Button type="submit" disabled={isSaving}
                  className="bg-neon-green hover:bg-neon-green-dim text-white font-mono w-full">
                  {isSaving
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                    : saved
                      ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Guardado</>
                      : editingId ? "Actualizar Servidor" : "Guardar Servidor"
                  }
                </Button>
              </div>

              <div className="bg-cyber-darker/50 rounded-sm p-3 border border-cyber-border mt-4">
                <p className="text-[10px] text-white font-mono leading-relaxed">
                  <span className="text-neon-green">// </span>
                  Para Gmail u otros servicios seguros, usa una "App Password" en lugar de la contraseña de la cuenta.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Side: Saved Configs List */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 border-b border-cyber-border pb-3">
            <h3 className="text-sm font-mono text-white flex items-center justify-between">
              <span>Servidores Guardados</span>
              <span className="bg-cyber-darker text-neon-green px-2 py-0.5 rounded text-xs border border-cyber-border">
                {configs.length}
              </span>
            </h3>
            
            <div className="relative group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyber-muted" />
              <Input 
                value={search}
                onChange={p => setSearch(p.target.value)}
                placeholder="Buscar por dominio, email o servidor..."
                className="pl-8 bg-cyber-darker/50 text-white border-cyber-border font-mono text-[11px] h-8"
              />
            </div>
          </div>

          {isLoadingConfigs ? (
            <div className="flex flex-col items-center justify-center py-16 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-neon-green/50 mb-4" />
              <p className="text-xs font-mono">Cargando servidores...</p>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="bg-cyber-darker border border-dashed border-cyber-border rounded-lg p-10 text-center flex flex-col items-center justify-center">
              <Server className="w-10 h-10 text-white mb-4 opacity-30" />
              <p className="text-white font-mono text-xs">No se encontraron servidores.</p>
              {search && <p className="text-white/50 font-mono text-[10px] mt-1">Prueba con otra búsqueda.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredConfigs.map(c => (
                <Card key={c.id} className="bg-cyber-card/60 border-cyber-border hover:border-neon-green/30 transition-colors p-2 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-neon-green" />
                      <span className="text-white font-mono text-xs font-bold truncate max-w-[150px]">
                        {c.domain}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => handleEdit(c)}
                        disabled={isDeleting === c.id}
                        className="h-6 w-6 p-0 text-white hover:text-neon-green hover:bg-neon-green/10 rounded-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(c.id)}
                        disabled={isDeleting === c.id}
                        className="h-6 w-6 p-0 text-white hover:text-destructive hover:bg-destructive/10 rounded-sm"
                      >
                        {isDeleting === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-white bg-cyber-darker/80 p-1.5 rounded-sm border border-cyber-border/30 shadow-inner">
                      <Mail className="w-3 h-3 text-neon-green/70 flex-shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[10px] font-mono text-white leading-tight">
                      <div className="flex items-center gap-1.5 truncate">
                        <Server className="w-3 h-3 flex-shrink-0 text-neon-green/50" />
                        <span className="truncate">{c.server}:{c.port}</span>
                      </div>
                      <span className="border border-cyber-border px-1.5 py-[2px] rounded-sm text-[8px] bg-cyber-darker whitespace-nowrap text-white/80">
                        Seguro
                      </span>
                    </div>
                    <div className="pt-1 mt-1 border-t border-cyber-border/30">
                      <p className="text-[8px] font-mono text-white/60 text-right">
                        Añadido: {new Date(c.createdAt).toLocaleDateString("es-CO", { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2); 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 136, 0.3); 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 136, 0.5); 
        }
      `}</style>
    </div>
  )
}

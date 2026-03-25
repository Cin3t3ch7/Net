"use client"
// ─── UserForm Component ───────────────────────────────────────────────────────
// Dialog form for creating and editing users.
// Uses telegramId — no username or password.

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createUserSchema, updateUserSchema, type CreateUserFormValues, type UpdateUserFormValues } from "@/schemas/user"
import type { User } from "@/types/user"

// ─── Create Form ──────────────────────────────────────────────────────────────

interface CreateUserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateUserFormValues) => Promise<void>
  isLoading: boolean
  errorMessage: string | null
}

export function CreateUserForm({ open, onOpenChange, onSubmit, isLoading, errorMessage }: CreateUserFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "user", status: "active", canSearchAny: false },
  })

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const canSearchAny = watch("canSearchAny")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cyber-card border-cyber-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground font-mono">Nuevo Usuario</DialogTitle>
          <DialogDescription className="text-cyber-muted font-mono text-xs">
            Registra un usuario por su Telegram ID.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Telegram ID */}
          <div className="space-y-1.5">
            <label className="text-cyber-light font-mono text-xs"># Telegram ID</label>
            <Input
              {...register("telegramId")}
              inputMode="numeric"
              placeholder="1234567890"
              className="bg-cyber-darker border-cyber-border font-mono tracking-widest"
            />
            {errors.telegramId && <p className="text-destructive text-[11px] font-mono">{errors.telegramId.message}</p>}
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-cyber-light font-mono text-xs">Nombre para mostrar</label>
            <Input
              {...register("displayName")}
              placeholder="Nombre del usuario"
              className="bg-cyber-darker border-cyber-border font-mono"
            />
            {errors.displayName && <p className="text-destructive text-[11px] font-mono">{errors.displayName.message}</p>}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-cyber-light font-mono text-xs">Rol</label>
            <Select defaultValue="user" onValueChange={(v) => setValue("role", v as "admin" | "user")}>
              <SelectTrigger className="bg-cyber-darker border-cyber-border font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-cyber-card border-cyber-border font-mono">
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-cyber-light font-mono text-xs">Estado</label>
            <Select defaultValue="active" onValueChange={(v) => setValue("status", v as "active" | "inactive" | "suspended")}>
              <SelectTrigger className="bg-cyber-darker border-cyber-border font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-cyber-card border-cyber-border font-mono">
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Can Search Any */}
          <div className="flex items-center justify-between p-3 bg-cyber-darker rounded-sm border border-cyber-border">
            <span className="text-sm text-cyber-light font-mono">Buscar cualquier correo</span>
            <Switch
              checked={canSearchAny}
              onCheckedChange={(v) => setValue("canSearchAny", v)}
              className="data-[state=checked]:bg-neon-green"
            />
          </div>

          {errorMessage && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-sm p-3 text-destructive text-xs font-mono">
              [ERROR] {errorMessage}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-cyber-border text-cyber-light font-mono">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-neon-green hover:bg-neon-green-dim text-white font-mono">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isLoading ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Form ────────────────────────────────────────────────────────────────

interface EditUserFormProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UpdateUserFormValues) => Promise<void>
  isLoading: boolean
  errorMessage: string | null
}

export function EditUserForm({ user, open, onOpenChange, onSubmit, isLoading, errorMessage }: EditUserFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
  })

  useEffect(() => {
    if (user && open) {
      reset({
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        canSearchAny: user.canSearchAny,
      })
    }
  }, [user, open, reset])

  const canSearchAny = watch("canSearchAny")

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cyber-card border-cyber-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground font-mono">Editar Usuario</DialogTitle>
          <DialogDescription className="text-cyber-muted font-mono text-xs">
            Telegram ID: <span className="text-neon-green">{user.telegramId}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-cyber-light font-mono text-xs">Nombre para mostrar</label>
            <Input {...register("displayName")} className="bg-cyber-darker border-cyber-border font-mono" />
            {errors.displayName && <p className="text-destructive text-[11px] font-mono">{errors.displayName.message}</p>}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-cyber-light font-mono text-xs">Rol</label>
            <Select value={watch("role")} onValueChange={(v) => setValue("role", v as "admin" | "user")}>
              <SelectTrigger className="bg-cyber-darker border-cyber-border font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-cyber-card border-cyber-border font-mono">
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-cyber-light font-mono text-xs">Estado</label>
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "active" | "inactive" | "suspended")}>
              <SelectTrigger className="bg-cyber-darker border-cyber-border font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-cyber-card border-cyber-border font-mono">
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Can Search Any */}
          <div className="flex items-center justify-between p-3 bg-cyber-darker rounded-sm border border-cyber-border">
            <span className="text-sm text-cyber-light font-mono">Buscar cualquier correo</span>
            <Switch
              checked={canSearchAny}
              onCheckedChange={(v) => setValue("canSearchAny", v)}
              className="data-[state=checked]:bg-neon-green"
            />
          </div>

          {errorMessage && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-sm p-3 text-destructive text-xs font-mono">
              [ERROR] {errorMessage}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-cyber-border text-cyber-light font-mono">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-neon-green hover:bg-neon-green-dim text-white font-mono">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

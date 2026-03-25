"use client"
// ─── UserTable Component ──────────────────────────────────────────────────────
// Displays the list of users as cards with inline actions.
// Handles email management, toggle search-any, edit, and delete.

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Users, Mail, Shield, Trash2, Edit, Plus, X, Loader2,
  CheckCircle2, BanIcon, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { updateEmailsSchema, type UpdateEmailsFormValues } from "@/schemas/user"
import type { User } from "@/types/user"

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: User["status"] }) {
  const config = {
    active:    { icon: CheckCircle2, label: "Activo",     className: "bg-neon-green/10 text-neon-green border-neon-green/30" },
    inactive:  { icon: AlertCircle,  label: "Inactivo",   className: "bg-cyber-muted/10 text-cyber-muted border-cyber-border" },
    suspended: { icon: BanIcon,      label: "Suspendido", className: "bg-destructive/10 text-destructive border-destructive/30" },
  }
  const { icon: Icon, label, className } = config[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono border ${className}`}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  )
}

function RoleBadge({ role }: { role: User["role"] }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono border ${
      role === "admin"
        ? "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30"
        : "bg-cyber-card text-cyber-muted border-cyber-border"
    }`}>
      {role === "admin" ? "Admin" : "Usuario"}
    </span>
  )
}

// ─── Manage Emails Dialog ─────────────────────────────────────────────────────────

interface ManageEmailsDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (emails: string[]) => Promise<void>
  isLoading: boolean
}

function ManageEmailsDialog({ user, open, onOpenChange, onUpdate, isLoading }: ManageEmailsDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UpdateEmailsFormValues>({
    resolver: zodResolver(updateEmailsSchema),
  })

  // Synchronize textarea value when the modal opens or user changes
  useEffect(() => {
    if (open && user) {
      reset({ emailsText: user.allowedEmails.join("\n") })
    } else if (!open) {
      reset({ emailsText: "" })
    }
  }, [open, user, reset])

  const handleClose = () => { onOpenChange(false) }
  
  const handleFormSubmit = async (values: UpdateEmailsFormValues) => {
    // Process text box into array: split by commas or newlines, remove empty/whitespace-only elements
    const emailArray = values.emailsText
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
    
    await onUpdate(emailArray)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cyber-card border-cyber-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground font-mono">Administrar Correos</DialogTitle>
          <DialogDescription className="text-cyber-muted font-mono text-xs">
            Para: <span className="text-neon-green">{user?.displayName}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-cyber-light font-mono text-xs">
              Lista de correos (separados por renglones o comas)
            </label>
            <textarea
              {...register("emailsText")}
              placeholder="ejemplo1@gmail.com&#10;ejemplo2@gmail.com"
              className="w-full h-32 p-3 bg-cyber-darker border border-cyber-border font-mono text-sm text-foreground rounded-sm outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green/30 resize-none"
            />
            {errors.emailsText && <p className="text-destructive text-[11px] font-mono">{errors.emailsText.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} className="border-cyber-border text-cyber-light font-mono">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-neon-green hover:bg-neon-green-dim text-white font-mono">
              {isLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface UserTableProps {
  users: User[]
  isLoading: boolean
  searchQuery: string
  onEdit: (user: User) => void
  onDelete: (userId: string) => Promise<void>
  onToggleSearchAny: (userId: string) => Promise<void>
  onUpdateEmails: (userId: string, emails: string[]) => Promise<void>
}

export function UserTable({
  users, isLoading, searchQuery, onEdit, onDelete,
  onToggleSearchAny, onUpdateEmails
}: UserTableProps) {
  const [manageEmailUser, setManageEmailUser] = useState<User | null>(null)
  const [manageEmailOpen, setManageEmailOpen] = useState(false)
  const [isUpdatingEmails, setIsUpdatingEmails] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const filteredUsers = users.filter((u) =>
    u.telegramId.includes(searchQuery) ||
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (userId: string) => {
    setDeletingId(userId)
    await onDelete(userId)
    setDeletingId(null)
  }

  const handleToggle = async (userId: string) => {
    setTogglingId(userId)
    await onToggleSearchAny(userId)
    setTogglingId(null)
  }

  const handleUpdateEmails = async (emails: string[]) => {
    if (!manageEmailUser) return
    setIsUpdatingEmails(true)
    await onUpdateEmails(manageEmailUser.id, emails)
    setIsUpdatingEmails(false)
    setManageEmailOpen(false)
    setManageEmailUser(null)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-cyber-muted font-mono">
        <div className="w-8 h-8 border-2 border-neon-green/30 border-t-neon-green rounded-full animate-spin" />
        <p className="text-sm">Cargando usuarios...</p>
      </div>
    )
  }

  if (filteredUsers.length === 0) {
    return (
      <div className="text-center py-16 text-cyber-muted font-mono">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>{searchQuery ? "No se encontraron usuarios" : "No hay usuarios registrados"}</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="bg-cyber-card/80 border-cyber-border hover:border-neon-green/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-neon-green/10 flex items-center justify-center border border-neon-green/20 flex-shrink-0">
                    <Users className="w-5 h-5 text-neon-green" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground font-mono text-base">
                      {user.displayName}
                    </CardTitle>
                    <CardDescription className="text-cyber-muted font-mono text-xs flex items-center gap-2 mt-0.5">
                      <span className="text-neon-green/70 font-bold">#</span>
                      {user.telegramId}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={user.status} />
                  <RoleBadge role={user.role} />
                </div>
              </div>
              <p className="text-[10px] text-cyber-muted font-mono ml-13 pl-13">
                Creado: {new Date(user.createdAt).toLocaleDateString("es-CO")}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Search Any Toggle */}
              <div className="flex items-center justify-between p-3 bg-cyber-darker rounded-sm border border-cyber-border">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-neon-cyan" />
                  <span className="text-sm text-cyber-light font-mono">Buscar cualquier correo</span>
                </div>
                <Switch
                  checked={user.canSearchAny}
                  onCheckedChange={() => handleToggle(user.id)}
                  disabled={togglingId === user.id}
                  className="data-[state=checked]:bg-neon-green"
                />
              </div>

              {/* Allowed Emails */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyber-muted font-mono flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    Correos permitidos ({user.allowedEmails.length})
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setManageEmailUser(user); setManageEmailOpen(true) }}
                    className="border-neon-green/40 text-neon-green hover:bg-neon-green/10 font-mono text-xs h-7"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Administrar
                  </Button>
                </div>

                {user.allowedEmails.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.allowedEmails.map((email, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-cyber-darker px-3 py-1.5 rounded-sm border border-cyber-border text-xs font-mono text-cyber-light"
                      >
                        <Mail className="w-3 h-3 text-neon-green" />
                        {email}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-cyber-muted font-mono italic">
                    {user.canSearchAny ? "Puede buscar cualquier correo" : "Sin correos asignados"}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-cyber-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(user)}
                  className="border-cyber-border text-cyber-light hover:border-neon-green/50 hover:text-neon-green font-mono flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(user.id)}
                  disabled={deletingId === user.id}
                  className="border-destructive/50 text-destructive hover:bg-destructive/10 font-mono"
                >
                  {deletingId === user.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ManageEmailsDialog
        user={manageEmailUser}
        open={manageEmailOpen}
        onOpenChange={setManageEmailOpen}
        onUpdate={handleUpdateEmails}
        isLoading={isUpdatingEmails}
      />
    </>
  )
}

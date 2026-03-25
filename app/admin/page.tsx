"use client"
// ─── Admin Page ───────────────────────────────────────────────────────────────
// Protected by AdminGuard (redirect to / if no session, /dashboard if not admin).
// Delegates rendering to extracted components. No business logic here.

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Users, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { AdminGuard } from "@/components/guards/AdminGuard"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { UserTable } from "@/components/admin/UserTable"
import { ImapConfigForm } from "@/components/admin/ImapConfigForm"
import { CreateUserForm, EditUserForm } from "@/components/admin/UserForm"

import { useSession } from "@/hooks/useSession"
import type { User, UpdateUserInput } from "@/types/user"
import type { CreateUserFormValues, UpdateUserFormValues } from "@/schemas/user"
import {
  listUsers, createUser, updateUser, deleteUser,
  toggleSearchAny, updateUserEmails
} from "@/services/user.service"

// ─── Inner Component (runs inside the guard) ──────────────────────────────────

function AdminContent() {
  const { session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("users")

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editUser, setEditUser] = useState<User | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Load users on mount
  useEffect(() => {
    listUsers().then((data) => {
      setUsers(data)
      setIsLoadingUsers(false)
    })
  }, [])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async (data: CreateUserFormValues) => {
    setCreateLoading(true)
    setCreateError(null)
    try {
      const newUser = await createUser(data)
      setUsers((prev) => [...prev, newUser])
      setCreateOpen(false)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Error al crear usuario")
    } finally {
      setCreateLoading(false)
    }
  }, [])

  const handleEdit = useCallback((user: User) => {
    setEditUser(user)
    setEditOpen(true)
    setEditError(null)
  }, [])

  const handleUpdate = useCallback(async (data: UpdateUserFormValues) => {
    if (!editUser) return
    setEditLoading(true)
    setEditError(null)
    try {
      const updated = await updateUser(editUser.id, data as UpdateUserInput)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      setEditOpen(false)
      setEditUser(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error al actualizar usuario")
    } finally {
      setEditLoading(false)
    }
  }, [editUser])

  const handleDelete = useCallback(async (userId: string) => {
    await deleteUser(userId)
    setUsers((prev) => prev.filter((u) => u.id !== userId))
  }, [])

  const handleToggleSearchAny = useCallback(async (userId: string) => {
    const updated = await toggleSearchAny(userId)
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
  }, [])

  const handleUpdateEmails = useCallback(async (userId: string, emails: string[]) => {
    const updated = await updateUserEmails(userId, emails)
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cyber-black)' }}>
      <div className="bg-scene" />
      <div className="fixed inset-0 grid-pattern opacity-15" />
      <div className="fixed inset-0 scanlines pointer-events-none" />

      <AdminHeader session={session} />

      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-cyber-card border border-cyber-border">
            <TabsTrigger
              value="users"
              className="font-mono data-[state=active]:bg-neon-green data-[state=active]:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger
              value="imap"
              className="font-mono data-[state=active]:bg-neon-green data-[state=active]:text-white"
            >
              <Server className="w-4 h-4 mr-2" />
              Config IMAP
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-mono font-bold text-foreground flex items-center gap-2">
                  <span className="text-neon-green">&gt;</span>
                  Gestión de Usuarios
                </h2>
                <p className="text-sm text-cyber-light font-mono mt-1">
                  Usuarios autenticados por Telegram ID
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-muted" />
                  <Input
                    placeholder="Buscar por nombre o ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-cyber-darker border-cyber-border font-mono w-64"
                  />
                </div>
                <Button
                  onClick={() => { setCreateOpen(true); setCreateError(null) }}
                  className="bg-neon-green hover:bg-neon-green-dim text-white font-mono"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </div>
            </div>

            <UserTable
              users={users}
              isLoading={isLoadingUsers}
              searchQuery={searchQuery}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleSearchAny={handleToggleSearchAny}
              onUpdateEmails={handleUpdateEmails}
            />
          </TabsContent>

          {/* IMAP Tab */}
          <TabsContent value="imap">
            <ImapConfigForm />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="relative z-10 border-t border-cyber-border py-4 mt-auto">
        <p className="text-xs text-cyber-light font-mono text-center">
          <span className="text-neon-green">&gt;</span> Smartime Admin Panel v2.0
        </p>
      </footer>

      {/* Dialogs */}
      <CreateUserForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isLoading={createLoading}
        errorMessage={createError}
      />
      <EditUserForm
        user={editUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdate}
        isLoading={editLoading}
        errorMessage={editError}
      />
    </div>
  )
}

// ─── Page Export (wrapped in guard) ──────────────────────────────────────────

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  )
}

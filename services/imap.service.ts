// ─── IMAP Service ────────────────────────────────────────────────────────────
// Connects to the real Express backend.
// IMAP passwords are encrypted server-side (AES-256-GCM).
// They are NEVER returned in any API response.
//
// Endpoints (all require imap:manage permission):
//   listImapConfigs   → GET    /api/imap
//   createImapConfig  → POST   /api/imap
//   updateImapConfig  → PATCH  /api/imap/:id
//   deleteImapConfig  → DELETE /api/imap/:id

import type { ImapConfig, CreateImapConfigInput } from "@/types/imap"
import { apiRequest } from "@/lib/api-client"

export async function listImapConfigs(): Promise<ImapConfig[]> {
  return apiRequest<ImapConfig[]>("/api/imap")
}

export async function createImapConfig(data: CreateImapConfigInput): Promise<ImapConfig> {
  return apiRequest<ImapConfig>("/api/imap", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function deleteImapConfig(id: string): Promise<void> {
  return apiRequest<void>(`/api/imap/${id}`, { method: "DELETE" })
}

export async function updateImapConfig(
  id: string,
  data: Partial<CreateImapConfigInput>
): Promise<ImapConfig> {
  return apiRequest<ImapConfig>(`/api/imap/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}


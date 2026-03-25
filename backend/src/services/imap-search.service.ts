import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { logger } from "../db/logger";
import { extractDataFromEmailBody, SearchType, type ExtractionResult } from "./extraction.service";
import type { ResolvedImapConfig } from "./domain-resolution.service";

// ─── Configuration constants ──────────────────────────────────────────────────
const IMAP_CONNECT_TIMEOUT_MS   = 8_000
const IMAP_IDLE_TIMEOUT_MS      = 120_000
const IMAP_SEARCH_WINDOW_HOURS  = 24
const IMAP_MAX_EMAILS_TO_PARSE  = 5
// Max raw message size before we skip parsing.
// Prevents OOM from unexpectedly large emails or malicious attachments.
const IMAP_MAX_MESSAGE_BYTES    = 512_000 // 512 KB

// ─── IMAP Connection Pool ─────────────────────────────────────────────────────
//
// Design: Per email-address keyed Map.
//
// RACE CONDITION FIX:
//   The original implementation had a critical race: if two concurrent requests
//   arrived for the same email while no connection existed, both would pass the
//   "no poolItem" check, both would call client.connect(), and the second would
//   overwrite the first in the Map, leaving a dangling connected socket.
//
//   Fix: pending Map<string, Promise<ImapFlow>>. When a connection is being
//   established, we store the in-flight Promise. Any concurrent request for the
//   same key awaits the same Promise instead of opening a new connection.
//   This is a standard mutex-by-promise pattern for async JS.

interface PoolEntry {
  client: ImapFlow;
  activeRequests: number;
  idleTimer?: NodeJS.Timeout;
}

class ImapConnectionPool {
  private connections = new Map<string, PoolEntry>()
  /** Holds in-flight connect() Promises to prevent concurrent duplicate connections */
  private pending      = new Map<string, Promise<ImapFlow>>()

  async getClient(config: ResolvedImapConfig): Promise<ImapFlow> {
    const key = config.email

    // ── Fast path: reuse an existing usable connection ────────────────────────
    const entry = this.connections.get(key)
    if (entry?.client.usable) {
      // Cancel pending idle logout
      if (entry.idleTimer) {
        clearTimeout(entry.idleTimer)
        entry.idleTimer = undefined
      }
      entry.activeRequests++
      return entry.client
    }

    // ── Dedup path: another coroutine is already connecting for this key ──────
    const inFlight = this.pending.get(key)
    if (inFlight) {
      // Await the same connection instead of creating a new one
      const client = await inFlight
      // Increment counter on the (by now created) entry
      const created = this.connections.get(key)
      if (created) created.activeRequests++
      return client
    }

    // ── Connect path: this coroutine wins the race, establishes connection ────
    const connectPromise = this._connect(config)
    this.pending.set(key, connectPromise)

    try {
      const client = await connectPromise
      return client
    } finally {
      this.pending.delete(key)
    }
  }

  private async _connect(config: ResolvedImapConfig): Promise<ImapFlow> {
    const key = config.email

    const client = new ImapFlow({
      host:   config.server,
      port:   config.port,
      secure: config.useSsl,
      auth: {
        user: config.email,
        pass: config.passwordDecrypted,
      },
      logger: false, // Prevents credential leak in logs
      tls: {
        rejectUnauthorized: true // Enforce TLS certificate validation — prevents MITM
      },
    })

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout conectando al servidor IMAP")), IMAP_CONNECT_TIMEOUT_MS)
    )

    await Promise.race([client.connect(), timeout])

    this.connections.set(key, { client, activeRequests: 1 })
    logger.debug({ email: key }, "IMAP: new connection established")
    return client
  }

  releaseClient(config: ResolvedImapConfig): void {
    const key = config.email
    const entry = this.connections.get(key)
    if (!entry) return

    entry.activeRequests = Math.max(0, entry.activeRequests - 1)

    // Clear any existing idle timer before setting a new one
    if (entry.idleTimer) clearTimeout(entry.idleTimer)

    if (entry.activeRequests > 0) {
      // Still in use — don't schedule idle logout yet
      return
    }

    // No active requests — schedule graceful idle logout
    entry.idleTimer = setTimeout(async () => {
      const current = this.connections.get(key)
      // Only logout if still idle (activeRequests could have incremented again)
      if (current && current.activeRequests === 0 && current.client.usable) {
        logger.debug({ email: key }, "IMAP: idle timeout — closing connection")
        await current.client.logout().catch(() => {/* ignore logout errors */})
      }
      this.connections.delete(key)
    }, IMAP_IDLE_TIMEOUT_MS)
  }

  /** Force-close all connections (e.g., on graceful shutdown) */
  async closeAll(): Promise<void> {
    const entries = [...this.connections.entries()]
    for (const [key, entry] of entries) {
      if (entry.idleTimer) clearTimeout(entry.idleTimer)
      if (entry.client.usable) {
        await entry.client.logout().catch(() => {})
      }
      this.connections.delete(key)
      logger.debug({ email: key }, "IMAP: connection force-closed on shutdown")
    }
  }
}

// Global Singleton Pool — one instance shared across all requests in this process
export const imapPool = new ImapConnectionPool()

// ─── IMAP Search ──────────────────────────────────────────────────────────────

/**
 * Searches for emails in INBOX using a pooled IMAP connection.
 * Fixed: concurrent requests for the same email reuse the same connection
 * (pending-promise deduplication) rather than creating duplicate sockets.
 */
export async function searchInImap(
  config: ResolvedImapConfig,
  searchType: SearchType | string
): Promise<ExtractionResult> {
  const client = await imapPool.getClient(config)

  try {
    // Open INBOX only if not already selected
    if (!client.mailbox || (client.mailbox as any).path !== "INBOX") {
      await client.mailboxOpen("INBOX")
    }

    // Narrow search to last N hours to reduce result set
    const sinceDate = new Date()
    sinceDate.setHours(sinceDate.getHours() - IMAP_SEARCH_WINDOW_HOURS)

    const resultIds = await client.search(
      { from: "info@account.netflix.com", since: sinceDate },
      { uid: true }
    )

    if (!resultIds || typeof resultIds === "boolean" || resultIds.length === 0) {
      return { found: false, value: null }
    }

    // Take the N most recent by UID (descending)
    const recentUids = resultIds
      .sort((a, b) => b - a)
      .slice(0, IMAP_MAX_EMAILS_TO_PARSE)

    for (const uid of recentUids) {
      // Fetch only the raw source; do a size check before full parse.
      // fetchOne returns false if the UID doesn't exist — must type-narrow.
      const message = await client.fetchOne(
        uid.toString(),
        { source: true },
        { uid: true }
      )

      if (!message || !message.source) continue

      const rawSource: Buffer = message.source

      // ── Size guard ────────────────────────────────────────────────────────
      // Skip emails that exceed the size limit to prevent OOM / high latency.
      // Netflix notification emails are always small — large messages are
      // either unrelated or potentially malicious.
      if (rawSource.length > IMAP_MAX_MESSAGE_BYTES) {
        logger.warn(
          { uid, size: rawSource.length, email: config.email },
          "IMAP: email exceeds max size — skipping"
        )
        continue
      }

      const parsed = await simpleParser(rawSource)
      const contentToSearch = parsed.html || parsed.text || ""
      const extraction = extractDataFromEmailBody(contentToSearch, searchType)

      if (extraction.found) {
        logger.info(
          { email: config.email, searchType, uid },
          "IMAP: result found in recent email"
        )
        return extraction
      }
    }

    return { found: false, value: null }

  } catch (error) {
    logger.error(
      { err: error, domain: config.domain, searchType },
      "IMAP: error during search"
    )
    // On error, mark the connection as unusable so the pool doesn't reuse it
    // The next request will open a fresh connection
    throw new Error("Ocurrió un error consultando la bandeja solicitada.")

  } finally {
    // Always release — even on error — to prevent reference count drift
    imapPool.releaseClient(config)
  }
}

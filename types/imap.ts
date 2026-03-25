export interface ImapConfig {
  id: string
  domain: string
  server: string
  port: string
  email: string
  password?: never  // Intentionally omitted by the API — passwords are AES-encrypted and never returned
  createdAt: string
}

export interface CreateImapConfigInput {
  domain: string
  server: string
  port: string
  email: string
  password: string
}

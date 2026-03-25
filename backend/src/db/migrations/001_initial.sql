-- ─── SmarTime — Initial Database Migration ──────────────────────────────────
-- Run with: psql $DATABASE_URL -f src/db/migrations/001_initial.sql
-- Idempotent: uses IF NOT EXISTS / CREATE OR REPLACE where possible

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_status  AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE email_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id     VARCHAR(20) UNIQUE NOT NULL,
  display_name    VARCHAR(100) NOT NULL,
  status          user_status NOT NULL DEFAULT 'active',
  can_search_any  BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);

-- ─── Roles ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL      PRIMARY KEY,
  name        VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── User ↔ Role (many-to-many) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id INT  REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ─── Permissions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── Role ↔ Permission (many-to-many) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INT REFERENCES roles(id)       ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ─── OTP Codes (ephemeral) ────────────────────────────────────────────────────
-- Cleaned daily by a cron or by the service on use/expiry
CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id VARCHAR(20) NOT NULL,
  code_hash   TEXT        NOT NULL,       -- bcrypt(otp)
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN     NOT NULL DEFAULT false,
  attempts    INT         NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,              -- set after OTP_MAX_ATTEMPTS failures
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_codes_telegram_expires
  ON otp_codes (telegram_id, expires_at);

-- ─── Refresh Tokens ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        UNIQUE NOT NULL,   -- bcrypt(token)
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN     NOT NULL DEFAULT false,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active
  ON refresh_tokens (user_id, revoked, expires_at);

-- ─── Emails (per-user allowed email list) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS emails (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES users(id) ON DELETE CASCADE,
  address     VARCHAR(254) NOT NULL,
  verified    BOOLEAN      NOT NULL DEFAULT false,
  status      email_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (user_id, address)
);
CREATE INDEX IF NOT EXISTS idx_emails_address ON emails (address);
CREATE INDEX IF NOT EXISTS idx_emails_user    ON emails (user_id);

-- ─── IMAP Configurations (admin-managed) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS imap_configs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          VARCHAR(253) NOT NULL,
  server          VARCHAR(253) NOT NULL,
  port            INT          NOT NULL DEFAULT 993,
  email           VARCHAR(254) NOT NULL,
  password_enc    TEXT         NOT NULL,  -- AES-256-GCM encrypted; NEVER returned to client
  use_ssl         BOOLEAN      NOT NULL DEFAULT true,
  created_by      UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ,
  UNIQUE (domain, email)
);

-- ─── Audit Log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user       ON audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);

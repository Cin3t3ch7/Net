-- ─── SmarTime — Seed Data ────────────────────────────────────────────────────
-- Run AFTER migration: psql $DATABASE_URL -f src/db/seeds.sql
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING

-- ─── Roles ────────────────────────────────────────────────────────────────────
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrador del sistema con acceso total'),
  ('user',  'Usuario estándar con acceso al dashboard')
ON CONFLICT (name) DO NOTHING;

-- ─── Permissions ──────────────────────────────────────────────────────────────
INSERT INTO permissions (name, description) VALUES
  ('users:read',       'Listar y ver usuarios'),
  ('users:write',      'Crear y editar usuarios'),
  ('users:delete',     'Eliminar usuarios'),
  ('imap:manage',      'Gestionar configuraciones IMAP'),
  ('emails:read',      'Leer correos permitidos propios'),
  ('emails:manage',    'Gestionar correos de cualquier usuario'),
  ('dashboard:access', 'Acceder al dashboard'),
  ('audit:read',       'Leer el log de auditoría')
ON CONFLICT (name) DO NOTHING;

-- ─── Role → Permission assignments ────────────────────────────────────────────
-- admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r CROSS JOIN permissions p
WHERE  r.name = 'admin'
ON CONFLICT DO NOTHING;

-- user gets only dashboard + their own emails
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r JOIN permissions p
       ON p.name IN ('dashboard:access', 'emails:read')
WHERE  r.name = 'user'
ON CONFLICT DO NOTHING;

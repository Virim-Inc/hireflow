-- Up Migration
-- 1. Modify admin_users table
ALTER TABLE admin_users 
  ADD COLUMN pms_user_id VARCHAR(255),
  ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'local',
  ADD COLUMN last_sso_login_at TIMESTAMPTZ,
  ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ALTER COLUMN password_hash DROP NOT NULL;

-- Set default role for existing admin
UPDATE admin_users SET role = 'admin' WHERE email = 'admin@hireflow.com';

-- Constraints
ALTER TABLE admin_users ADD CONSTRAINT unique_pms_user_id UNIQUE (pms_user_id);
ALTER TABLE admin_users ADD CONSTRAINT chk_admin_users_auth_provider CHECK (auth_provider IN ('local', 'pms_sso'));

-- Lowercase unique constraint on email
CREATE UNIQUE INDEX unique_admin_users_email_lower ON admin_users (LOWER(email));

-- 2. Create sso_token_usages table for replay attack checks
CREATE TABLE IF NOT EXISTS sso_token_usages (
  jti VARCHAR(255) PRIMARY KEY,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sso_token_usages_expiry ON sso_token_usages (expires_at);

-- Down Migration
-- ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS unique_pms_user_id;
-- ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS chk_admin_users_auth_provider;
-- DROP INDEX IF EXISTS unique_admin_users_email_lower;
-- DROP TABLE IF EXISTS sso_token_usages;
-- ALTER TABLE admin_users 
--   DROP COLUMN IF EXISTS pms_user_id,
--   DROP COLUMN IF EXISTS auth_provider,
--   DROP COLUMN IF EXISTS last_sso_login_at,
--   DROP COLUMN IF EXISTS role,
--   DROP COLUMN IF EXISTS is_active,
--   DROP COLUMN IF EXISTS is_blocked;

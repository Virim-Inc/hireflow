import { pool } from '../config/db.js';
import type { PoolClient } from 'pg';
import type { AdminUser } from '../types/auth.types.js';

export async function findUserByEmail(email: string): Promise<AdminUser | null> {
  const result = await pool.query<AdminUser>(
    'SELECT id, email, password_hash, name, role, created_at, is_active, is_blocked FROM admin_users WHERE LOWER(email) = LOWER($1)',
    [email.trim()],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: number): Promise<AdminUser | null> {
  const result = await pool.query<AdminUser>(
    'SELECT id, email, password_hash, name, role, created_at, is_active, is_blocked FROM admin_users WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

// ── Transactional methods for SSO ─────────────────────────────────────────────

export async function findUserByPmsIdTx(client: PoolClient, pmsId: string): Promise<AdminUser | null> {
  const result = await client.query<AdminUser>(
    'SELECT id, email, password_hash, name, role, created_at, is_active, is_blocked FROM admin_users WHERE pms_user_id = $1',
    [pmsId]
  );
  return result.rows[0] ?? null;
}

export async function findUsersByEmailTx(client: PoolClient, email: string): Promise<AdminUser[]> {
  const result = await client.query<AdminUser>(
    'SELECT id, email, password_hash, name, role, created_at, is_active, is_blocked, pms_user_id FROM admin_users WHERE LOWER(email) = LOWER($1)',
    [email.trim()]
  );
  return result.rows;
}

export async function linkUserToPmsTx(client: PoolClient, userId: number, pmsId: string): Promise<AdminUser> {
  const result = await client.query<AdminUser>(
    `UPDATE admin_users
     SET pms_user_id = $2, auth_provider = 'pms_sso', password_hash = NULL
     WHERE id = $1
     RETURNING id, email, name, role, is_active, is_blocked`,
    [userId, pmsId]
  );
  return result.rows[0];
}

export async function createUserTx(
  client: PoolClient,
  data: { email: string; pmsUserId: string; name: string; role: string; password_hash: null; auth_provider: string }
): Promise<AdminUser> {
  const result = await client.query<AdminUser>(
    `INSERT INTO admin_users (email, pms_user_id, name, role, password_hash, auth_provider)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, name, role, is_active, is_blocked`,
    [data.email, data.pmsUserId, data.name, data.role, data.password_hash, data.auth_provider]
  );
  return result.rows[0];
}

export async function updateUserRoleTx(client: PoolClient, userId: number, role: string): Promise<void> {
  await client.query(
    'UPDATE admin_users SET role = $2 WHERE id = $1',
    [userId, role]
  );
}

export async function updateLastSsoLoginTx(client: PoolClient, userId: number): Promise<void> {
  await client.query(
    'UPDATE admin_users SET last_sso_login_at = NOW() WHERE id = $1',
    [userId]
  );
}

export async function consumeJtiTx(client: PoolClient, jti: string, expiresAt: Date): Promise<boolean> {
  const res = await client.query(
    `INSERT INTO sso_token_usages (jti, expires_at)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING jti`,
    [jti, expiresAt]
  );
  return res.rowCount !== null && res.rowCount > 0;
}


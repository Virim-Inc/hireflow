import { pool } from '../config/db.js';
import type { AdminUser } from '../types/auth.types.js';

export async function findUserByEmail(email: string): Promise<AdminUser | null> {
  const result = await pool.query<AdminUser>(
    'SELECT id, email, password_hash, name, created_at FROM admin_users WHERE LOWER(email) = LOWER($1)',
    [email.trim()],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: number): Promise<AdminUser | null> {
  const result = await pool.query<AdminUser>(
    'SELECT id, email, password_hash, name, created_at FROM admin_users WHERE id = ',
    [id],
  );
  return result.rows[0] ?? null;
}

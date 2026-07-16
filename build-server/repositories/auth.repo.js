import { pool } from '../config/db.js';
export async function findUserByEmail(email) {
    const result = await pool.query('SELECT id, email, password_hash, name, created_at FROM admin_users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    return result.rows[0] ?? null;
}
export async function findUserById(id) {
    const result = await pool.query('SELECT id, email, password_hash, name, created_at FROM admin_users WHERE id = ', [id]);
    return result.rows[0] ?? null;
}
//# sourceMappingURL=auth.repo.js.map
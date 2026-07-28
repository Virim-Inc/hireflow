import { pool } from '../config/db.js';
export async function findUserByEmail(email) {
    const result = await pool.query('SELECT id, email, password_hash, name, role, created_at, is_active, is_blocked FROM admin_users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    return result.rows[0] ?? null;
}
export async function findUserById(id) {
    const result = await pool.query('SELECT id, email, password_hash, name, role, created_at, is_active, is_blocked FROM admin_users WHERE id = $1', [id]);
    return result.rows[0] ?? null;
}
// ── Transactional methods for SSO ─────────────────────────────────────────────
export async function findUserByPmsIdTx(client, pmsId) {
    const result = await client.query('SELECT id, email, password_hash, name, role, created_at, is_active, is_blocked FROM admin_users WHERE pms_user_id = $1', [pmsId]);
    return result.rows[0] ?? null;
}
export async function findUsersByEmailTx(client, email) {
    const result = await client.query('SELECT id, email, password_hash, name, role, created_at, is_active, is_blocked, pms_user_id FROM admin_users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    return result.rows;
}
export async function linkUserToPmsTx(client, userId, pmsId) {
    const result = await client.query(`UPDATE admin_users
     SET pms_user_id = $2, auth_provider = 'pms_sso', password_hash = NULL
     WHERE id = $1
     RETURNING id, email, name, role, is_active, is_blocked`, [userId, pmsId]);
    return result.rows[0];
}
export async function createUserTx(client, data) {
    const result = await client.query(`INSERT INTO admin_users (email, pms_user_id, name, role, password_hash, auth_provider)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, name, role, is_active, is_blocked`, [data.email, data.pmsUserId, data.name, data.role, data.password_hash, data.auth_provider]);
    return result.rows[0];
}
export async function updateUserRoleTx(client, userId, role) {
    await client.query('UPDATE admin_users SET role = $2 WHERE id = $1', [userId, role]);
}
export async function updateLastSsoLoginTx(client, userId) {
    await client.query('UPDATE admin_users SET last_sso_login_at = NOW() WHERE id = $1', [userId]);
}
export async function consumeJtiTx(client, jti, expiresAt) {
    const res = await client.query(`INSERT INTO sso_token_usages (jti, expires_at)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING jti`, [jti, expiresAt]);
    return res.rowCount !== null && res.rowCount > 0;
}
//# sourceMappingURL=auth.repo.js.map
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { pool } from '../config/db.js';
import * as authRepo from '../repositories/auth.repo.js';
import type { JwtPayload, AuthResponse } from '../types/auth.types.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function login(emailRaw: string, passwordRaw: string): Promise<AuthResponse> {
  const email = (emailRaw ?? '').trim().toLowerCase();
  const password = passwordRaw ?? '';

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required');
  }

  const user = await authRepo.findUserByEmail(email);
  if (!user || !user.password_hash) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  // Sign JWT token valid for 8 hours
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  };
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return decoded;
  } catch (err) {
    throw new HttpError(401, 'Invalid or expired token');
  }
}

export async function getCurrentUser(id: number): Promise<{ id: number; email: string; name: string | null; role: string }> {
  const user = await authRepo.findUserById(id);
  if (!user) {
    throw new HttpError(401, 'User does not exist');
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export interface PmsSsoPayload {
  sub: string;
  email: string;
  name?: string;
  permissions: string[];
  hireflow_role?: string;
  jti: string;
  exp: number;
  iat?: number;
  nbf?: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapPmsRoleToHireFlow(role?: string): string {
  const normalized = (role ?? '').trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'recruiter') return 'admin';
  if (normalized === 'interviewer') return 'user';
  return 'viewer';
}

export async function ssoVerify(token: string): Promise<AuthResponse> {
  let decodedRaw: any;
  try {
    decodedRaw = jwt.verify(token, config.sso.pmsSsoSecret, {
      algorithms: ['HS256'],
      issuer: config.sso.pmsSsoIssuer,
      audience: config.sso.pmsSsoAudience,
      clockTolerance: 5,
    });
  } catch (err: any) {
    throw new HttpError(401, `Authentication failed: Invalid or expired token. (${err.message})`);
  }

  // Extract claims and handle fallbacks for XMLSoap/Microsoft schemas
  const sub = decodedRaw.sub || decodedRaw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
  const email = decodedRaw.email || decodedRaw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
  const name = decodedRaw.name || decodedRaw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
  // const permissions = decodedRaw.permissions || [];

  const permissionsRaw = decodedRaw.permissions;

const permissions =
  Array.isArray(permissionsRaw)
    ? permissionsRaw
    : typeof permissionsRaw === "string"
      ? [permissionsRaw]
      : [];

      
  const hireflow_role = decodedRaw.hireflow_role || decodedRaw['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
  const jti = decodedRaw.jti;
  const exp = decodedRaw.exp;

  // Claim Validation
  if (
    typeof sub !== 'string' || !sub.trim() ||
    typeof email !== 'string' || !email.trim() || !EMAIL_REGEX.test(email) ||
    typeof jti !== 'string' || !jti.trim() ||
    typeof exp !== 'number' ||
    !Array.isArray(permissions)
  ) {
    throw new HttpError(400, 'Authentication failed: Malformed claims.');
  }

  // Linked product check
  if (!permissions.includes('linked_product.hireflow')) {
    throw new HttpError(403, 'Access denied: Missing HireFlow permission.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Consume JTI inside transaction (prevents concurrent replay attacks)
    const isJtiLogged = await authRepo.consumeJtiTx(client, jti, new Date(exp * 1000));
    if (!isJtiLogged) {
      throw new HttpError(401, 'Authentication failed: Token replay detected.');
    }

    // 2. User Lookup and Provisioning
    const normalizedEmail = email.trim().toLowerCase();
    let user = await authRepo.findUserByPmsIdTx(client, sub);

    if (!user) {
      // Find by email to link
      const emailUsers = await authRepo.findUsersByEmailTx(client, normalizedEmail);
      if (emailUsers.length > 1) {
        throw new HttpError(409, 'Authentication failed: Multiple accounts matching email.');
      }
      
      const existingUser = emailUsers[0];
      if (existingUser) {
        if (existingUser.pms_user_id && existingUser.pms_user_id !== sub) {
          throw new HttpError(409, 'Authentication failed: Account already linked to another identity.');
        }
        user = await authRepo.linkUserToPmsTx(client, existingUser.id, sub);
      } else {
        // Provision user (password_hash is explicitly set to null)
        const mappedRole = mapPmsRoleToHireFlow(hireflow_role);
        user = await authRepo.createUserTx(client, {
          email: normalizedEmail,
          pmsUserId: sub,
          name: name || normalizedEmail.split('@')[0],
          role: mappedRole,
          password_hash: null,
          auth_provider: 'pms_sso',
        });
      }
    }

    // 3. Status Validation
    if (user.is_active === false || user.is_blocked === true) {
      throw new HttpError(403, 'Your HireFlow account is inactive.');
    }

    // 4. Role Synchronization (PMS role is authoritative and syncs on login)
    const currentRole = mapPmsRoleToHireFlow(hireflow_role);
    if (user.role !== currentRole) {
      await authRepo.updateUserRoleTx(client, user.id, currentRole);
      user.role = currentRole;
    }

    // 5. Update last login
    await authRepo.updateLastSsoLoginTx(client, user.id);

    await client.query('COMMIT');

    // Preserve native local login session contract payload
    const sessionPayload = { id: user.id, email: user.email, name: user.name, role: user.role };
    const nativeToken = jwt.sign(sessionPayload, config.jwtSecret, { expiresIn: '8h' });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token: nativeToken,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

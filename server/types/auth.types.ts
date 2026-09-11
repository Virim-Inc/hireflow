export interface AdminUser {
  id: number;
  email: string;
  password_hash: string | null;
  name: string | null;
  role: string;
  created_at: string;
  pms_user_id?: string | null;
  auth_provider: 'local' | 'pms_sso';
  is_active: boolean;
  is_blocked: boolean;
}

export interface JwtPayload {
  id: number;
  email: string;
  name: string | null;
  role: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string | null;
    role: string;
  };
  token: string;
}

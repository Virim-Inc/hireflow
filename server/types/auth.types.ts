export interface AdminUser {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
}

export interface JwtPayload {
  id: number;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string | null;
  };
  token: string;
}

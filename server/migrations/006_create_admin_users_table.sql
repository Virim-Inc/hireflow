-- HireFlow - Migration 006: Create admin_users table for dashboard authentication

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default administrator account (Email: admin@hireflow.com, Password: Admin@123)
INSERT INTO admin_users (email, password_hash, name)
VALUES (
  'admin@hireflow.com',
  '$2b$10$pluVR0ipLGlxcNgKRF1pW.Z3pXKvN2UH/z5SL/mESL1CUZMr0bOQO',
  'Administrator'
)
ON CONFLICT (email) DO NOTHING;

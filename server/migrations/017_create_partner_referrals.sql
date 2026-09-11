-- HireFlow - Migration 017: Create partner_companies and candidate_referrals tables

-- 1. Partner Companies Table
CREATE TABLE IF NOT EXISTS partner_companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  website TEXT,
  contact_email VARCHAR(255),
  contact_person VARCHAR(255),
  industry VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed Initial Test Companies
INSERT INTO partner_companies (name, slug, logo_url, website, contact_email, industry, description)
VALUES 
  ('Stripe', 'stripe', 'https://images.ctfassets.net/fzn2n1nzq965/3Aj8y097GgkuUaIqUIISge/8b0c8d172e2569ef816a048a1cb36181/stripe-logo.png', 'https://stripe.com', 'partnerships@stripe.com', 'Fintech / Payments', 'Global financial infrastructure company.'),
  ('Razorpay', 'razorpay', 'https://razorpay.com/assets/razorpay-glyph.svg', 'https://razorpay.com', 'hiring@razorpay.com', 'Fintech / Banking', 'Leading full-stack financial solutions platform in India.'),
  ('Google', 'google', 'https://www.google.com/favicon.ico', 'https://careers.google.com', 'talent@google.com', 'Technology / Internet', 'Multinational technology company focusing on search, cloud, and AI.'),
  ('Databricks', 'databricks', 'https://databricks.com/favicon.ico', 'https://databricks.com', 'recruiting@databricks.com', 'Data & AI', 'Unified data analytics and enterprise AI platform.'),
  ('Zomato', 'zomato', 'https://b.zmtcdn.com/images/logo/zomato_logo_2017.png', 'https://zomato.com', 'careers@zomato.com', 'E-commerce / Food Delivery', 'Online food delivery and restaurant discovery platform.'),
  ('Atlassian', 'atlassian', 'https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png', 'https://atlassian.com', 'referrals@atlassian.com', 'Enterprise Software', 'Collaboration software tools including Jira, Confluence, and Trello.'),
  ('CRED', 'cred', 'https://cred.club/favicon.ico', 'https://cred.club', 'talent@cred.club', 'Fintech', 'Members-only credit card bill payment platform.'),
  ('Microsoft', 'microsoft', 'https://www.microsoft.com/favicon.ico', 'https://careers.microsoft.com', 'university-recruiting@microsoft.com', 'Technology / Cloud', 'Global software and cloud services leader.')
ON CONFLICT (slug) DO NOTHING;

-- 2. Candidate Referrals Table
CREATE TABLE IF NOT EXISTS candidate_referrals (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES partner_companies(id) ON DELETE RESTRICT,
  referred_by_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  rounds_cleared JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_review TEXT NOT NULL,
  key_strengths TEXT,
  suggested_roles VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'shared' CHECK (status IN ('shared', 'under_review', 'interviewing', 'offered', 'hired', 'declined', 'withdrawn')),
  shared_candidate_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Partial Unique Index: Prevent duplicate ACTIVE referrals for same candidate & same company
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_candidate_company_referral 
ON candidate_referrals (candidate_id, company_id) 
WHERE status NOT IN ('declined', 'withdrawn');

-- 3. Candidate Referral Status History Table
CREATE TABLE IF NOT EXISTS candidate_referral_status_history (
  id SERIAL PRIMARY KEY,
  referral_id INTEGER NOT NULL REFERENCES candidate_referrals(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL CHECK (new_status IN ('shared', 'under_review', 'interviewing', 'offered', 'hired', 'declined', 'withdrawn')),
  changed_by_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_referrals_candidate ON candidate_referrals(candidate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_company ON candidate_referrals(company_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON candidate_referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_history_ref ON candidate_referral_status_history(referral_id);

-- ============================================================
-- MIGRATION: Add checkout_id, entitlement_token, PENDING status
-- Run this in Supabase SQL Editor (safe to run on existing DB)
-- ============================================================

-- 1. Add new columns to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS checkout_id       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS entitlement_token TEXT UNIQUE;

-- 2. Extend status check to include PENDING
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('ACTIVE', 'PENDING', 'CANCELLED', 'EXPIRED'));

-- 3. Add index on checkout_id for fast webhook lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_checkout ON subscriptions(checkout_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_external_user ON subscriptions(external_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);

-- 4. Add plan_features table if not exists (normalized feature limits)
CREATE TABLE IF NOT EXISTS plan_features (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL,
  limit_value  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, feature_code)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_code ON plan_features(feature_code);

-- 5. Seed plan_features from the seeded plans and features
-- (Only inserts if plan_features is empty)
INSERT INTO plan_features (plan_id, feature_code, limit_value)
SELECT p.id, 'export', 3
FROM plans p WHERE p.name = 'FREE'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

INSERT INTO plan_features (plan_id, feature_code, limit_value)
SELECT p.id, 'ai_generate', 0
FROM plans p WHERE p.name = 'FREE'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

INSERT INTO plan_features (plan_id, feature_code, limit_value)
SELECT p.id, 'analytics', 5
FROM plans p WHERE p.name = 'FREE'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

INSERT INTO plan_features (plan_id, feature_code, limit_value)
SELECT p.id, 'export', 100
FROM plans p WHERE p.name = 'PRO'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

INSERT INTO plan_features (plan_id, feature_code, limit_value)
SELECT p.id, 'ai_generate', 50
FROM plans p WHERE p.name = 'PRO'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

INSERT INTO plan_features (plan_id, feature_code, limit_value)
SELECT p.id, 'analytics', -1
FROM plans p WHERE p.name = 'PRO'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

INSERT INTO plan_features (plan_id, feature_code, limit_value)
SELECT p.id, 'export', -1
FROM plans p WHERE p.name = 'ENTERPRISE'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

INSERT INTO plan_features (plan_id, feature_code, limit_value)
SELECT p.id, 'ai_generate', -1
FROM plans p WHERE p.name = 'ENTERPRISE'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

INSERT INTO plan_features (plan_id, feature_code, limit_value)
SELECT p.id, 'analytics', -1
FROM plans p WHERE p.name = 'ENTERPRISE'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- 6. Ensure demo features exist in the features table
INSERT INTO features (code, name, is_enabled, usage_tracked) VALUES
  ('export',      'Export PDF',   true, true),
  ('ai_generate', 'AI Generate',  true, true),
  ('analytics',   'Analytics',    true, true)
ON CONFLICT (code) DO NOTHING;

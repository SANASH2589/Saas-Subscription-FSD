-- ============================================================
-- SaaS Subscription & Feature Entitlement Platform Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- NOTE: Supabase auth.users is managed by Supabase Auth.
-- We store extended profile data in user_profiles.

-- ============================================================
-- DROP EXISTING TABLES (clean slate)
-- ============================================================
DROP TABLE IF EXISTS usage_events CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plan_features CASCADE;
DROP TABLE IF EXISTS features CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- ============================================================
-- 1. TENANTS
-- ============================================================
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. USER PROFILES
-- ============================================================
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
  role        TEXT NOT NULL DEFAULT 'end_user'
                CHECK (role IN ('super_admin', 'tenant_admin', 'end_user')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. FEATURES (Global Registry)
-- ============================================================
CREATE TABLE features (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  usage_tracked BOOLEAN NOT NULL DEFAULT false,
  is_enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. PLANS
-- ============================================================
CREATE TABLE plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  description     TEXT,
  price           NUMERIC NOT NULL DEFAULT 0,
  interval        TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (interval IN ('MONTHLY', 'YEARLY')),
  -- feature_limits: { "FEATURE_CODE": limit_number }
  --   -1 = unlimited, 0 = disabled, N = max N uses per month
  feature_limits  JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id     UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status      TEXT NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED')),
  start_date  TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. USAGE EVENTS
-- ============================================================
CREATE TABLE usage_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_code  TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_usage_events_tenant_feature ON usage_events(tenant_id, feature_code);
CREATE INDEX idx_usage_events_created ON usage_events(created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Backend uses service_role key which bypasses RLS.
-- Frontend uses anon key, so we lock everything down.
-- ============================================================
ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE features         ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events     ENABLE ROW LEVEL SECURITY;

-- Allow read-only access to plans and features for authenticated users
CREATE POLICY "plans_read" ON plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "features_read" ON features FOR SELECT TO authenticated USING (true);

-- Users can read their own profile
CREATE POLICY "own_profile_read" ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can read their tenant's subscription
CREATE POLICY "tenant_subscription_read" ON subscriptions FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Users can read their own usage events
CREATE POLICY "own_usage_read" ON usage_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- SEED: Default Plans
-- ============================================================
INSERT INTO plans (name, description, price, interval, feature_limits) VALUES
(
  'FREE',
  'Get started with the basics. No credit card required.',
  0,
  'MONTHLY',
  '{"EXPORT_PDF": 5, "API_ACCESS": 0, "ADVANCED_ANALYTICS": 0, "CUSTOM_BRANDING": 0, "PRIORITY_SUPPORT": 0}'
),
(
  'PRO',
  'For growing teams that need more power and flexibility.',
  49,
  'MONTHLY',
  '{"EXPORT_PDF": 100, "API_ACCESS": -1, "ADVANCED_ANALYTICS": 50, "CUSTOM_BRANDING": 0, "PRIORITY_SUPPORT": 0}'
),
(
  'ENTERPRISE',
  'Full access for large organizations with priority support.',
  199,
  'MONTHLY',
  '{"EXPORT_PDF": -1, "API_ACCESS": -1, "ADVANCED_ANALYTICS": -1, "CUSTOM_BRANDING": -1, "PRIORITY_SUPPORT": -1}'
);

-- ============================================================
-- SEED: Default Features
-- ============================================================
INSERT INTO features (code, name, description, usage_tracked) VALUES
('EXPORT_PDF',           'Export PDF Reports',       'Generate and download PDF reports',              true),
('API_ACCESS',           'Premium API Access',        'Access to the full REST API',                    false),
('ADVANCED_ANALYTICS',   'Advanced Analytics',        'Detailed usage charts and data exports',         true),
('CUSTOM_BRANDING',      'Custom Branding',           'White-label with your own logo and colors',      false),
('PRIORITY_SUPPORT',     'Priority Support',          '24/7 priority support with SLA guarantee',       false);

/**
 * authRoutes.js
 *
 * Authentication routes for the management platform.
 * - /api/auth/admin/signup   — Create a Super Admin
 * - /api/auth/admin/login    — Login as Super Admin
 * - /api/auth/tenant/signup  — Register a Tenant Admin (+ creates tenant + default API key)
 * - /api/auth/tenant/login   — Login as Tenant Admin
 * - /api/auth/me             — Get current user profile (JWT required)
 * - /api/auth/logout         — Logout (JWT required)
 *
 * NOTE: End-user auth is NOT in this system. This is an API-first platform.
 *       External users are identified via external_user_id, not Supabase auth.
 */

const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { createClient } = require('@supabase/supabase-js');
const { authenticate } = require('../middleware/authMiddleware');
const { generateApiKey } = require('../services/apiKeyService');

// Create a dedicated client for auth so we don't mutate the singleton admin client
const supabaseAuthClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ══════════════════════════════════════════════════════════════
// SUPER ADMIN AUTH
// ══════════════════════════════════════════════════════════════

/**
 * POST /api/auth/admin/signup
 * Creates a Super Admin account (should be called once for platform bootstrap).
 */
router.post('/admin/signup', async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return res.status(400).json({ error: authError.message });
  const authUser = authData.user;

  const { error: profileError } = await supabase.from('user_profiles').insert([{
    id: authUser.id,
    email,
    full_name: full_name || '',
    tenant_id: null,
    role: 'super_admin',
  }]);

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.id);
    return res.status(500).json({ error: 'Profile creation failed', details: profileError.message });
  }

  const { data: loginResult, error: loginError } = await supabaseAuthClient.auth.signInWithPassword({ email, password });
  if (loginError) return res.status(401).json({ error: loginError.message });

  return res.status(201).json({
    user: { id: authUser.id, email, full_name: full_name || '', role: 'super_admin' },
    session: loginResult.session,
  });
});

/**
 * POST /api/auth/admin/login
 */
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const { data, error } = await supabaseAuthClient.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', data.user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied: super_admin role required' });
  }

  return res.json({
    user: { id: data.user.id, email: data.user.email, full_name: profile.full_name, role: profile.role },
    session: data.session,
  });
});

// ══════════════════════════════════════════════════════════════
// TENANT ADMIN AUTH
// ══════════════════════════════════════════════════════════════

/**
 * POST /api/auth/tenant/signup
 * Registers a Tenant Admin:
 *  1. Creates Supabase auth user
 *  2. Creates tenant record
 *  3. Creates user_profile with tenant_admin role
 *  4. Creates FREE subscription for tenant
 *  5. Generates default API key (returned once)
 */
router.post('/tenant/signup', async (req, res) => {
  const { email, password, full_name, company_name } = req.body;
  if (!email || !password || !company_name) {
    return res.status(400).json({ error: 'email, password, and company_name are required' });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return res.status(400).json({ error: authError.message });
  const authUser = authData.user;

  try {
    // 1. Create tenant
    const slug = `${company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([{ name: company_name, slug }])
      .select()
      .single();

    if (tenantError) throw new Error('Tenant creation failed: ' + tenantError.message);

    // 2. Create user profile
    const { error: profileError } = await supabase.from('user_profiles').insert([{
      id: authUser.id,
      email,
      full_name: full_name || '',
      tenant_id: tenant.id,
      role: 'tenant_admin',
    }]);

    if (profileError) throw new Error('Profile creation failed: ' + profileError.message);

    // 3. Subscribe tenant to FREE plan
    const { data: freePlan } = await supabase
      .from('plans')
      .select('id')
      .eq('name', 'FREE')
      .single();

    if (freePlan) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      await supabase.from('subscriptions').insert([{
        tenant_id: tenant.id,
        external_user_id: null,
        plan_id: freePlan.id,
        status: 'ACTIVE',
        end_date: endDate.toISOString(),
      }]);
    }

    // 4. Generate default API key
    const apiKeyData = await generateApiKey(tenant.id, 'Production Key');

    // 5. Sign in to get session
    const { data: loginResult, error: loginError } = await supabaseAuthClient.auth.signInWithPassword({ email, password });
    if (loginError) throw new Error('Login failed: ' + loginError.message);

    return res.status(201).json({
      user: {
        id: authUser.id,
        email,
        full_name: full_name || '',
        role: 'tenant_admin',
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        tenant_slug: tenant.slug,
      },
      session: loginResult.session,
      api_key: apiKeyData.rawKey, // Shown ONCE — save it!
    });
  } catch (err) {
    await supabase.auth.admin.deleteUser(authUser.id).catch(() => {});
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/tenant/login
 */
router.post('/tenant/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const { data, error } = await supabaseAuthClient.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, full_name, tenants(id, name, slug)')
    .eq('id', data.user.id)
    .single();

  if (profile?.role !== 'tenant_admin') {
    return res.status(403).json({ error: 'Access denied: tenant_admin role required' });
  }

  return res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name: profile.full_name,
      role: profile.role,
      tenant_id: profile.tenant_id,
      tenant_name: profile.tenants?.name,
      tenant_slug: profile.tenants?.slug,
    },
    session: data.session,
  });
});

// ══════════════════════════════════════════════════════════════
// UNIFIED LOGIN (role-agnostic — used by /login page)
// POST /api/auth/login
// Tries both roles, returns the correct one
// ══════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[LOGIN ATTEMPT] Email: ${email}`);
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const { data, error } = await supabaseAuthClient.auth.signInWithPassword({ email, password });
  console.log(`[SUPABASE RESPONSE] error:`, error ? error.message : 'none');
  if (error) return res.status(401).json({ error: error.message });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, full_name, tenants(id, name, slug)')
    .eq('id', data.user.id)
    .single();

  if (!profile) {
    return res.status(403).json({ error: 'No profile found. Contact platform administrator.' });
  }

  if (profile.role === 'end_user') {
    return res.status(403).json({ error: 'End users do not have access to this platform.' });
  }

  console.log(`[SESSION/TOKEN] Length: ${data.session?.access_token?.length || 0}`);

  return res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name: profile.full_name,
      role: profile.role,
      tenant_id: profile.tenant_id || null,
      tenant_name: profile.tenants?.name || null,
      tenant_slug: profile.tenants?.slug || null,
    },
    session: data.session,
    token: data.session?.access_token,
  });
});

// ══════════════════════════════════════════════════════════════
// SHARED ROUTES
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/auth/me — Get current user with subscription info
 */
router.get('/me', authenticate, async (req, res) => {
  console.log('[AUTH/ME] Request received, user id:', req.user?.id);

  // Safety: abort if no user attached by middleware
  if (!req.user?.id) {
    console.error('[AUTH/ME] No user on request after authenticate middleware');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, tenant_id, full_name, email, created_at, tenants(id, name, slug)')
      .eq('id', req.user.id)
      .single();

    if (profileError) {
      console.error('[AUTH/ME] Profile query error:', profileError.message);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    let subscription = null;
    if (profile?.tenant_id) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, status, start_date, end_date, plans(id, name, description, price, interval, feature_limits)')
        .eq('tenant_id', profile.tenant_id)
        .is('external_user_id', null)
        .eq('status', 'ACTIVE')
        .limit(1);

      if (sub && sub.length > 0) {
        subscription = {
          id: sub[0].id,
          status: sub[0].status,
          start_date: sub[0].start_date,
          end_date: sub[0].end_date,
          plan: sub[0].plans,
        };
      }
    }

    const user = {
      id: req.user.id,
      email: profile?.email || req.user.email,
      full_name: profile?.full_name || '',
      role: profile?.role || 'unknown',
      tenant_id: profile?.tenant_id || null,
      tenant_name: profile?.tenants?.name || '',
      tenant_slug: profile?.tenants?.slug || '',
      created_at: profile?.created_at,
    };

    console.log('[AUTH/ME] Returning profile, role:', user.role);
    return res.json({ success: true, user, subscription });
  } catch (err) {
    console.error('[AUTH/ME] Unexpected error:', err);
    return res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    await supabaseAuthClient.auth.signOut();
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;

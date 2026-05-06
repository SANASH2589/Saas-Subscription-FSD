/**
 * superAdminRoutes.js
 *
 * Management endpoints for the SUPER ADMIN dashboard.
 * All routes require: JWT (Bearer) + super_admin role.
 * Base path: /api/admin
 */

const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { authenticate, requireSuperAdmin } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(requireSuperAdmin);

// ─────────────────────────────────────────────────────────────
// PLATFORM OVERVIEW
// GET /api/admin/overview
// ─────────────────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const [tenantsRes, usageRes, subsRes, plansRes] = await Promise.all([
      supabase.from('tenants').select('id', { count: 'exact', head: true }),
      supabase.from('usage_events').select('id', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabase.from('plans').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    res.json({
      totalTenants: tenantsRes.count || 0,
      totalApiEvents: usageRes.count || 0,
      activeSubscriptions: subsRes.count || 0,
      activePlans: plansRes.count || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// TENANTS
// ─────────────────────────────────────────────────────────────

// GET /api/admin/tenants — List all tenants with stats
router.get('/tenants', async (req, res) => {
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Enrich with subscription and usage counts
    const enriched = await Promise.all(tenants.map(async (tenant) => {
      const [subRes, usageRes, keyRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('plans(name, price)')
          .eq('tenant_id', tenant.id)
          .eq('status', 'ACTIVE')
          .is('external_user_id', null)
          .maybeSingle(),
        supabase
          .from('usage_events')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id),
        supabase
          .from('api_keys')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('status', 'active'),
      ]);

      return {
        ...tenant,
        current_plan: subRes.data?.plans?.name || 'None',
        api_events: usageRes.count || 0,
        active_keys: keyRes.count || 0,
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/tenants/:id — Soft-deactivate a tenant (future use)
router.delete('/tenants/:id', async (req, res) => {
  // For safety, we don't hard-delete. Just return a note.
  res.json({ message: 'Tenant deactivation not yet implemented. Use Supabase console to remove tenants.' });
});

// ─────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────

// GET /api/admin/users — List all admin/tenant users
router.get('/users', async (req, res) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, tenants(name, slug)')
    .in('role', ['super_admin', 'tenant_admin'])
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─────────────────────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────────────────────

// GET /api/admin/plans
router.get('/plans', async (req, res) => {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('price', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/admin/plans
router.post('/plans', async (req, res) => {
  const { name, description, price, interval, feature_limits } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabase
    .from('plans')
    .insert([{
      name,
      description: description || `The ${name} plan`,
      price: parseFloat(price) || 0,
      interval: interval || 'MONTHLY',
      feature_limits: feature_limits || {},
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/admin/plans/:id
router.put('/plans/:id', async (req, res) => {
  const { name, description, price, interval, feature_limits, is_active } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = parseFloat(price);
  if (interval !== undefined) updates.interval = interval;
  if (feature_limits !== undefined) updates.feature_limits = feature_limits;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('plans')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/admin/plans/:id — Soft delete (set is_active: false)
router.delete('/plans/:id', async (req, res) => {
  const { error } = await supabase
    .from('plans')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Plan deactivated successfully' });
});

// ─────────────────────────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────────────────────────

// GET /api/admin/features
router.get('/features', async (req, res) => {
  const { data, error } = await supabase
    .from('features')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/admin/features
router.post('/features', async (req, res) => {
  const { code, name, description, usage_tracked } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' });

  const { data, error } = await supabase
    .from('features')
    .insert([{
      code: code.toUpperCase().replace(/\s+/g, '_'),
      name,
      description,
      usage_tracked: !!usage_tracked,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/admin/features/:id
router.put('/features/:id', async (req, res) => {
  const { name, description, is_enabled, usage_tracked } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (is_enabled !== undefined) updates.is_enabled = is_enabled;
  if (usage_tracked !== undefined) updates.usage_tracked = usage_tracked;

  const { data, error } = await supabase
    .from('features')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─────────────────────────────────────────────────────────────
// PLAN FEATURES ASSIGNMENT
// POST /api/admin/plan-features
// ─────────────────────────────────────────────────────────────
router.post('/plan-features', async (req, res) => {
  const { plan_id, feature_limits } = req.body;
  if (!plan_id || !feature_limits) {
    return res.status(400).json({ error: 'plan_id and feature_limits are required' });
  }

  const { data, error } = await supabase
    .from('plans')
    .update({ feature_limits, updated_at: new Date().toISOString() })
    .eq('id', plan_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─────────────────────────────────────────────────────────────
// GLOBAL USAGE ANALYTICS
// GET /api/admin/usage
// ─────────────────────────────────────────────────────────────
router.get('/usage', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usage_events')
      .select('id, feature_code, tenant_id, external_user_id, count, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return res.status(500).json({ error: error.message });

    const byFeature = {};
    const byTenant = {};
    const daily = {};

    data.forEach(event => {
      const cnt = event.count || 1;
      byFeature[event.feature_code] = (byFeature[event.feature_code] || 0) + cnt;
      byTenant[event.tenant_id] = (byTenant[event.tenant_id] || 0) + cnt;
      const day = event.created_at.split('T')[0];
      daily[day] = (daily[day] || 0) + cnt;
    });

    res.json({ totalEvents: data.length, byFeature, byTenant, daily });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

/**
 * tenantMgmtRoutes.js
 *
 * Management endpoints for the TENANT ADMIN dashboard.
 * All routes require a valid JWT (Bearer token) with tenant_admin role.
 * Base path: /api/tenant
 */

const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { generateApiKey, revokeApiKey } = require('../services/apiKeyService');
const { subscribeToPlan, getActiveSubscription } = require('../services/subscriptionService');

// All routes in this file require tenant_admin
router.use(authenticate);
router.use(requireRole('tenant_admin'));

// ─────────────────────────────────────────────────────────────
// OVERVIEW / STATS
// GET /api/tenant/overview
// ─────────────────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [keysRes, subsRes, userSubsRes, usageRes] = await Promise.all([
      supabase.from('api_keys').select('id, status').eq('tenant_id', tenantId),
      // Internal (tenant-level) subscription
      supabase
        .from('subscriptions')
        .select('id, status, plans(name, price)')
        .eq('tenant_id', tenantId)
        .is('external_user_id', null)
        .eq('status', 'ACTIVE'),
      // External user subscriptions (these drive revenue)
      supabase
        .from('subscriptions')
        .select('id, status, plans(name, price)')
        .eq('tenant_id', tenantId)
        .not('external_user_id', 'is', null)
        .eq('status', 'ACTIVE'),
      supabase
        .from('usage_events')
        .select('id, external_user_id, feature_code, count')
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfMonth.toISOString()),
    ]);

    const activeKeys = (keysRes.data || []).filter(k => k.status === 'active').length;
    const totalKeys = (keysRes.data || []).length;
    const activeUsers = new Set((usageRes.data || []).map(e => e.external_user_id)).size;
    const apiCalls = (usageRes.data || []).reduce((sum, e) => sum + (e.count || 1), 0);
    const tenantSub = (subsRes.data || [])[0] || null;
    const activeSubscriptions = (userSubsRes.data || []).length;

    // Revenue estimate: sum of plan prices for all active user subscriptions
    const revenueEstimate = (userSubsRes.data || []).reduce((sum, s) => sum + (s.plans?.price || 0), 0);

    // Most used features
    const featureUsage = {};
    (usageRes.data || []).forEach(e => {
      featureUsage[e.feature_code] = (featureUsage[e.feature_code] || 0) + (e.count || 1);
    });

    res.json({
      activeKeys,
      totalKeys,
      activeUsers,
      apiCallsThisMonth: apiCalls,
      activeSubscriptions,
      revenueEstimate,
      featureUsage,
      currentPlan: tenantSub?.plans?.name || 'None',
      currentPlanPrice: tenantSub?.plans?.price || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// API KEYS
// ─────────────────────────────────────────────────────────────

// GET /api/tenant/api-keys
router.get('/api-keys', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, status, created_at, last_used_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tenant/api-keys/generate
router.post('/api-keys/generate', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'No tenant associated with this account' });

    const { name } = req.body;
    const result = await generateApiKey(tenantId, name || `Key-${Date.now().toString(36)}`);

    res.status(201).json({
      id: result.id,
      name: result.name,
      status: result.status,
      created_at: result.created_at,
      rawKey: result.rawKey, // Only returned once!
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tenant/api-keys/:id
router.delete('/api-keys/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'No tenant associated with this account' });

    await revokeApiKey(tenantId, req.params.id);
    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PLANS (read-only for tenant admins)
// GET /api/tenant/plans
router.get('/plans', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tenant/plans
router.post('/plans', async (req, res) => {
  try {
    const { name, price } = req.body;
    const { data, error } = await supabase.from('plans').insert([{ name, price: parseFloat(price) || 0, is_active: true }]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// FEATURES (read-only for tenant admins)
// GET /api/tenant/features
router.get('/features', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .eq('is_enabled', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tenant/features
router.post('/features', async (req, res) => {
  try {
    const { code, name } = req.body;
    const { data, error } = await supabase.from('features').insert([{ code, name, is_enabled: true }]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PLAN FEATURES
// ─────────────────────────────────────────────────────────────
router.get('/plan-features', async (req, res) => {
  try {
    const { data, error } = await supabase.from('plan_features').select('*, plans(name)');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/plan-features', async (req, res) => {
  try {
    const { plan_id, feature_code, limit_value } = req.body;
    const { data, error } = await supabase.from('plan_features').upsert([{ plan_id, feature_code, limit_value }]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// SUBSCRIPTIONS (tenant admin manages external user subscriptions)
// ─────────────────────────────────────────────────────────────

// GET /api/tenant/subscriptions — list all subscriptions for this tenant
router.get('/subscriptions', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, plans(id, name, price, interval)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tenant/subscriptions — assign a plan to an external user
router.post('/subscriptions', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { plan_id, external_user_id } = req.body;

    if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });
    if (!external_user_id) return res.status(400).json({ error: 'external_user_id is required' });

    const subscription = await subscribeToPlan(tenantId, plan_id, external_user_id);
    res.status(201).json(subscription);
  } catch (err) {
    console.error("Subscription Error:", err);
    res.status(500).json({ error: err.message, details: err.details, code: err.code });
  }
});

// DELETE /api/tenant/subscriptions/:external_user_id — cancel a user's subscription
router.delete('/subscriptions/:external_user_id', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { external_user_id } = req.params;

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('external_user_id', external_user_id)
      .eq('status', 'ACTIVE')
      .select()
      .single();

    if (error) return res.status(404).json({ error: 'No active subscription found for this user' });
    res.json({ message: 'Subscription cancelled', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// USAGE ANALYTICS
// GET /api/tenant/usage — usage stats for this tenant
// ─────────────────────────────────────────────────────────────
router.get('/usage', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { days = 30 } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const { data, error } = await supabase
      .from('usage_events')
      .select('feature_code, external_user_id, count, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Aggregate by feature
    const byFeature = {};
    const byUser = {};
    const daily = {};

    data.forEach(row => {
      const cnt = row.count || 1;
      byFeature[row.feature_code] = (byFeature[row.feature_code] || 0) + cnt;
      byUser[row.external_user_id] = (byUser[row.external_user_id] || 0) + cnt;

      const day = row.created_at.split('T')[0];
      daily[day] = (daily[day] || 0) + cnt;
    });

    res.json({
      totalEvents: data.length,
      byFeature,
      byUser,
      daily,
      raw: data.slice(0, 100), // Latest 100 events
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// API LOGS (recent API calls for this tenant)
// GET /api/tenant/logs
// ─────────────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from('usage_events')
      .select('id, feature_code, external_user_id, count, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

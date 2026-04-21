const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { checkAccess, trackUsage } = require('../services/entitlementService');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────────

// GET /features — list all features (authenticated)
router.get('/features', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('features')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /features — create feature (admin only)
router.post('/features', authenticate, requireRole('tenant_admin', 'super_admin'), async (req, res) => {
  const { code, name, description, usage_tracked } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' });

  const { data, error } = await supabase
    .from('features')
    .insert([{ code: code.toUpperCase(), name, description, usage_tracked: !!usage_tracked }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /features/:id — toggle enabled / update (admin only)
router.put('/features/:id', authenticate, requireRole('tenant_admin', 'super_admin'), async (req, res) => {
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

// ─────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────

// GET /plans — list all active plans (authenticated)
router.get('/plans', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /plans/:id — get a single plan
router.get('/plans/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Plan not found' });
  res.json(data);
});

// POST /plans — create plan (admin only)
router.post('/plans', authenticate, requireRole('tenant_admin', 'super_admin'), async (req, res) => {
  const { name, description, price, interval, feature_limits } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabase
    .from('plans')
    .insert([{
      name,
      description: description || `The ${name} plan`,
      price: parseFloat(price) || 0,
      interval: interval || 'MONTHLY',
      feature_limits: feature_limits || {}
    }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /plans/:id — update plan (admin only)
router.put('/plans/:id', authenticate, requireRole('tenant_admin', 'super_admin'), async (req, res) => {
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

// DELETE /plans/:id — soft delete (admin only)
router.delete('/plans/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  const { error } = await supabase
    .from('plans')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Plan deactivated successfully' });
});

// ─────────────────────────────────────────────
// ENTITLEMENT
// ─────────────────────────────────────────────

// GET /check-access?featureCode=EXPORT_PDF (authenticated)
router.get('/check-access', authenticate, async (req, res) => {
  try {
    const { featureCode } = req.query;
    if (!featureCode) return res.status(400).json({ error: 'featureCode is required' });
    const result = await checkAccess(req.user.id, featureCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /track-usage (authenticated)
router.post('/track-usage', authenticate, async (req, res) => {
  try {
    const featureCode = req.body.featureCode || req.query.featureCode;
    if (!featureCode) return res.status(400).json({ error: 'featureCode is required' });
    if (!req.user.tenant_id) return res.status(400).json({ error: 'User has no tenant' });

    await trackUsage(req.user.id, req.user.tenant_id, featureCode);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// USAGE STATS
// ─────────────────────────────────────────────

// GET /usage/stats — current month usage for this tenant
router.get('/usage/stats', authenticate, async (req, res) => {
  try {
    if (!req.user.tenant_id) return res.status(400).json({ error: 'User has no tenant' });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('usage_events')
      .select('feature_code')
      .eq('tenant_id', req.user.tenant_id)
      .gte('created_at', startOfMonth.toISOString());

    if (error) return res.status(500).json({ error: error.message });

    // Group by feature_code
    const stats = data.reduce((acc, row) => {
      acc[row.feature_code] = (acc[row.feature_code] || 0) + 1;
      return acc;
    }, {});

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { trackUsage } = require('../services/entitlementService');
const { authenticate } = require('../middleware/authMiddleware');
const supabase = require('../supabaseAdmin');

/**
 * POST /api/usage/track
 */
router.post('/track', authenticate, async (req, res) => {
  try {
    const { featureCode } = req.body;
    if (!featureCode) return res.status(400).json({ error: 'featureCode is required' });
    if (!req.user.tenantId) return res.status(400).json({ error: 'User has no tenant' });

    await trackUsage(req.user.id, req.user.tenantId, featureCode);
    res.json({ success: true });
  } catch (err) {
    console.error('[Usage Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/usage/me
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    if (!req.user.tenantId) return res.status(400).json({ error: 'User has no tenant' });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('usage_events')
      .select('feature_code')
      .eq('tenant_id', req.user.tenantId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) return res.status(500).json({ error: error.message });

    // Group by feature_code
    const stats = data.reduce((acc, row) => {
      acc[row.feature_code] = (acc[row.feature_code] || 0) + 1;
      return acc;
    }, {});

    console.log(`[Usage] Fetched stats for tenant: ${req.user.tenantId}`);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

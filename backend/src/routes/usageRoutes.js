const express = require('express');
const router = express.Router();
const { trackUsage } = require('../services/entitlementService');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { rateLimiter } = require('../middleware/rateLimiter');
const supabase = require('../supabaseAdmin');

/**
 * POST /api/v1/usage/track
 */
router.post('/track', apiKeyAuth, rateLimiter, async (req, res) => {
  try {
    const { featureCode, external_user_id, count = 1 } = req.body;
    const tenantId = req.tenantId;

    if (!featureCode) return res.status(400).json({ error: 'featureCode is required' });
    if (!external_user_id) return res.status(400).json({ error: 'external_user_id is required' });

    await trackUsage(tenantId, external_user_id, featureCode, count);
    res.json({ success: true });
  } catch (err) {
    console.error('[Usage Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/usage/:external_user_id
 */
router.get('/:external_user_id', apiKeyAuth, rateLimiter, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const externalUserId = req.params.external_user_id;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('usage_events')
      .select('feature_code, count')
      .eq('tenant_id', tenantId)
      .eq('external_user_id', externalUserId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) return res.status(500).json({ error: error.message });

    // Group by feature_code
    const stats = data.reduce((acc, row) => {
      acc[row.feature_code] = (acc[row.feature_code] || 0) + (row.count || 1);
      return acc;
    }, {});

    console.log(`[Usage] Fetched stats for tenant: ${tenantId}, user: ${externalUserId}`);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

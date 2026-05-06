const express = require('express');
const router = express.Router();
const { checkAccess, trackUsage } = require('../services/entitlementService');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { rateLimiter } = require('../middleware/rateLimiter');

/**
 * POST /api/v1/check-access
 */
router.post('/check-access', apiKeyAuth, rateLimiter, async (req, res) => {
  try {
    const { featureCode, feature, feature_code, external_user_id } = req.body;
    const actualFeature = feature || featureCode || feature_code;
    const tenantId = req.tenantId;

    if (!actualFeature) return res.status(400).json({ error: 'feature_code is required' });
    if (!external_user_id) return res.status(400).json({ error: 'external_user_id is required' });
    
    console.log(`[Entitlement] Check access for tenant ${tenantId}, user ${external_user_id} on feature ${actualFeature}`);
    const result = await checkAccess(tenantId, external_user_id, actualFeature);
    
    if (result.allowed) {
      await trackUsage(tenantId, external_user_id, actualFeature, 1).catch(err => {
        console.error('[Usage Tracking Error]:', err);
      });
    }

    res.json(result);
  } catch (err) {
    console.error('[Entitlement Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

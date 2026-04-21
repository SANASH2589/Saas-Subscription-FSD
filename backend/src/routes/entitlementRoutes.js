const express = require('express');
const router = express.Router();
const { checkAccess } = require('../services/entitlementService');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * POST /api/entitlement/check-access
 */
router.post('/check-access', authenticate, async (req, res) => {
  try {
    const { featureCode } = req.body;
    if (!featureCode) return res.status(400).json({ error: 'featureCode is required' });
    
    // Step 6: Test manually includes check-access
    console.log(`[Entitlement] Check access for ${req.user.email} on feature ${featureCode}`);
    const result = await checkAccess(req.user.id, featureCode);
    res.json(result);
  } catch (err) {
    console.error('[Entitlement Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

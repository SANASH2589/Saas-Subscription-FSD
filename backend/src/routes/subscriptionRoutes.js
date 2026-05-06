const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { rateLimiter } = require('../middleware/rateLimiter');
const { idempotency } = require('../middleware/idempotency');
const { subscribeToPlan, upgradePlan, cancelSubscription, getActiveSubscription } = require('../services/subscriptionService');

/**
 * GET /api/v1/subscriptions/:external_user_id?
 * Returns the active subscription with plan details.
 * If external_user_id is omitted, gets the tenant-level subscription.
 */
router.get('/:external_user_id?', apiKeyAuth, rateLimiter, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const externalUserId = req.params.external_user_id || null;

    const sub = await getActiveSubscription(tenantId, externalUserId);
    res.json(sub || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/subscriptions
 * Subscribe to a plan. Requires Idempotency-Key header.
 */
router.post('/', apiKeyAuth, rateLimiter, idempotency, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { plan_id, external_user_id } = req.body;
    
    if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

    const subscription = await subscribeToPlan(tenantId, plan_id, external_user_id || null);
    res.status(201).json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/subscriptions/upgrade
 * Upgrade or downgrade the plan
 */
router.put('/upgrade', apiKeyAuth, rateLimiter, idempotency, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { plan_id, external_user_id } = req.body;
    
    if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

    const subscription = await upgradePlan(tenantId, plan_id, external_user_id || null);
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/v1/subscriptions
 * Cancel the active subscription
 */
router.delete('/', apiKeyAuth, rateLimiter, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { external_user_id } = req.body; // Using body for DELETE or query param? Body is fine.

    const subscription = await cancelSubscription(tenantId, external_user_id || null);
    res.json({ message: 'Subscription cancelled successfully', subscription });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

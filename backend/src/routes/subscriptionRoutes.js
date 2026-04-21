const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { subscribeToPlan, upgradePlan, cancelSubscription, getActiveSubscription } = require('../services/subscriptionService');

/**
 * GET /api/subscriptions/me
 * Returns the current tenant's active subscription with plan details
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    if (!req.user.tenantId) {
      return res.status(400).json({ error: 'User has no associated tenant' });
    }
    const sub = await getActiveSubscription(req.user.tenantId);
    res.json(sub || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/subscriptions/subscribe
 * Subscribe the current tenant to a plan
 */
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    if (!req.user.tenantId) {
      return res.status(400).json({ error: 'User has no associated tenant' });
    }
    const { plan_id } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

    const subscription = await subscribeToPlan(req.user.tenantId, plan_id);
    res.status(201).json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/subscriptions/upgrade
 * Upgrade or downgrade the current tenant's plan
 */
router.put('/upgrade', authenticate, async (req, res) => {
  try {
    if (!req.user.tenantId) {
      return res.status(400).json({ error: 'User has no associated tenant' });
    }
    const { plan_id } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

    const subscription = await upgradePlan(req.user.tenantId, plan_id);
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/subscriptions/cancel
 * Cancel the current tenant's active subscription
 */
router.put('/cancel', authenticate, async (req, res) => {
  try {
    if (!req.user.tenantId) {
      return res.status(400).json({ error: 'User has no associated tenant' });
    }
    const subscription = await cancelSubscription(req.user.tenantId);
    res.json({ message: 'Subscription cancelled successfully', subscription });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

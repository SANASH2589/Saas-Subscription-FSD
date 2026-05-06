/**
 * checkoutRoutes.js
 *
 * POST /api/v1/create-checkout  — creates a pending subscription + returns simulated checkout URL
 * POST /api/webhooks/payment-success — activates subscription after payment
 */

const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { randomUUID } = require('crypto');

// ─────────────────────────────────────────────────────────────
// POST /api/v1/create-checkout
// Called by external app when user selects a plan.
// Creates a PENDING subscription + returns simulated checkout URL.
// ─────────────────────────────────────────────────────────────
router.post('/create-checkout', apiKeyAuth, async (req, res) => {
  try {
    const { external_user_id, plan_id } = req.body;
    const tenant_id = req.tenantId;

    if (!external_user_id || !plan_id) {
      return res.status(400).json({ error: 'external_user_id and plan_id are required' });
    }

    // Verify plan exists
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('id, name, price')
      .eq('id', plan_id)
      .single();

    if (planErr || !plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Cancel any existing PENDING or ACTIVE subscription for this user
    await supabase
      .from('subscriptions')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenant_id)
      .eq('external_user_id', external_user_id)
      .in('status', ['PENDING', 'ACTIVE']);

    // Create PENDING subscription
    const checkout_id = randomUUID();
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .insert([{
        tenant_id,
        external_user_id,
        plan_id,
        status: 'PENDING',
        checkout_id,
        start_date: new Date().toISOString(),
      }])
      .select()
      .single();

    if (subErr) throw subErr;

    // Simulated payment URL — in production this would be a Razorpay/Stripe URL
    const payment_url = `http://localhost:3000/demo-app/checkout?checkout_id=${checkout_id}&plan=${encodeURIComponent(plan.name)}&price=${plan.price}&user=${external_user_id}`;

    console.log(`[CHECKOUT] Created checkout ${checkout_id} for user ${external_user_id}, plan ${plan.name}`);

    res.json({
      success: true,
      checkout_id,
      payment_url,
      plan: plan.name,
      price: plan.price,
      external_user_id,
    });
  } catch (err) {
    console.error('[CHECKOUT] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

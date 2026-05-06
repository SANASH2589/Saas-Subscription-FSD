/**
 * webhookRoutes.js
 *
 * POST /api/webhooks/payment-success
 *
 * Called after payment gateway confirms payment.
 * Activates the subscription and generates an entitlement token.
 *
 * Requires x-api-key header to resolve tenant_id.
 */

const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { randomUUID } = require('crypto');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/payment-success
// Activates subscription on successful payment
// ─────────────────────────────────────────────────────────────
router.post('/payment-success', apiKeyAuth, async (req, res) => {
  try {
    const { external_user_id, plan_id, payment_status, checkout_id } = req.body;
    const tenant_id = req.tenantId;

    console.log('[WEBHOOK] payment-success received:', { tenant_id, external_user_id, plan_id, payment_status, checkout_id });

    // Validate tenant_id resolved from API key
    if (!tenant_id) {
      return res.status(400).json({ success: false, error: 'Tenant ID missing from API key' });
    }

    if (payment_status !== 'success') {
      return res.json({ success: false, message: 'Payment not successful, no action taken' });
    }

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

    // Cancel any existing ACTIVE/PENDING subscriptions for this user under this tenant
    await supabase
      .from('subscriptions')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenant_id)
      .eq('external_user_id', external_user_id)
      .in('status', ['PENDING', 'ACTIVE']);

    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day billing cycle

    const entitlement_token = randomUUID();

    console.log('[WEBHOOK] Creating subscription:', { tenant_id, external_user_id, plan_id: plan.id });

    // Create a fresh ACTIVE subscription
    const { data: sub, error: createErr } = await supabase
      .from('subscriptions')
      .insert([{
        tenant_id,
        external_user_id,
        plan_id: plan.id,
        status: 'ACTIVE',
        start_date: startDate.toISOString(),
        end_date: expiresAt.toISOString(),
        entitlement_token,
        checkout_id: checkout_id || randomUUID(),
      }])
      .select('*, plans(id, name, price)')
      .single();

    if (createErr) {
      console.error('[WEBHOOK] Insert error:', createErr);
      throw createErr;
    }

    console.log(`[WEBHOOK] Subscription activated: id=${sub.id}, user=${external_user_id}, plan=${sub.plans?.name}, expires=${expiresAt.toISOString()}`);

    return res.json({
      success: true,
      message: 'Subscription activated',
      subscription: {
        id: sub.id,
        status: sub.status,
        plan: sub.plans?.name,
        price: sub.plans?.price,
        start_date: sub.start_date,
        expires_at: sub.end_date,
        entitlement_token: sub.entitlement_token,
      },
    });
  } catch (err) {
    console.error('[WEBHOOK] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

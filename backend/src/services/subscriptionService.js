const supabase = require('../supabaseAdmin');

/**
 * subscribeToPlan — Subscribes a tenant to a plan.
 * Cancels any existing active subscription first.
 */
async function subscribeToPlan(tenantId, planId) {
  // Cancel existing active subscription
  await supabase
    .from('subscriptions')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE');

  // Create new subscription (30-day trial for FREE, 30-day billing cycle for paid)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const { data, error } = await supabase
    .from('subscriptions')
    .insert([{
      tenant_id: tenantId,
      plan_id: planId,
      status: 'ACTIVE',
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString()
    }])
    .select('*, plans(id, name, description, price, interval, feature_limits)')
    .single();

  if (error) throw error;
  return data;
}

/**
 * upgradePlan — Upgrades or downgrades a tenant's plan.
 * Functionally the same as subscribeToPlan but explicit naming for clarity.
 */
async function upgradePlan(tenantId, newPlanId) {
  return subscribeToPlan(tenantId, newPlanId);
}

/**
 * cancelSubscription — Cancels the active subscription.
 */
async function cancelSubscription(tenantId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE')
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * getActiveSubscription — Gets the active subscription with plan details.
 */
async function getActiveSubscription(tenantId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plans(id, name, description, price, interval, feature_limits)')
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = { subscribeToPlan, upgradePlan, cancelSubscription, getActiveSubscription };

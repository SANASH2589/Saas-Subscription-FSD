const supabase = require('../supabaseAdmin');

/**
 * subscribeToPlan — Subscribes an external user (or tenant) to a plan.
 * Cancels any existing active subscription for that user/tenant first.
 */
async function subscribeToPlan(tenantId, planId, externalUserId = null) {
  console.log("subscribeToPlan called with:", { tenantId, planId, externalUserId });
  // Cancel existing active subscription
  const query = supabase
    .from('subscriptions')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE');

  if (externalUserId) {
    query.eq('external_user_id', externalUserId);
  } else {
    query.is('external_user_id', null);
  }

  await query;

  // Create new subscription (30-day billing cycle for paid)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const { data, error } = await supabase
    .from('subscriptions')
    .insert([{
      tenant_id: tenantId,
      external_user_id: externalUserId,
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
 * upgradePlan — Upgrades or downgrades a plan.
 */
async function upgradePlan(tenantId, newPlanId, externalUserId = null) {
  return subscribeToPlan(tenantId, newPlanId, externalUserId);
}

/**
 * cancelSubscription — Cancels the active subscription.
 */
async function cancelSubscription(tenantId, externalUserId = null) {
  const query = supabase
    .from('subscriptions')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE');

  if (externalUserId) {
    query.eq('external_user_id', externalUserId);
  } else {
    query.is('external_user_id', null);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === 'PGRST116') { // no rows returned
      throw new Error('No active subscription found');
    }
    throw error;
  }
  return data;
}

/**
 * getActiveSubscription — Gets the active subscription with plan details.
 */
async function getActiveSubscription(tenantId, externalUserId = null) {
  const query = supabase
    .from('subscriptions')
    .select('*, plans(id, name, description, price, interval, feature_limits)')
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE');

  if (externalUserId) {
    query.eq('external_user_id', externalUserId);
  } else {
    query.is('external_user_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = { subscribeToPlan, upgradePlan, cancelSubscription, getActiveSubscription };

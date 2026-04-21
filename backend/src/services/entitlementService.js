const supabase = require('../supabaseAdmin');

/**
 * checkAccess — Core entitlement engine.
 * Returns { allowed, message, currentUsage, limit, plan_name }
 */
async function checkAccess(userId, featureCode) {
  try {
    // 1. Get user profile → tenant_id
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return { allowed: false, message: 'User profile not found', currentUsage: 0, limit: 0, plan_name: null };
    }

    const tenantId = profile.tenant_id;

    // 2. Check global feature is enabled
    const { data: feature, error: featureErr } = await supabase
      .from('features')
      .select('is_enabled, usage_tracked')
      .eq('code', featureCode)
      .maybeSingle();

    if (featureErr || !feature) {
      return { allowed: false, message: `Feature "${featureCode}" does not exist`, currentUsage: 0, limit: 0, plan_name: null };
    }

    if (!feature.is_enabled) {
      return { allowed: false, message: 'Feature is globally disabled', currentUsage: 0, limit: 0, plan_name: null };
    }

    // 3. Get active subscription → plan
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .select('plan_id, end_date, plans(name, feature_limits)')
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (subErr || !sub) {
      return { allowed: false, message: 'No active subscription found', currentUsage: 0, limit: 0, plan_name: null };
    }

    if (sub.end_date && new Date(sub.end_date) < new Date()) {
      // Auto-expire
      await supabase.from('subscriptions').update({ status: 'EXPIRED' }).eq('plan_id', sub.plan_id).eq('tenant_id', tenantId);
      return { allowed: false, message: 'Subscription has expired', currentUsage: 0, limit: 0, plan_name: sub.plans?.name };
    }

    const plan = sub.plans;
    const limits = plan?.feature_limits || {};
    const planName = plan?.name;

    if (!(featureCode in limits)) {
      return { allowed: false, message: `Feature not included in the ${planName} plan`, currentUsage: 0, limit: 0, plan_name: planName };
    }

    const limit = limits[featureCode];

    // limit = 0 → disabled in this plan
    if (limit === 0) {
      return { allowed: false, message: `This feature requires a plan upgrade`, currentUsage: 0, limit: 0, plan_name: planName };
    }

    // limit = -1 → unlimited
    if (limit === -1) {
      return { allowed: true, message: 'Access granted (unlimited)', currentUsage: 0, limit: -1, plan_name: planName };
    }

    // 4. Check monthly usage count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error: countErr } = await supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('feature_code', featureCode)
      .gte('created_at', startOfMonth.toISOString());

    if (countErr) throw countErr;

    const currentUsage = count || 0;

    if (currentUsage >= limit) {
      return {
        allowed: false,
        message: `Monthly usage limit reached (${currentUsage}/${limit})`,
        currentUsage,
        limit,
        plan_name: planName
      };
    }

    return {
      allowed: true,
      message: `Access granted (${currentUsage}/${limit} used this month)`,
      currentUsage,
      limit,
      plan_name: planName
    };
  } catch (error) {
    console.error('checkAccess error:', error);
    return { allowed: false, message: 'Internal error during access check', currentUsage: 0, limit: 0, plan_name: null };
  }
}

/**
 * trackUsage — Inserts a usage event.
 */
async function trackUsage(userId, tenantId, featureCode) {
  const { error } = await supabase
    .from('usage_events')
    .insert([{ user_id: userId, tenant_id: tenantId, feature_code: featureCode }]);

  if (error) {
    console.error('trackUsage error:', error);
    throw error;
  }
}

module.exports = { checkAccess, trackUsage };

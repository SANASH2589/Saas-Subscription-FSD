const supabase = require('../supabaseAdmin');

/**
 * checkAccess — Core entitlement engine.
 * Returns { allowed, reason, remaining, limit, plan }
 */
async function checkAccess(tenantId, externalUserId, featureCode) {
  try {
    // 1. Identify active subscription
    let { data: subData, error: subErr } = await supabase
      .from('subscriptions')
      .select('plan_id, status, end_date, plans(name)')
      .eq('tenant_id', tenantId)
      .eq('external_user_id', externalUserId)
      .eq('status', 'ACTIVE')
      .limit(1);

    const sub = subData?.[0];

    if (subErr || !sub) {
      console.log(`[ENTITLEMENT] No active subscription for tenant=${tenantId}, user=${externalUserId}`);
      return {
        success: false, allowed: false, feature: featureCode, plan: null,
        used: 0, limit: 0, remaining: 0, reason: 'no_active_subscription'
      };
    }

    const planId = sub.plan_id;
    const planName = sub.plans?.name || planId;

    console.log(`[ENTITLEMENT] Found subscription: plan=${planName} (${planId}), user=${externalUserId}`);

    // 2. Get feature limit from plan_features
    const { data: pfData, error: pfErr } = await supabase
      .from('plan_features')
      .select('limit_value')
      .eq('plan_id', planId)
      .eq('feature_code', featureCode)
      .limit(1);

    const planFeature = pfData?.[0];

    console.log(`[ENTITLEMENT] plan_features lookup: plan_id=${planId}, feature_code=${featureCode}, result=`, planFeature || 'NOT FOUND');

    if (pfErr) {
      console.error(`[ENTITLEMENT] plan_features query error:`, pfErr);
    }

    // 3. If no plan_features row found, fall back to plans.feature_limits JSON
    let limit;
    if (planFeature) {
      limit = planFeature.limit_value;
    } else {
      // Fallback: read from the plans.feature_limits JSONB column
      const { data: planData } = await supabase
        .from('plans')
        .select('feature_limits')
        .eq('id', planId)
        .single();

      const featureLimits = planData?.feature_limits || {};
      // Try exact match, then uppercase version (schema seeds use EXPORT_PDF etc)
      const jsonLimit = featureLimits[featureCode]
        ?? featureLimits[featureCode.toUpperCase()]
        ?? featureLimits[featureCode.toUpperCase().replace(/ /g, '_')];

      console.log(`[ENTITLEMENT] Fallback to plans.feature_limits:`, featureLimits, `=> ${featureCode} = ${jsonLimit}`);

      if (jsonLimit === undefined || jsonLimit === null) {
        return {
          success: false, allowed: false, feature: featureCode, plan: planName,
          used: 0, limit: 0, remaining: 0, reason: 'feature_not_in_plan'
        };
      }
      limit = jsonLimit;
    }

    if (limit === 0) {
      return {
        success: true, allowed: false, feature: featureCode, plan: planName,
        used: 0, limit: 0, remaining: 0, reason: 'feature_disabled_in_plan'
      };
    }

    // 4. Count usage_events for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: usageData, error: countErr } = await supabase
      .from('usage_events')
      .select('count')
      .eq('tenant_id', tenantId)
      .eq('external_user_id', externalUserId)
      .eq('feature_code', featureCode)
      .gte('created_at', startOfMonth.toISOString());

    if (countErr) throw countErr;

    const used = usageData.reduce((acc, row) => acc + (row.count || 1), 0);

    if (limit === -1) {
      return {
        success: true, allowed: true, feature: featureCode, plan: planName,
        used, limit: -1, remaining: -1
      };
    }

    const remaining = Math.max(0, limit - used);

    if (used >= limit) {
      return {
        success: true, allowed: false, feature: featureCode, plan: planName,
        used, limit, remaining: 0, reason: 'limit_exceeded'
      };
    }

    return {
      success: true, allowed: true, feature: featureCode, plan: planName,
      used, limit, remaining
    };
  } catch (error) {
    console.error('[ENTITLEMENT] checkAccess error:', error);
    return {
      success: false, allowed: false, feature: featureCode, plan: null,
      used: 0, limit: 0, remaining: 0, reason: 'internal_error'
    };
  }
}

/**
 * trackUsage — Inserts a usage event for an external user.
 */
async function trackUsage(tenantId, externalUserId, featureCode, count = 1) {
  const { error } = await supabase
    .from('usage_events')
    .insert([{
      tenant_id: tenantId,
      external_user_id: externalUserId,
      feature_code: featureCode,
      count: count
    }]);

  if (error) {
    console.error('trackUsage error:', error);
    throw error;
  }
}

module.exports = { checkAccess, trackUsage };

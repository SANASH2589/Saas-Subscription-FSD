/**
 * seedPlanFeatures.js
 *
 * Ensures plan_features table has rows for all plans × demo features.
 * Safe to call on every startup — uses ON CONFLICT DO NOTHING via upsert check.
 */
const supabase = require('./supabaseAdmin');

const FEATURE_LIMITS = {
  FREE:       { export: 3,  ai_generate: 0,  analytics: 5  },
  PRO:        { export: 100, ai_generate: 50, analytics: -1 },
  ENTERPRISE: { export: -1, ai_generate: -1, analytics: -1 },
};

async function seedPlanFeatures() {
  try {
    // 1. Check if plan_features table exists and has data
    const { data: existing, error: checkErr } = await supabase
      .from('plan_features')
      .select('id')
      .limit(1);

    if (checkErr) {
      // Table might not exist yet — schema migration not run
      console.log('[SEED] plan_features table not accessible:', checkErr.message);
      console.log('[SEED] Please run migration_001_checkout.sql in Supabase SQL Editor');
      return;
    }

    if (existing && existing.length > 0) {
      console.log('[SEED] plan_features already populated, skipping seed');
      return;
    }

    // 2. Fetch all plans
    const { data: plans, error: planErr } = await supabase
      .from('plans')
      .select('id, name');

    if (planErr || !plans || plans.length === 0) {
      console.log('[SEED] No plans found, skipping plan_features seed');
      return;
    }

    // 3. Insert plan_features for each plan × feature
    const rows = [];
    for (const plan of plans) {
      const limits = FEATURE_LIMITS[plan.name];
      if (!limits) continue;

      for (const [featureCode, limitValue] of Object.entries(limits)) {
        rows.push({
          plan_id: plan.id,
          feature_code: featureCode,
          limit_value: limitValue,
        });
      }
    }

    if (rows.length === 0) {
      console.log('[SEED] No matching plans for seed data');
      return;
    }

    const { error: insertErr } = await supabase
      .from('plan_features')
      .upsert(rows, { onConflict: 'plan_id,feature_code' });

    if (insertErr) {
      console.error('[SEED] Failed to seed plan_features:', insertErr.message);
      return;
    }

    console.log(`[SEED] ✅ Seeded ${rows.length} plan_features rows`);

    // 4. Also ensure demo features exist in features table
    const features = [
      { code: 'export', name: 'Export PDF', is_enabled: true, usage_tracked: true },
      { code: 'ai_generate', name: 'AI Generate', is_enabled: true, usage_tracked: true },
      { code: 'analytics', name: 'Analytics', is_enabled: true, usage_tracked: true },
    ];

    const { error: featErr } = await supabase
      .from('features')
      .upsert(features, { onConflict: 'code' });

    if (featErr) {
      console.log('[SEED] Features upsert note:', featErr.message);
    } else {
      console.log('[SEED] ✅ Demo features ensured');
    }

  } catch (err) {
    console.error('[SEED] Unexpected error:', err.message);
  }
}

module.exports = { seedPlanFeatures };

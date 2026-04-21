const supabase = require('../supabaseAdmin');

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // ── 1. Create Features ──────────────────────────────────────
    console.log('Inserting features...');
    await supabase.from('features').upsert([
      { code: 'EXPORT_PDF', name: 'Export PDF Reports', description: 'Generate and download PDF reports', usage_tracked: true, is_enabled: true },
      { code: 'API_ACCESS', name: 'Premium API Access', description: 'Access to the full REST API', usage_tracked: false, is_enabled: true },
      { code: 'ADVANCED_ANALYTICS', name: 'Advanced Analytics', description: 'Detailed usage charts and data exports', usage_tracked: true, is_enabled: true },
      { code: 'CUSTOM_BRANDING', name: 'Custom Branding', description: 'White-label with your own logo and colors', usage_tracked: false, is_enabled: true },
      { code: 'PRIORITY_SUPPORT', name: 'Priority Support', description: '24/7 priority support with SLA guarantee', usage_tracked: false, is_enabled: true }
    ], { onConflict: 'code' });

    // ── 2. Create Plans   ──────────────────────────────────────
    console.log('Inserting plans...');
    await supabase.from('plans').upsert([
      { name: 'FREE', description: 'Get started with the basics. No credit card required.', price: 0, interval: 'MONTHLY', feature_limits: {"EXPORT_PDF": 5, "API_ACCESS": 0, "ADVANCED_ANALYTICS": 0, "CUSTOM_BRANDING": 0, "PRIORITY_SUPPORT": 0} },
      { name: 'PRO', description: 'For growing teams that need more power and flexibility.', price: 49, interval: 'MONTHLY', feature_limits: {"EXPORT_PDF": 100, "API_ACCESS": -1, "ADVANCED_ANALYTICS": 50, "CUSTOM_BRANDING": 0, "PRIORITY_SUPPORT": 0} },
      { name: 'ENTERPRISE', description: 'Full access for large organizations with priority support.', price: 199, interval: 'MONTHLY', feature_limits: {"EXPORT_PDF": -1, "API_ACCESS": -1, "ADVANCED_ANALYTICS": -1, "CUSTOM_BRANDING": -1, "PRIORITY_SUPPORT": -1} }
    ], { onConflict: 'name' }); // Assuming we have unique constraint on name, if not this might duplicate, but it's safe for initial run

    console.log('✅ Seeding complete!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

seed();

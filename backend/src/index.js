const express = require('express');
const cors = require('cors');
require('dotenv').config();
const supabase = require('./supabaseAdmin');

// ── Route Imports ──────────────────────────────────────────────
console.log("SERVICE KEY LENGTH:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
const authRoutes        = require('./routes/authRoutes');
const tenantRoutes      = require('./routes/tenantRoutes');
const apiKeyRoutes      = require('./routes/apiKeyRoutes');
const planRoutes        = require('./routes/planRoutes');
const featureRoutes     = require('./routes/featureRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const entitlementRoutes = require('./routes/entitlementRoutes');
const usageRoutes       = require('./routes/usageRoutes');
const superAdminRoutes  = require('./routes/superAdminRoutes');
const tenantMgmtRoutes  = require('./routes/tenantMgmtRoutes');
const planFeatureRoutes = require('./routes/planFeatureRoutes');
const webhookRoutes     = require('./routes/webhookRoutes');
const checkoutRoutes    = require('./routes/checkoutRoutes');
const { seedPlanFeatures } = require('./seedPlanFeatures');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Idempotency-Key']
}));

app.use(express.json());

// ── Request Logger ─────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// ══════════════════════════════════════════════════════════════
// INTERNAL AUTH ROUTES (JWT-based — for the management UI)
// ══════════════════════════════════════════════════════════════
app.use('/api/auth', authRoutes);

// ══════════════════════════════════════════════════════════════
// SUPER ADMIN MANAGEMENT (JWT + super_admin role)
// ══════════════════════════════════════════════════════════════
app.use('/api/admin', superAdminRoutes);

// ══════════════════════════════════════════════════════════════
// TENANT MANAGEMENT PANEL (JWT + tenant_admin role)
// Separate from public /api/v1 endpoints
// ══════════════════════════════════════════════════════════════
app.use('/api/tenant', tenantMgmtRoutes);

// ══════════════════════════════════════════════════════════════
// PUBLIC API v1 — ALL authenticated via x-api-key
// These are what external apps call
// ══════════════════════════════════════════════════════════════
app.use('/api/v1/register-tenant',  tenantRoutes);
app.use('/api/v1/api-keys',         apiKeyRoutes);   // NOTE: also has JWT routes for management
app.use('/api/v1/plans',            planRoutes);
app.use('/api/v1/features',         featureRoutes);
app.use('/api/v1/subscriptions',    subscriptionRoutes);
app.use('/api/v1/entitlement',      entitlementRoutes);
app.use('/api/v1',                  entitlementRoutes); // Support /api/v1/check-access
app.use('/api/v1/usage',            usageRoutes);
app.use('/api/v1/plan-features',    planFeatureRoutes);
app.use('/api/v1',                  checkoutRoutes);    // POST /api/v1/create-checkout
app.use('/api/webhooks',            webhookRoutes);

// ── Health Checks ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'SaaS Entitlement Engine', version: 'v1' });
});

app.get('/health-db', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true });
    if (error) return res.status(500).json({ status: 'DOWN', error: error.message });
    res.json({ status: 'UP', database: 'CONNECTED', plans_count: count || 0, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

// ── Root & Info Routes ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: "SaaS API Running",
    note: "Use POST for API routes",
    endpoints: [
      "POST /api/auth/login",
      "POST /api/v1/check-access"
    ]
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: "Use POST method",
    endpoints: [
      "POST /api/auth/login",
      "POST /api/v1/check-access"
    ]
  });
});

// ── Debug Routes ───────────────────────────────────────────────
app.get('/debug/db', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tenants').select('*').limit(5);
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/debug/create-tenant', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .insert([{ name: "debug tenant", slug: `debug-tenant-${Date.now()}` }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/debug/usage', async (req, res) => {
  try {
    const { data, error } = await supabase.from('usage_events').select('*').limit(5);
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Method Not Allowed Handlers for specific endpoints ─────────
app.get('/api/auth/login', (req, res) => {
  res.status(405).json({ error: "Use POST method for this endpoint" });
});

app.get('/api/v1/check-access', (req, res) => {
  res.status(405).json({ error: "Use POST method for this endpoint" });
});

// ── 404 Handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Global Error]:', err);
  res.status(err.status || 500).json({ success: false, error: err.message });
});

// ── Start Server ───────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`✅ SaaS Entitlement Engine running on port ${PORT}`);
  console.log(`   Management UI: http://localhost:3000`);
  console.log(`   API Base:      http://localhost:${PORT}/api/v1`);
  // Auto-seed plan_features if empty
  await seedPlanFeatures();
});

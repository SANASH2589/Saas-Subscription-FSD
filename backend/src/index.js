const express = require('express');
const cors = require('cors');
require('dotenv').config();
const supabase = require('./supabaseAdmin');

const authRoutes = require('./routes/authRoutes');
const planRoutes = require('./routes/planRoutes');
const featureRoutes = require('./routes/featureRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const entitlementRoutes = require('./routes/entitlementRoutes');
const usageRoutes = require('./routes/usageRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// ── Step 7: CORS Fix ──────────────────────────────────────────
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:3001"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ── Request Logger ─────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Step 4: Route Validation (Standardizing paths) ─────────────
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/entitlement', entitlementRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/ai', aiRoutes);

// ── Step 2: Supabase Connection Check ─────────────────────────
app.get('/health-db', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.error('[DB Health Check Error]:', error);
      return res.status(500).json({ status: 'DOWN', error: error.message, details: error });
    }
    
    res.json({
      status: 'UP',
      database: 'CONNECTED',
      plans_count: count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[DB Health Check Exception]:', err);
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'SaaS Entitlement Engine' });
});

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Step 9: Global Error Handling ──────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Global Error]:', err);
  res.status(err.status || 500).json({ 
    error: 'Internal server error', 
    details: err.message 
  });
});

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});

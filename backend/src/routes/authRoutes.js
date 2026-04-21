const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * POST /api/v1/auth/signup
 * Creates Supabase auth user → tenant → user_profile
 * First user in tenant = tenant_admin, rest = end_user
 */
router.post('/signup', async (req, res) => {
  const { email, password, full_name, company_name } = req.body;

  console.time('SignupTotal');
  
  // 1. Create User via Admin API (Fastest way to bypass email)
  console.time('AuthCreate');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  console.timeEnd('AuthCreate');

  if (authError) return res.status(400).json({ error: authError.message });
  const authUser = authData.user;

  try {
    // 2. Create Tenant & Start parallel tasks
    console.time('TenantCreate');
    const slug = `${company_name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`;
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([{ name: company_name, slug }])
      .select()
      .single();
    console.timeEnd('TenantCreate');

    if (tenantError) {
      await supabase.auth.admin.deleteUser(authUser.id);
      return res.status(500).json({ error: 'Failed to create tenant: ' + tenantError.message });
    }

    // 3. Parallelize Profile creation, Plan lookup, and Login
    console.time('ParallelTasks');
    const role = 'tenant_admin';

    // Fetch plan and create profile simultaneously
    const [planResult, profileResult, loginResult] = await Promise.all([
      supabase.from('plans').select('id').eq('name', 'FREE').single(),
      supabase.from('user_profiles').insert([{
        id: authUser.id,
        email,
        full_name: full_name || '',
        tenant_id: tenant.id,
        role
      }]),
      supabase.auth.signInWithPassword({ email, password })
    ]);
    console.timeEnd('ParallelTasks');

    if (profileResult.error) {
      await supabase.auth.admin.deleteUser(authUser.id);
      return res.status(500).json({ error: 'Profile creation failed' });
    }

    // 4. Create initial subscription (Background)
    if (planResult.data) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      await supabase.from('subscriptions').insert([{
        tenant_id: tenant.id,
        plan_id: planResult.data.id,
        status: 'ACTIVE',
        end_date: endDate.toISOString()
      }]);
    }

    console.timeEnd('SignupTotal');

    return res.status(201).json({
      user: {
        id: authUser.id,
        email,
        full_name: full_name || '',
        role,
        tenant_id: tenant.id,
        tenant_name: tenant.name
      },
      session: loginResult.data?.session || null
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Critical error during signup' });
  }
});

/**
 * POST /api/v1/auth/login
 * Authenticates and returns session + enriched user profile
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  console.log(`Attempting login for: ${email}`);

  // OPTIMIZATION: Start auth and profile fetch in parallel
  const [authPromise, profilePromise] = [
    supabase.auth.signInWithPassword({ email, password }),
    supabase
      .from('user_profiles')
      .select('role, tenant_id, full_name, tenants(name)')
      .eq('email', email)
      .maybeSingle()
  ];

  console.log('Auth and Profile fetch started...');
  const { data: sessionData, error: sessionError } = await authPromise;
  console.log('Auth request completed.');

  if (sessionError) {
    console.log(`Auth failed: ${sessionError.message}`);
    return res.status(401).json({ error: sessionError.message });
  }

  console.log('Checking profile...');
  const { data: profile, error: profileError } = await profilePromise;
  console.log('Profile check completed.');

  if (profileError || !profile) {
    console.log('Profile not found or error occurred.');
    return res.status(500).json({ error: 'User authenticated but profile not found' });
  }

  const authUser = sessionData.user;
  console.log(`Login successful for ${email}`);

  return res.json({
    user: {
      id: authUser.id,
      email: authUser.email,
      full_name: profile.full_name,
      role: profile.role,
      tenant_id: profile.tenant_id,
      tenant_name: profile.tenants?.name || ''
    },
    session: sessionData.session
  });
});

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's full profile + subscription info
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // Parallelize Profile and Active subscription lookup
    const [profileResult, subscriptionResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('role, tenant_id, full_name, email, created_at, tenants(id, name)')
        .eq('id', req.user.id)
        .single(),
      supabase
        .from('subscriptions')
        .select('id, status, start_date, end_date, plans(id, name, description, price, interval, feature_limits)')
        .eq('tenant_id', req.user.tenant_id)
        .eq('status', 'ACTIVE')
        .maybeSingle()
    ]);

    const profile = profileResult.data;
    const subscription = subscriptionResult.data;

    return res.json({
      user: {
        id: req.user.id,
        email: profile?.email || req.user.email,
        full_name: profile?.full_name || '',
        role: profile?.role || req.user.role,
        tenant_id: profile?.tenant_id,
        tenant_name: profile?.tenants?.name || '',
        created_at: profile?.created_at
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        plan: subscription.plans
      } : null
    });
  } catch (err) {
    console.error('Me route error:', err);
    return res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

/**
 * POST /api/v1/auth/logout
 * Signs the user out (invalidates session server-side)
 */
router.post('/logout', authenticate, async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  await supabase.auth.admin.signOut(token);
  return res.json({ message: 'Logged out successfully' });
});

module.exports = router;

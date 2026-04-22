const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { authenticate } = require('../middleware/authMiddleware');

// ==========================================
// 1. SUPER ADMIN AUTH
// ==========================================

router.post('/admin/signup', async (req, res) => {
  const { email, password, full_name } = req.body;
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true
  });
  if (authError) return res.status(400).json({ error: authError.message });
  const authUser = authData.user;
  
  const { error: profileError } = await supabase.from('user_profiles').insert([{
    id: authUser.id,
    email,
    full_name: full_name || '',
    tenant_id: null,
    role: 'super_admin'
  }]);

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.id);
    return res.status(500).json({ error: 'Profile creation failed', details: profileError.message });
  }

  const { data: loginResult, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) return res.status(401).json({ error: loginError.message });

  return res.status(201).json({
    user: { id: authUser.id, email, full_name: full_name || '', role: 'super_admin' },
    session: loginResult.session
  });
});

router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
  
  const { data: profile } = await supabase.from('user_profiles').select('role, full_name').eq('id', data.user.id).single();
  
  if (profile?.role !== 'super_admin') {
    await supabase.auth.admin.signOut(data.session.access_token);
    return res.status(403).json({ error: 'Access denied: Requires super admin privileges' });
  }
  
  return res.json({
    user: { id: data.user.id, email: data.user.email, full_name: profile.full_name, role: profile.role },
    session: data.session
  });
});

// ==========================================
// 2. TENANT ADMIN AUTH
// ==========================================

router.post('/tenant/signup', async (req, res) => {
  const { email, password, full_name, company_name } = req.body;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true
  });
  if (authError) return res.status(400).json({ error: authError.message });
  const authUser = authData.user;

  try {
    const slug = `${company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const { data: tenant, error: tenantError } = await supabase.from('tenants').insert([{ name: company_name, slug }]).select().single();
    if (tenantError) throw new Error('Tenant creation failed: ' + tenantError.message);

    const planResult = await supabase.from('plans').select('id').eq('name', 'FREE').single();

    const [profileResult, loginResult] = await Promise.all([
      supabase.from('user_profiles').insert([{ id: authUser.id, email, full_name: full_name || '', tenant_id: tenant.id, role: 'tenant_admin' }]),
      supabase.auth.signInWithPassword({ email, password })
    ]);

    if (profileResult.error) throw new Error('Profile creation failed: ' + profileResult.error.message);

    if (planResult.data) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      await supabase.from('subscriptions').insert([{
        tenant_id: tenant.id, plan_id: planResult.data.id, status: 'ACTIVE', end_date: endDate.toISOString()
      }]);
    }

    return res.status(201).json({
      user: { id: authUser.id, email, full_name: full_name || '', role: 'tenant_admin', tenant_id: tenant.id, tenant_name: tenant.name, tenant_slug: tenant.slug },
      session: loginResult.data.session
    });
  } catch (err) {
    await supabase.auth.admin.deleteUser(authUser.id);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/tenant/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  const { data: profile } = await supabase.from('user_profiles').select('role, tenant_id, full_name, tenants(name, slug)').eq('id', data.user.id).single();

  if (profile?.role !== 'tenant_admin') {
    await supabase.auth.admin.signOut(data.session.access_token);
    return res.status(403).json({ error: 'Access denied: Requires tenant admin privileges' });
  }

  return res.json({
    user: { id: data.user.id, email: data.user.email, full_name: profile.full_name, role: profile.role, tenant_id: profile.tenant_id, tenant_name: profile.tenants?.name, tenant_slug: profile.tenants?.slug },
    session: data.session
  });
});

// ==========================================
// 3. END USER AUTH
// ==========================================

router.post('/user/signup', async (req, res) => {
  const { email, password, full_name, tenant_slug } = req.body;
  if (!tenant_slug) return res.status(400).json({ error: 'tenant_slug is required' });

  const { data: tenant, error: tenantError } = await supabase.from('tenants').select('id, name').eq('slug', tenant_slug).single();
  if (tenantError || !tenant) return res.status(404).json({ error: 'Tenant not found with provided slug' });

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true
  });
  if (authError) return res.status(400).json({ error: authError.message });
  const authUser = authData.user;

  const { error: profileError } = await supabase.from('user_profiles').insert([{
    id: authUser.id, email, full_name: full_name || '', tenant_id: tenant.id, role: 'end_user'
  }]);

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.id);
    return res.status(500).json({ error: 'Profile creation failed: ' + profileError.message });
  }

  const { data: loginResult } = await supabase.auth.signInWithPassword({ email, password });

  return res.status(201).json({
    user: { id: authUser.id, email, full_name: full_name || '', role: 'end_user', tenant_id: tenant.id, tenant_name: tenant.name },
    session: loginResult.session
  });
});

router.post('/user/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  const { data: profile } = await supabase.from('user_profiles').select('role, tenant_id, full_name, tenants(name, slug)').eq('id', data.user.id).single();

  if (profile?.role !== 'end_user') {
    await supabase.auth.admin.signOut(data.session.access_token);
    return res.status(403).json({ error: 'Access denied: Requires end user privileges' });
  }

  return res.json({
    user: { id: data.user.id, email: data.user.email, full_name: profile.full_name, role: profile.role, tenant_id: profile.tenant_id, tenant_name: profile.tenants?.name, tenant_slug: profile.tenants?.slug },
    session: data.session
  });
});

// ==========================================
// SHARED ROUTES (/me, /logout)
// ==========================================

router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, tenant_id, full_name, email, created_at, tenants(id, name, slug)')
      .eq('id', req.user.id)
      .single();

    let subscription = null;
    if (profile?.tenant_id) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, status, start_date, end_date, plans(id, name, description, price, interval, feature_limits)')
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'ACTIVE')
        .maybeSingle();
      if (sub) subscription = {
        id: sub.id, status: sub.status, start_date: sub.start_date, end_date: sub.end_date, plan: sub.plans
      };
    }

    return res.json({
      user: {
        id: req.user.id,
        email: profile?.email || req.user.email,
        full_name: profile?.full_name || '',
        role: profile?.role || req.user.role,
        tenant_id: profile?.tenant_id,
        tenant_name: profile?.tenants?.name || '',
        tenant_slug: profile?.tenants?.slug || '',
        created_at: profile?.created_at
      },
      subscription
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) await supabase.auth.admin.signOut(token);
    return res.json({ message: 'Logged out successfully' });
  } catch(err) {
    return res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;

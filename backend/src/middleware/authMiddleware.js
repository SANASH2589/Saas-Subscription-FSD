const supabase = require('../supabaseAdmin');
const { createClient } = require('@supabase/supabase-js');

const supabaseAuthClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * authenticate — Validates the Bearer JWT from the Authorization header.
 * Attaches req.user = { id, email, role, tenant_id } on success.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Optimization: Decode user ID from JWT payload to fetch profile in parallel
    let userId;
    try {
      const payloadPart = token.split('.')[1];
      const decodedPayload = Buffer.from(payloadPart, 'base64').toString();
      const payload = JSON.parse(decodedPayload);
      userId = payload.sub;
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Start verification and profile fetch simultaneously
    const [authResult, profileResult] = await Promise.all([
      supabaseAuthClient.auth.getUser(token),
      supabase
        .from('user_profiles')
        .select('role, tenant_id')
        .eq('id', userId)
        .maybeSingle()
    ]);

    const { data, error } = authResult;
    if (error || !data || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { user } = data;

    const { data: profile, error: profileErr } = profileResult;
    if (profileErr) {
      return res.status(500).json({ error: 'Failed to load user profile' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'end_user',
      tenantId: profile?.tenant_id || null
    };

    console.log(`[Auth] Authenticated user: ${req.user.email} | Role: ${req.user.role} | Tenant: ${req.user.tenantId}`);

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal authentication error' });
  }
}

/**
 * requireRole — Middleware factory.
 * Usage: requireRole('tenant_admin', 'super_admin')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[Auth] Access Denied for ${req.url}: Required roles: ${allowedRoles.join(', ')}. User role: ${req.user.role}`);
      return res.status(403).json({
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
      });
    }
    next();
  };
}

/**
 * requireSuperAdmin — Specific middleware for super admin routes.
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user.role !== 'super_admin') {
    console.log(`[Auth] Super Admin Access Denied for ${req.url}: User role is ${req.user.role}`);
    return res.status(403).json({
      error: 'Access denied. Super admin privileges required.'
    });
  }
  next();
}

module.exports = { authenticate, requireRole, requireSuperAdmin };

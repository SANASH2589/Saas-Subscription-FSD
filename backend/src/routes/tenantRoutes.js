const express = require('express');
const router = express.Router();
const supabase = require('../supabaseAdmin');
const { generateApiKey } = require('../services/apiKeyService');

/**
 * POST /api/v1/register-tenant
 * Tenant Onboarding API
 */
router.post('/register-tenant', async (req, res) => {
  try {
    const { name, slug } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tenant name is required' });
    }

    const tenantSlug = slug || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

    // Create the tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([{ name, slug: tenantSlug }])
      .select('id, name, slug')
      .single();

    if (tenantError) {
      return res.status(500).json({ error: 'Failed to create tenant: ' + tenantError.message });
    }

    // Generate API Key
    const apiKeyData = await generateApiKey(tenant.id, 'Production Key');

    return res.status(201).json({
      tenant_id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      api_key: apiKeyData.rawKey // NEVER returned again
    });
  } catch (err) {
    console.error('[Tenant Onboarding Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

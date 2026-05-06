const crypto = require('crypto');
const supabase = require('../supabaseAdmin');

/**
 * Generate a new secure API Key
 * Returns the raw key (to show to user ONCE) and stores the hash.
 */
async function generateApiKey(tenantId, name = 'Default Key') {
  // Generate 32 bytes of random data for the key
  const randomPart = crypto.randomBytes(32).toString('hex');
  const rawKey = `sk_live_${randomPart}`;

  // Hash the key using SHA-256 before storing
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data, error } = await supabase
    .from('api_keys')
    .insert([{
      tenant_id: tenantId,
      key_hash: hash,
      name: name,
      status: 'active'
    }])
    .select('id, name, created_at, status')
    .single();

  if (error) {
    throw new Error('Failed to generate API Key: ' + error.message);
  }

  return {
    ...data,
    rawKey // Only return this once!
  };
}

/**
 * Verify an API Key
 * Hashes the incoming key and looks it up in the database.
 * If valid, updates last_used_at and returns the tenant_id.
 */
async function verifyApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('sk_live_')) {
    return { valid: false, message: 'Invalid API Key format' };
  }

  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, tenant_id, status')
    .eq('key_hash', hash)
    .single();

  if (error || !data) {
    return { valid: false, message: 'API Key not found or invalid' };
  }

  if (data.status !== 'active') {
    return { valid: false, message: 'API Key is revoked or inactive' };
  }

  // Update last_used_at in the background (non-blocking)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})
    .catch(err => console.error('Failed to update last_used_at:', err));

  return { valid: true, tenantId: data.tenant_id };
}

/**
 * Revoke an API Key by ID
 */
async function revokeApiKey(tenantId, keyId) {
  const { error } = await supabase
    .from('api_keys')
    .update({ status: 'revoked' })
    .eq('id', keyId)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error('Failed to revoke API Key: ' + error.message);
  }
  
  return { success: true };
}

module.exports = {
  generateApiKey,
  verifyApiKey,
  revokeApiKey
};

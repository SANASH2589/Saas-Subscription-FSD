const { verifyApiKey } = require('../services/apiKeyService');

/**
 * Middleware to authenticate requests using an API Key.
 * Reads the x-api-key header, validates it, and attaches tenant_id to the request.
 */
async function apiKeyAuth(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API Key. Please provide the x-api-key header.' });
    }

    const verification = await verifyApiKey(apiKey);

    if (!verification.valid) {
      return res.status(403).json({ error: verification.message });
    }

    // Attach tenant_id to the request object for downstream use
    req.tenantId = verification.tenantId;
    next();
  } catch (error) {
    console.error('[API Key Auth Error]:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

module.exports = { apiKeyAuth };

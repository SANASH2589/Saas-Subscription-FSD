/**
 * apiKeyRoutes.js
 *
 * PUBLIC /api/v1/api-keys — Used by external apps to verify themselves.
 * 
 * NOTE: Tenant management of API keys (generate/revoke) is handled
 * via the JWT-protected /api/tenant/api-keys/* endpoints.
 */

const express = require('express');
const router = express.Router();

// External apps don't manage keys via API — they just use them.
// This file is a placeholder for future external key introspection.
// All key management is done through the Tenant Dashboard UI → /api/tenant/api-keys

module.exports = router;

/**
 * Idempotency Middleware
 * 
 * Prevents duplicate actions (like subscription creation)
 * if the same Idempotency-Key header is provided within a timeframe.
 */
const crypto = require('crypto');

// Memory store for idempotency keys.
// In production, this MUST be Redis or a database to work across multiple nodes.
const idempotencyStore = new Map();
const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

function idempotency(req, res, next) {
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return next(); // If no key provided, proceed normally (or we could enforce it)
  }

  // To ensure the key is unique per tenant and per payload, 
  // we could combine the key with tenantId or hash the body.
  const tenantId = req.tenantId || 'anonymous';
  
  // We hash the body to ensure the request is actually identical.
  const bodyHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
  const storeKey = `${tenantId}:${idempotencyKey}`;

  // Clean up old entries (GC)
  const now = Date.now();
  if (Math.random() < 0.05) {
    for (const [key, data] of idempotencyStore.entries()) {
      if (now - data.timestamp > RETENTION_MS) {
        idempotencyStore.delete(key);
      }
    }
  }

  const existingRequest = idempotencyStore.get(storeKey);

  if (existingRequest) {
    if (existingRequest.bodyHash !== bodyHash) {
      return res.status(400).json({
        error: 'Idempotency key mismatch',
        message: 'A different request was already made with this idempotency key.'
      });
    }

    if (existingRequest.status === 'in_progress') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A request with this idempotency key is currently being processed.'
      });
    }

    // Return the cached response
    return res.status(existingRequest.statusCode).json(existingRequest.responseData);
  }

  // Mark as in progress
  idempotencyStore.set(storeKey, {
    status: 'in_progress',
    bodyHash,
    timestamp: now
  });

  // Intercept res.json to cache the response
  const originalJson = res.json;
  res.json = function (data) {
    idempotencyStore.set(storeKey, {
      status: 'completed',
      bodyHash,
      statusCode: res.statusCode,
      responseData: data,
      timestamp: Date.now()
    });
    
    // Call original method
    return originalJson.call(this, data);
  };

  next();
}

module.exports = { idempotency };

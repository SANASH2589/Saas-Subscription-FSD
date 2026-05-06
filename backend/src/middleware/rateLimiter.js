/**
 * A simple memory-based rate limiter per API key.
 * 
 * In a production environment with multiple instances,
 * you would back this with Redis.
 */
const rateLimits = new Map();

// 1000 requests per minute
const LIMIT = 1000;
const WINDOW_MS = 60 * 1000;

function rateLimiter(req, res, next) {
  // We use tenantId attached from apiKeyAuth
  // Alternatively, we could use the API key hash itself.
  // For API-key level limiting, let's use the raw header to uniquely identify the key.
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    // If there's no API key, let apiKeyAuth handle the 401.
    return next();
  }

  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Clean up old entries (simple garbage collection)
  // In a real system, you'd use setInterval for GC, or a TTL cache / Redis.
  if (Math.random() < 0.05) { // 5% chance to run GC on any request
    for (const [key, data] of rateLimits.entries()) {
      if (data.resetTime < now) {
        rateLimits.delete(key);
      }
    }
  }

  let limitData = rateLimits.get(apiKey);

  if (!limitData || limitData.resetTime < now) {
    limitData = { count: 1, resetTime: now + WINDOW_MS };
    rateLimits.set(apiKey, limitData);
    
    // Set headers
    res.setHeader('X-RateLimit-Limit', LIMIT);
    res.setHeader('X-RateLimit-Remaining', LIMIT - 1);
    res.setHeader('X-RateLimit-Reset', Math.ceil(limitData.resetTime / 1000));
    return next();
  }

  limitData.count++;

  res.setHeader('X-RateLimit-Limit', LIMIT);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, LIMIT - limitData.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(limitData.resetTime / 1000));

  if (limitData.count > LIMIT) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Try again later.'
    });
  }

  next();
}

module.exports = { rateLimiter };

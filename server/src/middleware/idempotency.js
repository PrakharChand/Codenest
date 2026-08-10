/**
 * server/src/middleware/idempotency.js
 * 
 * Idempotency Key Middleware for CodeNest API.
 * Guarantees that mutating operations (creating posts, submitting reviews, sending connection requests)
 * execute EXACTLY ONCE, even if a user double-clicks or retries network requests.
 * 
 * Protocol:
 *   Clients pass an `Idempotency-Key` or `x-idempotency-key` header (UUID v4).
 */

const idempotencyStore = new Map();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function idempotencyGuard(req, res, next) {
  const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

  // Skip GET/HEAD requests or requests without an Idempotency-Key header
  if (!key || req.method === 'GET' || req.method === 'HEAD') {
    return next();
  }

  const cacheKey = `${req.user ? req.user.id : 'anon'}:${key}`;
  const existing = idempotencyStore.get(cacheKey);

  // Return cached result if already processed
  if (existing) {
    if (existing.status === 'PROCESSING') {
      return res.status(409).json({
        error: {
          code: 'CONCURRENT_REQUEST',
          message: 'A request with this Idempotency-Key is currently processing. Please wait.'
        }
      });
    }

    if (Date.now() - existing.timestamp < IDEMPOTENCY_TTL_MS) {
      console.log(`[Idempotency] Returning cached response for key: ${key}`);
      res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
      return res.status(existing.statusCode).json(existing.body);
    } else {
      idempotencyStore.delete(cacheKey);
    }
  }

  // Mark as PROCESSING
  idempotencyStore.set(cacheKey, { status: 'PROCESSING', timestamp: Date.now() });

  // Override res.json to capture response payload
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyStore.set(cacheKey, {
        status: 'COMPLETED',
        statusCode: res.statusCode,
        body,
        timestamp: Date.now()
      });
    } else {
      idempotencyStore.delete(cacheKey); // Allow retry on server error
    }
    return originalJson(body);
  };

  next();
}

module.exports = { idempotencyGuard };

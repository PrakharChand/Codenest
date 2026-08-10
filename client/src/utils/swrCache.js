/**
 * client/src/utils/swrCache.js
 * 
 * Client-Side Stale-While-Revalidate (SWR) Caching Utility for CodeNest.
 * Provides zero-flicker UI navigation by instantly returning stale cached API responses
 * while revalidating fresh data from the server in the background.
 */

const memoryCache = new Map();
const SWR_DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Executes a Stale-While-Revalidate data fetch.
 * @param {string} cacheKey - Unique identifier for the cached resource
 * @param {Function} fetcherFn - Async data fetching function (e.g. () => axios.get(...))
 * @param {Object} options - { ttl: number, onRevalidate: function }
 */
export async function fetchWithSWR(cacheKey, fetcherFn, { ttl = SWR_DEFAULT_TTL, onRevalidate = null } = {}) {
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  // 1. If fresh cache exists, return immediately without network call
  if (cached && (now - cached.timestamp < ttl)) {
    return { data: cached.data, isStale: false };
  }

  // 2. If stale cache exists, return stale data immediately and revalidate in background
  if (cached) {
    // Background revalidation
    (async () => {
      try {
        const freshData = await fetcherFn();
        memoryCache.set(cacheKey, { data: freshData, timestamp: Date.now() });
        if (onRevalidate) onRevalidate(freshData);
      } catch (err) {
        console.warn(`[SWR:${cacheKey}] Background revalidation failed:`, err.message);
      }
    })();

    return { data: cached.data, isStale: true };
  }

  // 3. Cache miss — fetch synchronously
  const freshData = await fetcherFn();
  memoryCache.set(cacheKey, { data: freshData, timestamp: Date.now() });
  return { data: freshData, isStale: false };
}

/**
 * Invalidate a specific SWR cache key or clearing prefix.
 */
export function invalidateSWRCache(cacheKeyPrefix) {
  if (!cacheKeyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(cacheKeyPrefix)) {
      memoryCache.delete(key);
    }
  }
}

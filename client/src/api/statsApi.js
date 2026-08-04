/**
 * client/src/api/statsApi.js
 *
 * Lightweight API module for fetching public platform stats.
 * Features:
 *  - Caches response in memory (fetches once per session unless forceRefreshed)
 *  - Deduplicates concurrent in-flight requests
 */

import api from './axios';

let cachedStats = null;
let statsPromise = null;

export const statsApi = {
  getPublicStats: async (forceRefresh = false) => {
    if (cachedStats && !forceRefresh) {
      return cachedStats;
    }
    if (statsPromise && !forceRefresh) {
      return statsPromise;
    }

    statsPromise = (async () => {
      try {
        const { data } = await api.get('/api/stats/public');
        cachedStats = data;
        return data;
      } finally {
        statsPromise = null;
      }
    })();

    return statsPromise;
  },
};

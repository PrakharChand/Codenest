import api from './axios';
import { feedCache } from '../utils/feedCache';

export const postsApi = {
  /**
   * Intelligently cached feed loader with Stale-While-Revalidate (SWR).
   * - Serves cached feed immediately if available (0ms loading delay).
   * - Avoids duplicate in-flight requests.
   * - Automatically triggers background refresh if cache is stale.
   */
  list: async (params = {}) => {
    const key = feedCache.getKey(params);
    const cachedEntry = feedCache.get(params);

    // If cache entry exists
    if (cachedEntry) {
      const isFresh = feedCache.isFresh(cachedEntry);

      // If stale and not currently fetching, launch background refresh silently
      if (!isFresh && !feedCache.inFlightRequests.has(key)) {
        const bgPromise = api
          .get('/api/posts', { params })
          .then(({ data }) => feedCache.set(params, data))
          .catch(() => {}) // Ignore background refresh failure
          .finally(() => feedCache.inFlightRequests.delete(key));

        feedCache.inFlightRequests.set(key, bgPromise);
      }

      // Return cached response instantly
      return {
        data: cachedEntry.data,
        pagination: cachedEntry.pagination,
        fromCache: true,
        isFresh,
      };
    }

    // Deduplicate in-flight network requests
    if (feedCache.inFlightRequests.has(key)) {
      return feedCache.inFlightRequests.get(key);
    }

    const networkPromise = (async () => {
      try {
        const { data } = await api.get('/api/posts', { params });
        feedCache.set(params, data);
        return { ...data, fromCache: false };
      } finally {
        feedCache.inFlightRequests.delete(key);
      }
    })();

    feedCache.inFlightRequests.set(key, networkPromise);
    return networkPromise;
  },

  get: async (id) => {
    const { data } = await api.get(`/api/posts/${id}`);
    return data;
  },

  trending: async (params = {}) => {
    const { data } = await api.get('/api/posts/trending', { params });
    return data;
  },

  create: async (postData) => {
    const { data } = await api.post('/api/posts', postData);
    // Cache Invalidation after posting & optimistic prepend
    feedCache.invalidate();
    if (data) {
      feedCache.prependPost(data);
    }
    return data;
  },

  update: async (id, postData) => {
    const { data } = await api.put(`/api/posts/${id}`, postData);
    feedCache.invalidate();
    return data;
  },

  remove: async (id) => {
    // Optimistic removal from cache before/after API call
    feedCache.removePost(id);
    const { data } = await api.delete(`/api/posts/${id}`);
    feedCache.invalidate();
    return data;
  },

  like: async (id) => {
    const { data } = await api.post(`/api/posts/${id}/like`);
    window.dispatchEvent(new Event('activityUpdated'));
    return data;
  },

  unlike: async (id) => {
    const { data } = await api.delete(`/api/posts/${id}/like`);
    window.dispatchEvent(new Event('activityUpdated'));
    return data;
  },

  share: async (id, payload = {}) => {
    const { data } = await api.post(`/api/posts/${id}/share`, payload);
    feedCache.invalidate();
    return data;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post('/api/upload/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

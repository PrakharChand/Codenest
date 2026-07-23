import api from './axios';

/**
 * client/src/api/aiApi.js
 *
 * AI Feature API Module.
 * Wraps all /api/ai/* endpoints with fail-open safety.
 */
export const aiApi = {
  suggestTags: async (content) => {
    try {
      const { data } = await api.post('/api/ai/suggest-tags', { content });
      return data;
    } catch (err) {
      // Fail-open fallback: return empty tag list
      return { tags: [], fallback: true };
    }
  },

  anonymityCheck: async (content) => {
    try {
      const { data } = await api.post('/api/ai/anonymity-check', { content });
      return data;
    } catch (err) {
      // Fail-open fallback: assume safe if service is unavailable
      return { safe: true, findings: [], fallback: true };
    }
  },

  generateRoadmap: async (roadmapData) => {
    const { data } = await api.post('/api/ai/generate-roadmap', roadmapData);
    return data;
  },

  suggestConnections: async () => {
    try {
      const { data } = await api.get('/api/ai/suggest-connections');
      return data;
    } catch (err) {
      // Fail-open fallback: return empty suggestions list
      return { suggestions: [], fallback: true };
    }
  },
};

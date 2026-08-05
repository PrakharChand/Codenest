import api from './axios';

/**
 * client/src/api/aiApi.js
 *
 * AI Feature API Module.
 * Connects frontend components to /api/ai/* backend endpoints.
 * Aligns parameter names (camelCase) with backend routes & controllers.
 */
export const aiApi = {
  /**
   * POST /api/ai/suggest-tags
   * @param {string} content
   * @returns {Promise<{ tags: string[], fallback?: boolean }>}
   */
  suggestTags: async (content) => {
    try {
      const { data } = await api.post('/api/ai/suggest-tags', { content });
      return data;
    } catch (err) {
      return { tags: [], fallback: true, error: err.message };
    }
  },

  /**
   * POST /api/ai/anonymity-check
   * @param {string} text
   * @returns {Promise<{ safe: boolean, findings: Array, fallback?: boolean }>}
   */
  anonymityCheck: async (text) => {
    try {
      // Backend expects { text }
      const { data } = await api.post('/api/ai/anonymity-check', { text });
      return data;
    } catch (err) {
      return { safe: true, findings: [], fallback: true, error: err.message };
    }
  },

  /**
   * POST /api/ai/generate-roadmap
   * @param {{ level: string, knownTech: string, goal: string, hoursPerWeek: number }} payload
   * @returns {Promise<object>}
   */
  generateRoadmap: async ({ level, knownTech, known_tech, goal, hoursPerWeek, hours_per_week }) => {
    // Normalize parameter names to camelCase expected by backend (knownTech, hoursPerWeek)
    const payload = {
      level,
      knownTech: typeof knownTech === 'string' ? knownTech : Array.isArray(known_tech) ? known_tech.join(', ') : String(knownTech || ''),
      goal: goal.trim(),
      hoursPerWeek: Number(hoursPerWeek || hours_per_week || 10),
    };

    const { data } = await api.post('/api/ai/generate-roadmap', payload);
    return data;
  },

  /**
   * POST /api/ai/suggest-connections
   * @returns {Promise<{ suggestions: Array, fallback?: boolean }>}
   */
  suggestConnections: async (params = {}) => {
    try {
      const { data } = await api.post('/api/ai/suggest-connections', params);
      return data;
    } catch (err) {
      return { suggestions: [], fallback: true, error: err.message };
    }
  },

  /**
   * POST /api/ai/suggest-connections/dismiss
   * @param {number} candidateId
   * @returns {Promise<{ suggestions: Array }>}
   */
  dismissSuggestion: async (candidateId) => {
    try {
      const { data } = await api.post('/api/ai/suggest-connections/dismiss', { candidateId });
      return data;
    } catch (err) {
      return { suggestions: [], fallback: true, error: err.message };
    }
  },
};

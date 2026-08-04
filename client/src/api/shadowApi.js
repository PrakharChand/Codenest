import api from './axios';

/**
 * client/src/api/shadowApi.js
 *
 * SOLE API module for all /api/shadow/* endpoints.
 * SECURITY RULE (DESIGN_REFERENCE.md):
 * Shadow pages MUST ONLY import shadowApi and NEVER import postsApi, usersApi, or communitiesApi.
 */
export const shadowApi = {
  /** Paginated review queue. Pass { language: 'javascript' } to filter. */
  getQueue: async (params = {}) => {
    const { data } = await api.get('/api/shadow/queue', { params });
    return data;
  },

  /**
   * Returns { languages: string[] } — the distinct language tags present in
   * the reviewable queue for the current user (Rule 5 + already-reviewed
   * exclusions applied server-side so every option has results).
   */
  getQueueLanguages: async () => {
    const { data } = await api.get('/api/shadow/queue/languages');
    return data;
  },

  createSubmission: async (submissionData) => {
    const { data } = await api.post('/api/shadow/submissions', submissionData);
    return data;
  },

  getMySubmissions: async (params = {}) => {
    const { data } = await api.get('/api/shadow/submissions/mine', { params });
    return data;
  },

  getSubmission: async (id) => {
    const { data } = await api.get(`/api/shadow/submissions/${id}`);
    return data;
  },

  submitReview: async (submissionId, reviewData) => {
    const { data } = await api.post(`/api/shadow/submissions/${submissionId}/reviews`, reviewData);
    return data;
  },

  voteHelpful: async (reviewId) => {
    const { data } = await api.post(`/api/shadow/reviews/${reviewId}/helpful`);
    return data;
  },

  getShadowMe: async () => {
    const { data } = await api.get('/api/shadow/me');
    return data;
  },

  getCommunity: async (params = {}) => {
    const { data } = await api.get('/api/shadow/community', { params });
    return data;
  },

  postToCommunity: async (postData) => {
    const { data } = await api.post('/api/shadow/community', postData);
    return data;
  },

  getShadowNotifications: async (params = {}) => {
    const { data } = await api.get('/api/notifications', {
      params: { context: 'shadow', ...params },
    });
    return data;
  },
};

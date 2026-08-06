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

  // ── Anonymous Communities (Nest Shadow) ───────────────────────────────
  listCommunities: async (params = {}) => {
    const { data } = await api.get('/api/shadow/communities', { params });
    return data;
  },

  createCommunity: async (communityData) => {
    const { data } = await api.post('/api/shadow/communities', communityData);
    return data;
  },

  joinCommunity: async (id) => {
    const { data } = await api.post(`/api/shadow/communities/${id}/join`);
    return data;
  },

  leaveCommunity: async (id) => {
    const { data } = await api.delete(`/api/shadow/communities/${id}/join`);
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

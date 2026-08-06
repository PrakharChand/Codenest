import api from './axios';

export const communitiesApi = {
  list: async (params = {}) => {
    const { data } = await api.get('/api/communities', { params });
    return data;
  },

  get: async (id) => {
    const { data } = await api.get(`/api/communities/${id}`);
    return data;
  },

  create: async (communityData) => {
    const { data } = await api.post('/api/communities', communityData);
    return data;
  },

  update: async (id, communityData) => {
    const { data } = await api.put(`/api/communities/${id}`, communityData);
    return data;
  },

  delete: async (id) => {
    const { data } = await api.delete(`/api/communities/${id}`);
    return data;
  },

  join: async (id) => {
    const { data } = await api.post(`/api/communities/${id}/join`);
    return data;
  },

  leave: async (id) => {
    const { data } = await api.delete(`/api/communities/${id}/join`);
    return data;
  },

  listPosts: async (id, params = {}) => {
    const { data } = await api.get(`/api/communities/${id}/posts`, { params });
    return data;
  },

  postInCommunity: async (id, postData) => {
    const { data } = await api.post(`/api/communities/${id}/posts`, postData);
    return data;
  },

  // ── Topic APIs ─────────────────────────────────────────────────────────────
  listTopics: async (id) => {
    const { data } = await api.get(`/api/communities/${id}/topics`);
    return data;
  },

  getTopic: async (id, topicId) => {
    const { data } = await api.get(`/api/communities/${id}/topics/${topicId}`);
    return data;
  },

  createTopic: async (id, topicData) => {
    const { data } = await api.post(`/api/communities/${id}/topics`, topicData);
    return data;
  },

  updateTopic: async (id, topicId, topicData) => {
    const { data } = await api.put(`/api/communities/${id}/topics/${topicId}`, topicData);
    return data;
  },

  deleteTopic: async (id, topicId) => {
    const { data } = await api.delete(`/api/communities/${id}/topics/${topicId}`);
    return data;
  },

  listTopicPosts: async (id, topicId, params = {}) => {
    const { data } = await api.get(`/api/communities/${id}/topics/${topicId}/posts`, { params });
    return data;
  },

  // ── Member Management APIs ─────────────────────────────────────────────────
  listMembers: async (id, params = {}) => {
    const { data } = await api.get(`/api/communities/${id}/members`, { params });
    return data;
  },

  removeMember: async (id, userId) => {
    const { data } = await api.delete(`/api/communities/${id}/members/${userId}`);
    return data;
  },

  updateMemberRole: async (id, userId, role) => {
    const { data } = await api.put(`/api/communities/${id}/members/${userId}/role`, { role });
    return data;
  },

  // ── Join Requests APIs (Private Communities) ──────────────────────────────
  listRequests: async (id, params = {}) => {
    const { data } = await api.get(`/api/communities/${id}/requests`, { params });
    return data;
  },

  approveRequest: async (id, requestId) => {
    const { data } = await api.post(`/api/communities/${id}/requests/${requestId}/approve`);
    return data;
  },

  rejectRequest: async (id, requestId) => {
    const { data } = await api.post(`/api/communities/${id}/requests/${requestId}/reject`);
    return data;
  },
};

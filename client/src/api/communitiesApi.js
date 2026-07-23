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
};

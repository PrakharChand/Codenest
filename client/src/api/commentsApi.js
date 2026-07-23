import api from './axios';

export const commentsApi = {
  list: async (postId, params = {}) => {
    const { data } = await api.get(`/api/posts/${postId}/comments`, { params });
    return data;
  },

  create: async (postId, payload) => {
    const { data } = await api.post(`/api/posts/${postId}/comments`, payload);
    return data;
  },

  remove: async (commentId) => {
    const { data } = await api.delete(`/api/comments/${commentId}`);
    return data;
  },
};

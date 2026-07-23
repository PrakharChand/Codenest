import api from './axios';

export const postsApi = {
  list: async (params = {}) => {
    const { data } = await api.get('/api/posts', { params });
    return data;
  },

  get: async (id) => {
    const { data } = await api.get(`/api/posts/${id}`);
    return data;
  },

  create: async (postData) => {
    const { data } = await api.post('/api/posts', postData);
    return data;
  },

  update: async (id, postData) => {
    const { data } = await api.put(`/api/posts/${id}`, postData);
    return data;
  },

  remove: async (id) => {
    const { data } = await api.delete(`/api/posts/${id}`);
    return data;
  },

  like: async (id) => {
    const { data } = await api.post(`/api/posts/${id}/like`);
    return data;
  },

  unlike: async (id) => {
    const { data } = await api.delete(`/api/posts/${id}/like`);
    return data;
  },

  share: async (id, payload = {}) => {
    const { data } = await api.post(`/api/posts/${id}/share`, payload);
    return data;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

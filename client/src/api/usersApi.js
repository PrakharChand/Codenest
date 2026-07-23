import api from './axios';

export const usersApi = {
  getProfile: async (id) => {
    const { data } = await api.get(`/api/users/${id}`);
    return data;
  },

  updateProfile: async (id, profileData) => {
    const { data } = await api.put(`/api/users/${id}`, profileData);
    return data;
  },

  connect: async (id) => {
    const { data } = await api.post(`/api/users/${id}/connect`);
    return data;
  },

  disconnect: async (id) => {
    const { data } = await api.delete(`/api/users/${id}/connect`);
    return data;
  },

  listConnections: async (id, params = {}) => {
    const { data } = await api.get(`/api/users/${id}/connections`, { params });
    return data;
  },

  uploadAvatar: async (id, file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await api.post(`/api/upload/users/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

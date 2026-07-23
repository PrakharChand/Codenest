import api from './axios';

export const notificationsApi = {
  list: async (context = 'public', params = {}) => {
    const { data } = await api.get('/api/notifications', {
      params: { context, ...params },
    });
    return data;
  },

  markRead: async (id) => {
    const { data } = await api.put(`/api/notifications/${id}/read`);
    return data;
  },

  markAllRead: async (context = 'public') => {
    const { data } = await api.put('/api/notifications/read-all', { context });
    return data;
  },
};

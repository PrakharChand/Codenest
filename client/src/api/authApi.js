import api from './axios';

export const authApi = {
  login: async (credentials) => {
    const { data } = await api.post('/api/auth/login', credentials);
    return data;
  },

  register: async (userData) => {
    const { data } = await api.post('/api/auth/register', userData);
    return data;
  },

  logout: async () => {
    const { data } = await api.post('/api/auth/logout');
    return data;
  },

  me: async () => {
    const { data } = await api.get('/api/auth/me');
    return data;
  },

  getOAuthGitHubUrl: () => `${api.defaults.baseURL}/api/auth/github`,
  getOAuthGoogleUrl: () => `${api.defaults.baseURL}/api/auth/google`,
};

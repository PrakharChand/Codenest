import api from './axios';

export const usersApi = {
  // ── Profile ────────────────────────────────────────────────────────────
  getProfile: async (id) => {
    const { data } = await api.get(`/api/users/${id}`);
    return data;
  },

  updateProfile: async (id, profileData) => {
    const { data } = await api.put(`/api/users/${id}`, profileData);
    return data;
  },

  // ── Discovery ──────────────────────────────────────────────────────────

  /** Search users by name (partial, case-insensitive). Returns { results: [] } */
  search: async (q) => {
    const { data } = await api.get('/api/users/search', { params: { q } });
    return data;
  },

  /** Paginated explore list — all users for discovery */
  explore: async (params = {}) => {
    const { data } = await api.get('/api/users/explore', { params });
    return data;
  },

  /** User 7-day activity analytics & streak */
  getActivity: async () => {
    const { data } = await api.get('/api/users/me/activity');
    return data;
  },

  // ── Follow (one-tap, no approval) ─────────────────────────────────────
  connect: async (id) => {
    const { data } = await api.post(`/api/users/${id}/connect`);
    return data;
  },

  disconnect: async (id) => {
    const { data } = await api.delete(`/api/users/${id}/connect`);
    return data;
  },

  /** People userId follows (paginated) */
  listConnections: async (id, params = {}) => {
    const { data } = await api.get(`/api/users/${id}/connections`, { params });
    return data;
  },

  /** Alias for listConnections — semantically clearer name */
  listFollowing: async (id, params = {}) => {
    const { data } = await api.get(`/api/users/${id}/connections`, { params });
    return data;
  },

  /** People who follow userId (paginated) */
  listFollowers: async (id, params = {}) => {
    const { data } = await api.get(`/api/users/${id}/followers`, { params });
    return data;
  },

  /** Mutual connections — both userId follows them AND they follow userId (paginated) */
  listMutual: async (id, params = {}) => {
    const { data } = await api.get(`/api/users/${id}/mutual`, { params });
    return data;
  },

  // ── Connection Requests (approval-based) ──────────────────────────────

  /** Send a connection request to userId */
  sendRequest: async (id) => {
    const { data } = await api.post(`/api/users/${id}/request`);
    return data;
  },

  /** Accept an incoming request from userId */
  acceptRequest: async (id) => {
    const { data } = await api.post(`/api/users/${id}/request/accept`);
    return data;
  },

  /** Decline an incoming request from userId */
  declineRequest: async (id) => {
    const { data } = await api.post(`/api/users/${id}/request/decline`);
    return data;
  },

  /** List pending requests sent to me */
  listIncomingRequests: async () => {
    const { data } = await api.get('/api/users/me/requests/incoming');
    return data;
  },

  /** List pending requests I sent */
  listOutgoingRequests: async () => {
    const { data } = await api.get('/api/users/me/requests/outgoing');
    return data;
  },

  // ── Account Deletion ──────────────────────────────────────────────────
  deleteAccount: async (id) => {
    const { data } = await api.delete(`/api/users/${id}`);
    return data;
  },

  // ── Avatar ────────────────────────────────────────────────────────────
  uploadAvatar: async (id, file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await api.post(`/api/upload/users/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

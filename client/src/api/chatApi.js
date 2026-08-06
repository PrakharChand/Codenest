import api from './axios';

/**
 * client/src/api/chatApi.js
 *
 * API client module for real-time chat endpoints.
 */
export const chatApi = {
  getConversations: async () => {
    const { data } = await api.get('/api/chat/conversations');
    return data;
  },

  getOrCreateConversation: async (targetUserId) => {
    const { data } = await api.post('/api/chat/conversations', { targetUserId });
    return data;
  },

  deleteConversation: async (id) => {
    const { data } = await api.delete(`/api/chat/conversations/${id}`);
    return data;
  },

  getMessages: async (conversationId, params = {}) => {
    const { data } = await api.get(`/api/chat/conversations/${conversationId}/messages`, { params });
    return data;
  },

  sendMessage: async (conversationId, content) => {
    const { data } = await api.post(`/api/chat/conversations/${conversationId}/messages`, { content });
    return data;
  },

  editMessage: async (messageId, content) => {
    const { data } = await api.put(`/api/chat/messages/${messageId}`, { content });
    return data;
  },

  deleteMessage: async (messageId) => {
    const { data } = await api.delete(`/api/chat/messages/${messageId}`);
    return data;
  },

  markAsRead: async (conversationId) => {
    const { data } = await api.put(`/api/chat/conversations/${conversationId}/read`);
    return data;
  },

  getUnreadCount: async () => {
    const { data } = await api.get('/api/chat/unread-count');
    return data;
  },
};

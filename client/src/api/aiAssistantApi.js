/**
 * client/src/api/aiAssistantApi.js
 *
 * API client methods for Dual AI Assistants (CodeNest Guide & Shadow Mentor).
 */

import api from './axios';

export const aiAssistantApi = {
  // Conversations
  getConversations: async (mode = 'feed') => {
    const { data } = await api.get(`/api/assistant/conversations?mode=${mode}`);
    return data;
  },

  createConversation: async (mode = 'feed', title = 'New Conversation') => {
    const { data } = await api.post('/api/assistant/conversations', { mode, title });
    return data;
  },

  renameConversation: async (id, title) => {
    const { data } = await api.patch(`/api/assistant/conversations/${id}`, { title });
    return data;
  },

  deleteConversation: async (id) => {
    const { data } = await api.delete(`/api/assistant/conversations/${id}`);
    return data;
  },

  deleteOldestConversation: async (mode = 'feed') => {
    const { data } = await api.delete(`/api/assistant/conversations/oldest?mode=${mode}`);
    return data;
  },

  // Messages
  getMessages: async (conversationId) => {
    const { data } = await api.get(`/api/assistant/conversations/${conversationId}/messages`);
    return data;
  },

  sendMessage: async (conversationId, prompt) => {
    const { data } = await api.post(`/api/assistant/conversations/${conversationId}/messages`, { prompt });
    return data;
  },

  // Settings
  getSettings: async () => {
    const { data } = await api.get('/api/assistant/settings');
    return data;
  },

  updateSettings: async (settings) => {
    const { data } = await api.put('/api/assistant/settings', settings);
    return data;
  },
};

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../realtime/socket';
import { notificationsApi } from '../api/notificationsApi';

import { chatApi } from '../api/chatApi';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, accessToken } = useAuth();
  const [publicUnread, setPublicUnread] = useState(0);
  const [shadowUnread, setShadowUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;
    try {
      const results = await Promise.allSettled([
        notificationsApi.list('public'),
        user?.has_anonymous_identity ? notificationsApi.list('shadow') : Promise.resolve({ data: [] }),
        chatApi.getUnreadCount(),
      ]);

      if (results[0].status === 'fulfilled') {
        const pubList = results[0].value?.data || [];
        setPublicUnread(pubList.filter((n) => !n.is_read).length);
      }
      if (results[1].status === 'fulfilled') {
        const shList = results[1].value?.data || [];
        setShadowUnread(shList.filter((n) => !n.is_read).length);
      }
      if (results[2].status === 'fulfilled') {
        setChatUnread(results[2].value?.unreadCount || 0);
      }
    } catch (_) {
      // Quiet degradation
    }
  }, [user]);

  // Initial load & 60-second polling for chat unread count
  useEffect(() => {
    if (user) {
      fetchUnreadCounts();
      const interval = setInterval(fetchUnreadCounts, 60000);
      return () => clearInterval(interval);
    } else {
      setPublicUnread(0);
      setShadowUnread(0);
      setChatUnread(0);
    }
  }, [user, fetchUnreadCounts]);

  // Socket connection & lifecycle
  useEffect(() => {
    if (!user || !accessToken) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(accessToken);

    if (!socket) return;

    const handleNewNotification = (notif) => {
      if (notif.identity_context === 'shadow') {
        setShadowUnread((prev) => prev + 1);
        toast(notif.message, {
          icon: '👤',
          style: {
            background: '#131924',
            color: '#F8FAFC',
            border: '1px solid #212C3D',
          },
        });
      } else {
        setPublicUnread((prev) => prev + 1);
        toast(notif.message, {
          icon: '🔔',
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid #E2E8F0',
          },
        });
      }
    };

    const handleNewChatMessage = (msg) => {
      setChatUnread((prev) => prev + 1);
      if (msg && msg.sender_name) {
        toast(`💬 Message from ${msg.sender_name}: "${msg.content?.slice(0, 45) || 'New message'}"`, {
          duration: 4000,
          style: {
            background: '#0F172A',
            color: '#F8FAFC',
            border: '1px solid #334155',
          },
        });
      }
    };

    const handleConnect = () => {
      fetchUnreadCounts();
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('new_message', handleNewChatMessage);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('new_message', handleNewChatMessage);
      socket.off('connect', handleConnect);
    };
  }, [user, accessToken, fetchUnreadCounts]);

  const value = {
    publicUnread,
    shadowUnread,
    chatUnread,
    refreshNotifications: fetchUnreadCounts,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

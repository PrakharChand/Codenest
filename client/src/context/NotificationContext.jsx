import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../realtime/socket';
import { notificationsApi } from '../api/notificationsApi';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, accessToken } = useAuth();
  const [publicUnread, setPublicUnread] = useState(0);
  const [shadowUnread, setShadowUnread] = useState(0);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [pubRes, shRes] = await Promise.all([
        notificationsApi.list('public'),
        notificationsApi.list('shadow'),
      ]);

      const pubList = pubRes.data || [];
      const shList = shRes.data || [];

      setPublicUnread(pubList.filter((n) => !n.is_read).length);
      setShadowUnread(shList.filter((n) => !n.is_read).length);
    } catch (err) {
      // Quiet degradation
    }
  }, [user]);

  // Initial load when user authenticates
  useEffect(() => {
    if (user) {
      fetchUnreadCounts();
    } else {
      setPublicUnread(0);
      setShadowUnread(0);
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

    const handleConnect = () => {
      fetchUnreadCounts();
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('connect', handleConnect);
    };
  }, [user, accessToken, fetchUnreadCounts]);

  const value = {
    publicUnread,
    shadowUnread,
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

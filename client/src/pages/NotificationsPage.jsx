import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { notificationsApi } from '../api/notificationsApi';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Badge from '../components/atoms/Badge';
import Spinner from '../components/atoms/Spinner';
import EmptyState from '../components/molecules/EmptyState';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.list('public');
      setNotifications(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead('public');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err.message || 'Could not mark all as read.');
    }
  };

  const getTargetUrl = (notif) => {
    switch (notif.type) {
      case 'like':
      case 'comment':
      case 'share':
        return `/posts/${notif.reference_id}`;
      case 'connection':
        return `/users/${notif.reference_id}`;
      default:
        return '#';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-main">Public Notifications</h1>
          <p className="text-sm text-muted">Activity and updates from your network</p>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
            Mark All as Read
          </Button>
        )}
      </div>

      {error ? (
        <Card className="p-6 text-center space-y-3">
          <p className="text-sm text-danger font-medium">{error}</p>
          <Button size="sm" variant="secondary" onClick={loadNotifications}>
            Retry
          </Button>
        </Card>
      ) : notifications.length === 0 ? (
        <EmptyState
          preset="notifications"
          title="You are all caught up!"
          description="When developers connect with you, like your posts, or comment, updates will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                !n.is_read ? 'bg-primary-light/30 border-primary/30' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg">
                  {n.type === 'like' && '❤️'}
                  {n.type === 'comment' && '💬'}
                  {n.type === 'share' && '🔁'}
                  {n.type === 'connection' && '🤝'}
                </span>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <Link
                    to={getTargetUrl(n)}
                    onClick={() => handleMarkRead(n.id)}
                    className="text-sm font-medium text-main hover:text-primary transition-colors block truncate"
                  >
                    {n.message}
                  </Link>
                  <span className="text-xs text-subtle block">
                    {n.created_at
                      ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true })
                      : 'recently'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!n.is_read && (
                  <Badge variant="primary" size="sm">
                    New
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

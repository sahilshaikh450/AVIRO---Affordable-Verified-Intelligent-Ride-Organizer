import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { NOTIFICATION_EVENT } from './TripAlerts';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isOpen, setIsOpen]               = useState(false);

  // ── Fetch notifications ──
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/my');
      const data = res.data.data || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.warn('Notifications fetch failed:', err.message);
    }
  };

  // ── Live notifications (one app-wide connection in TripAlerts) ──
  useEffect(() => {
    const onNotification = (e) => {
      setNotifications(prev => [e.detail, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    window.addEventListener(NOTIFICATION_EVENT, onNotification);
    return () => window.removeEventListener(NOTIFICATION_EVENT, onNotification);
  }, []);

  // ── Mark all as read ──
  const markAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Mark read failed:', err.message);
    }
  };

  // ── Delete notification ──
  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      const wasUnread = notifications.some(n => n.id === id && !n.isRead);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Delete notification failed:', err.message);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':  return '✅';
      case 'BOOKING_REJECTED':   return '❌';
      case 'BOOKING_REQUESTED':  return '🔔';
      case 'RIDE_COMPLETED':     return '🏁';
      case 'PAYMENT_RECEIVED':   return '💰';
      case 'SOS_ALERT':          return '🆘';
      case 'BUDDY_ADDED':        return '🤝';
      default:                   return '📢';
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAllRead(); }}
        className="relative w-10 h-10 rounded-xl bg-aviro-card2 border border-aviro-border flex items-center justify-center hover:border-aviro-orange/50 transition-colors"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-aviro-orange text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-aviro-card border border-aviro-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-aviro-border">
            <p className="font-bold text-sm">Notifications</p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="text-xs text-aviro-orange hover:underline">
                  Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)}
                className="text-aviro-muted hover:text-white text-lg w-6 h-6 flex items-center justify-center">
                ✕
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-sm text-aviro-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n, i) => (
                <div key={n.id || i}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-aviro-border hover:bg-aviro-card2 transition-colors
                    ${!n.isRead ? 'bg-aviro-orange/5' : ''}`}>
                  <span className="text-xl flex-shrink-0 mt-0.5">{getIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${!n.isRead ? 'text-white' : 'text-aviro-muted'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-aviro-muted mt-0.5 line-clamp-2">{n.message}</p>
                    {n.createdAt && (
                      <p className="text-xs text-aviro-muted mt-1">
                        {new Date(n.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'short', timeStyle: 'short'
                        })}
                      </p>
                    )}
                  </div>
                  <button onClick={() => deleteNotification(n.id)}
                    className="text-aviro-muted hover:text-red-400 flex-shrink-0 text-sm">
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}

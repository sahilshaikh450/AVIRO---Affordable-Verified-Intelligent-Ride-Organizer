import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { NOTIFICATION_EVENT, REALTIME_CONNECTED_EVENT } from './TripAlerts';

const ICONS = {
  BOOKING_REQUEST:   '🔔',
  BOOKING_ACCEPTED:  '✅',
  BOOKING_REJECTED:  '❌',
  BOOKING_CANCELLED: '🚫',
  TRIP_ON_THE_WAY:   '🚗',
  TRIP_ARRIVED:      '📍',
  TRIP_STARTED:      '🏁',
  RIDE_COMPLETED:    '🎉',
  PAYMENT_RECEIVED:  '💰',
  CHAT_MESSAGE:      '💬',
  SOS_ALERT:         '🆘',
};

// Notifications whose referenceId is a booking: tapping opens that trip
const TRIP_TYPES = ['BOOKING_REQUEST', 'BOOKING_ACCEPTED', 'BOOKING_REJECTED', 'BOOKING_CANCELLED',
  'TRIP_ON_THE_WAY', 'TRIP_ARRIVED', 'TRIP_STARTED', 'RIDE_COMPLETED', 'PAYMENT_RECEIVED', 'SOS_ALERT'];

const timeAgo = (value) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function NotificationBell() {
  const navigate = useNavigate();
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
    // Phones drop the connection in the background; reload what was missed when it comes back
    const onVisible = () => { if (document.visibilityState === 'visible') fetchNotifications(); };
    window.addEventListener(NOTIFICATION_EVENT, onNotification);
    window.addEventListener(REALTIME_CONNECTED_EVENT, fetchNotifications);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, onNotification);
      window.removeEventListener(REALTIME_CONNECTED_EVENT, fetchNotifications);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // ── Mark all as read ──
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.patch('/notifications/mark-all-read');
    } catch (err) {
      console.warn('Mark read failed:', err.message);
    }
  };

  // ── Delete: remove from the list at once, put it back if the server says no ──
  const deleteNotification = async (n, e) => {
    e?.stopPropagation();
    const before = notifications;
    setNotifications(prev => prev.filter(x => x.id !== n.id));
    if (!n.isRead) setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.delete(`/notifications/${n.id}`);
    } catch {
      setNotifications(before);
      if (!n.isRead) setUnreadCount(prev => prev + 1);
      toast.error('Could not delete the notification');
    }
  };

  const clearAll = async () => {
    const before = notifications;
    setNotifications([]);
    setUnreadCount(0);
    try {
      await api.delete('/notifications');
    } catch {
      setNotifications(before);
      toast.error('Could not clear notifications');
    }
  };

  // Tapping a notification opens the ride, chat or dashboard it is about
  const openNotification = (n) => {
    setIsOpen(false);
    if (TRIP_TYPES.includes(n.type) && /^\d+$/.test(String(n.referenceId))) navigate(`/tracking/${n.referenceId}`);
    else if (n.type === 'CHAT_MESSAGE') navigate('/chat');
  };

  const toggle = () => {
    setIsOpen(open => !open);
    if (!isOpen && unreadCount > 0) markAllRead();
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative w-10 h-10 rounded-xl bg-aviro-card2 border border-aviro-border flex items-center justify-center hover:border-aviro-orange/50 transition-colors"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-aviro-orange text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel: full width on phones, dropdown on larger screens */}
      {isOpen && (
        <div className="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96
          bg-aviro-card border border-aviro-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[75vh]"
          role="dialog" aria-label="Notifications panel">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-aviro-border">
            <p className="font-bold text-sm">Notifications</p>
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-xs text-red-400 hover:underline">
                  Clear all
                </button>
              )}
              <button onClick={() => setIsOpen(false)} aria-label="Close"
                className="text-aviro-muted hover:text-white text-lg w-8 h-8 flex items-center justify-center">
                ✕
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-sm text-aviro-muted">You're all caught up</p>
              </div>
            ) : (
              notifications.slice(0, 30).map((n, i) => (
                <div key={n.id || i} onClick={() => openNotification(n)} role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') openNotification(n); }}
                  className={`flex items-start gap-3 pl-4 pr-2 py-3 border-b border-aviro-border hover:bg-aviro-card2 transition-colors cursor-pointer
                    ${!n.isRead ? 'bg-aviro-orange/5' : ''}`}>
                  <span className="text-xl flex-shrink-0 mt-0.5">{ICONS[n.type] || '📢'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${!n.isRead ? 'text-white' : 'text-aviro-muted'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-aviro-muted mt-0.5 line-clamp-2">{n.message}</p>
                    {n.createdAt && <p className="text-[11px] text-aviro-muted mt-1">{timeAgo(n.createdAt)}</p>}
                  </div>
                  <button onClick={(e) => deleteNotification(n, e)} aria-label="Delete notification"
                    className="text-aviro-muted hover:text-red-400 flex-shrink-0 w-9 h-9 rounded-lg hover:bg-red-500/10 flex items-center justify-center">
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
        <div className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}

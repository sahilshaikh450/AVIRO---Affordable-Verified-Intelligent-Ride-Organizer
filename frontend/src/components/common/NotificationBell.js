import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';

export default function NotificationBell() {
  const { user } = useSelector(s => s.auth);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen]   = useState(false);
  const [unread, setUnread] = useState(0);
  const clientRef = useRef(null);
  const wrapRef   = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    apiClient.get('/notifications/my').then(res => {
      const data = res.data.data || [];
      setNotifications(data);
      setUnread(data.filter(n => !n.isRead).length);
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem('aviro_token');
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/api/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/user/${user.id}/queue/notifications`, (frame) => {
          try {
            const notif = JSON.parse(frame.body);
            setNotifications(prev => [notif, ...prev]);
            setUnread(prev => prev + 1);
            toast(notif.message, { icon: '🔔' });
          } catch {}
        });
      },
    });
    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, [user?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try { await apiClient.post('/notifications/mark-all-read'); } catch {}
  };

  // Delete single notification (frontend only — no backend needed)
  const deleteNotification = (index) => {
    setNotifications(prev => {
      const updated = prev.filter((_, i) => i !== index);
      setUnread(updated.filter(n => !n.isRead).length);
      return updated;
    });
  };

  // Delete all notifications
  const deleteAll = () => {
    setNotifications([]);
    setUnread(0);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  const typeIcon = (type) => ({
    BOOKING_REQUEST:  '🔔',
    BOOKING_ACCEPTED: '✅',
    BOOKING_REJECTED: '❌',
    BOOKING_CANCELLED:'🚫',
    RIDE_COMPLETED:   '🏁',
    PAYMENT_RECEIVED: '💰',
    CHAT_MESSAGE:     '💬',
    SOS_ALERT:        '🆘',
  }[type] || '📣');

  return (
    <div ref={wrapRef} className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-aviro-card2 rounded-full transition-colors">
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-aviro-orange text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-aviro-card border border-aviro-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-aviro-border flex items-center justify-between">
            <h3 className="font-bold text-sm">Notifications</h3>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="text-xs text-aviro-orange hover:underline">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={deleteAll}
                  className="text-xs text-red-400 hover:underline">
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-aviro-muted text-sm">
                <div className="text-3xl mb-2">🔔</div>
                No notifications yet
              </div>
            ) : notifications.map((n, i) => (
              <div key={i}
                className={`p-4 border-b border-aviro-border/50 last:border-0 flex gap-3 group
                  ${!n.isRead ? 'bg-aviro-orange/5' : ''}`}>
                <span className="text-xl flex-shrink-0">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="text-xs text-aviro-muted">{n.message}</p>
                  <p className="text-xs text-aviro-muted mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {!n.isRead && <div className="w-2 h-2 bg-aviro-orange rounded-full" />}
                  {/* Delete button */}
                  <button
                    onClick={() => deleteNotification(i)}
                    className="text-aviro-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
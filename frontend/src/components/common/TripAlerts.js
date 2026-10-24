import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { WS_URL } from '../../services/websocket';
import { getErrorMessage } from '../../store/authSlice';

// Fired on window for every live notification (NotificationBell listens to it)
export const NOTIFICATION_EVENT = 'aviro:notification';
// Fired when the live connection (re)opens, so missed notifications can be reloaded
export const REALTIME_CONNECTED_EVENT = 'aviro:realtime-connected';

// Notifications that open a popup instead of only a toast
const POPUPS = {
  BOOKING_REQUEST:  'request',
  BOOKING_ACCEPTED: 'accepted',
  TRIP_ARRIVED:     'arrived',
  RIDE_COMPLETED:   'completed',
};
const TOASTS = ['BOOKING_REJECTED', 'BOOKING_CANCELLED', 'TRIP_ON_THE_WAY', 'TRIP_STARTED', 'PAYMENT_RECEIVED'];

// A popup only makes sense while the booking is still at that step
const stillRelevant = (kind, booking, userId) => {
  switch (kind) {
    case 'request':   return booking.status === 'REQUESTED';
    case 'accepted':  return booking.status === 'CONFIRMED' && !booking.tripStage;
    case 'arrived':   return booking.status === 'CONFIRMED' && booking.tripStage === 'ARRIVED';
    case 'completed': return booking.status === 'COMPLETED' && (booking.rider?.id === userId
      ? !booking.paymentMethod
      : booking.paymentStatus !== 'COMPLETED');
    default:          return false;
  }
};

// After reconnecting (phone was in the background), still show alerts from the last few minutes
const CATCH_UP_MS = 5 * 60 * 1000;
const SHOWN_KEY = 'aviro_shown_alerts';
const readShown = () => {
  try { return new Set(JSON.parse(sessionStorage.getItem(SHOWN_KEY) || '[]')); } catch { return new Set(); }
};
const rememberShown = (shown) => {
  try { sessionStorage.setItem(SHOWN_KEY, JSON.stringify([...shown].slice(-50))); } catch {}
};

// One app-wide WebSocket for notifications, plus cab-app style popups:
// the driver can accept a request from any page, and the rider is told when
// the driver accepts, arrives, or ends the trip.
export default function TripAlerts() {
  const { user } = useSelector(s => s.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const [popup, setPopup] = useState(null);
  const [busy, setBusy]   = useState(false);
  const pathRef = useRef(location.pathname);
  const shownRef = useRef(readShown());

  useEffect(() => { pathRef.current = location.pathname; }, [location.pathname]);

  // Tapping a phone notification while AVIRO is open: the service worker asks us to open the page
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e) => {
      if (e.data?.type === 'AVIRO_NAVIGATE' && typeof e.data.url === 'string' && e.data.url.startsWith('/')) {
        navigate(e.data.url);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate]);

  useEffect(() => {
    if (!user?.id) return;

    const showAlert = async (n) => {
      if (n.id && shownRef.current.has(n.id)) return;
      if (n.id) { shownRef.current.add(n.id); rememberShown(shownRef.current); }

      // The trip screen for this booking already shows these updates
      if (n.referenceId && pathRef.current === `/tracking/${n.referenceId}`) return;

      const kind = POPUPS[n.type];
      if (kind && n.referenceId) {
        try {
          const res = await api.get(`/bookings/${n.referenceId}`);
          const booking = res.data.data;
          if (stillRelevant(kind, booking, user.id)) setPopup({ kind, notification: n, booking });
        } catch {
          toast(n.title, { icon: '🔔' });
        }
      } else if (TOASTS.includes(n.type)) {
        toast(`${n.title} — ${n.message}`, { icon: '🔔', duration: 5000 });
      }
    };

    // Newest unread ride alert from the last few minutes that was missed while disconnected
    const catchUp = async () => {
      try {
        const res = await api.get('/notifications/my');
        const cutoff = Date.now() - CATCH_UP_MS;
        const missed = (res.data.data || []).find(n => !n.isRead && POPUPS[n.type]
          && !shownRef.current.has(n.id) && new Date(n.createdAt).getTime() > cutoff);
        if (missed) showAlert(missed);
      } catch {
        // Catch-up is best effort
      }
    };

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${localStorage.getItem('aviro_token')}` },
      reconnectDelay: 5000,
      onConnect: () => {
        window.dispatchEvent(new Event(REALTIME_CONNECTED_EVENT));
        client.subscribe('/user/queue/notifications', (frame) => {
          const n = JSON.parse(frame.body);
          window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: n }));
          showAlert(n);
        });
        catchUp();
      },
    });
    client.activate();
    return () => client.deactivate();
  }, [user?.id]);

  if (!popup) return null;
  const { kind, notification, booking } = popup;
  const close = () => setPopup(null);
  const openTrip = () => { close(); navigate(`/tracking/${booking.id}`); };
  const respond = async (status) => {
    setBusy(true);
    try {
      await api.patch(`/bookings/${booking.id}/status`, { status });
      if (status === 'CONFIRMED') { toast.success('Ride accepted ✅'); openTrip(); }
      else { toast('Request declined'); close(); }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the request'));
    }
    setBusy(false);
  };

  const rider = booking.rider, driver = booking.driver;

  return (
    <div className="fixed inset-0 bg-black/70 z-[2000] flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-aviro-card border border-aviro-orange/40 rounded-2xl w-full max-w-sm p-5 space-y-4 animate-fade-up">
        {kind === 'request' && (
          <>
            <p className="text-xs font-bold text-aviro-orange uppercase tracking-wider">🔔 New ride request</p>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-aviro-card2 flex items-center justify-center text-3xl">
                {rider?.gender === 'FEMALE' ? '👩' : '👨'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold">{rider?.fullName}</p>
                <p className="text-xs text-aviro-muted truncate">{rider?.collegeName}</p>
                <p className="text-xs text-aviro-muted">⭐ {rider?.rating?.toFixed(1) || '5.0'}</p>
              </div>
              <div className="text-right">
                <p className="text-aviro-green font-bold text-xl">₹{booking.totalAmount}</p>
                <p className="text-xs text-aviro-muted">{booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="bg-aviro-card2 rounded-xl p-3 text-sm">
              <p className="font-medium">{booking.fromLocation} → {booking.toLocation}</p>
              {booking.departureTime && (
                <p className="text-xs text-aviro-muted mt-1">
                  🕐 {new Date(booking.departureTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => respond('REJECTED')} disabled={busy}
                className="bg-red-500/10 text-red-400 border border-red-500/30 font-bold py-3 rounded-xl">Decline</button>
              <button onClick={() => respond('CONFIRMED')} disabled={busy}
                className="bg-aviro-green text-white font-bold py-3 rounded-xl">✅ Accept</button>
            </div>
            <button onClick={close} className="w-full text-xs text-aviro-muted hover:text-white">Decide later</button>
          </>
        )}

        {kind !== 'request' && (
          <>
            <div className="text-center space-y-2">
              <p className="text-5xl">{{ accepted: '🎉', arrived: '📍', completed: '🏁' }[kind]}</p>
              <p className="font-bold text-lg">{notification.title}</p>
              <p className="text-sm text-aviro-muted">{notification.message}</p>
              {kind !== 'completed' && driver?.vehicleModel && (
                <p className="text-xs text-aviro-muted">
                  {driver.vehicleModel} · {driver.vehicleColor}
                  {driver.vehicleRegistrationNumber && <> · <span className="text-white font-semibold">{driver.vehicleRegistrationNumber}</span></>}
                </p>
              )}
            </div>
            <button onClick={openTrip} className="w-full bg-aviro-orange text-white font-bold py-3 rounded-xl">
              {kind === 'completed' && booking.rider?.id !== user?.id
                ? 'View trip'
                : { accepted: 'Track your ride', arrived: 'Show my OTP', completed: 'Pay & rate' }[kind]}
            </button>
            <button onClick={close} className="w-full text-xs text-aviro-muted hover:text-white">Close</button>
          </>
        )}
      </div>
    </div>
  );
}

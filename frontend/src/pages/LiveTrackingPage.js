import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import L from 'leaflet';
import { WS_URL } from '../services/websocket';
import api from '../services/api';
import { getErrorMessage } from '../store/authSlice';
import PaymentChoiceModal from '../components/common/PaymentChoiceModal';
import ReviewModal from '../components/common/ReviewModal';
import { geocodePlace, fetchRoute, hasRealCoords, googleMapsDirections } from '../utils/geo';
import toast from 'react-hot-toast';

const QUICK_MESSAGES = [
  { label: '🚗 On my way!',  text: "I'm on my way!" },
  { label: '📍 I\'m here!',  text: "I've reached the pickup point!" },
  { label: '⏰ 5 min late',  text: 'Running 5 minutes late, sorry!' },
  { label: '🅿️ At gate',     text: "I'm waiting at the gate!" },
  { label: '👀 Can\'t find you', text: "I can't find you, please call me." },
  { label: '✅ Coming',      text: 'Coming, 1 minute!' },
];

// Trip progress shown to both people, like a cab app
const STEPS = [
  { key: 'ACCEPTED',   label: 'Accepted',   icon: '✅' },
  { key: 'ON_THE_WAY', label: 'On the way', icon: '🚗' },
  { key: 'ARRIVED',    label: 'Arrived',    icon: '📍' },
  { key: 'STARTED',    label: 'In trip',    icon: '🏁' },
  { key: 'COMPLETED',  label: 'Done',       icon: '🎉' },
];

const TRIP_TYPES = ['BOOKING_ACCEPTED', 'BOOKING_REJECTED', 'BOOKING_CANCELLED', 'TRIP_ON_THE_WAY',
  'TRIP_ARRIVED', 'TRIP_STARTED', 'RIDE_COMPLETED', 'PAYMENT_RECEIVED', 'BOOKING_REQUEST'];

const AVG_CITY_SPEED_KMH = 25;
const PUBLISH_EVERY_MS = 3000;
const REROUTE_AFTER_KM = 0.15;

// Straight-line distance in km
const distanceKm = (a, b) => {
  if (!a || !b) return null;
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const formatDistance = (km) => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
const etaMinutes = (km) => Math.max(1, Math.round(km / AVG_CITY_SPEED_KMH * 60));

const pinIcon = (bg, emoji, label) => L.divIcon({
  html: `<div style="position:relative">
    <div style="background:${bg};width:34px;height:34px;border-radius:50%;border:3px solid white;
      box-shadow:0 0 14px ${bg};display:flex;align-items:center;justify-content:center;font-size:17px;">${emoji}</div>
    ${label ? `<div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:${bg};color:white;
      font-size:9px;font-weight:bold;padding:1px 5px;border-radius:8px;white-space:nowrap;">${label}</div>` : ''}
  </div>`,
  iconSize: [34, 34], className: '', iconAnchor: [17, 17],
});
const meIcon = () => L.divIcon({
  html: `<div style="background:#3b82f6;width:18px;height:18px;border-radius:50%;border:3px solid white;
    box-shadow:0 0 12px rgba(59,130,246,0.9)"></div>`,
  iconSize: [18, 18], className: '', iconAnchor: [9, 9],
});

export default function LiveTrackingPage() {
  const { bookingId } = useParams();
  const navigate      = useNavigate();
  const { user }      = useSelector(s => s.auth);

  const [booking, setBooking]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [myLoc, setMyLoc]           = useState(null);
  const [otherLoc, setOtherLoc]     = useState(null);
  const [otherSeenAt, setOtherSeenAt] = useState(null);
  const [gpsStatus, setGpsStatus]   = useState('idle');
  const [otp, setOtp]               = useState('');
  const [otpInput, setOtpInput]     = useState('');
  const [busy, setBusy]             = useState(false);
  const [messages, setMessages]     = useState([]);
  const [showSOS, setShowSOS]       = useState(false);
  const [sosConfirm, setSosConfirm] = useState(false);
  const [showPay, setShowPay]       = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewed, setReviewed]     = useState(false);
  const [destination, setDestination] = useState(null);
  const [route, setRoute]           = useState(null);

  const clientRef     = useRef(null);
  const watchIdRef    = useRef(null);
  const lastLocRef    = useRef(null);
  const mapRef        = useRef(null);
  const mapInstance   = useRef(null);
  const markersRef    = useRef({});
  const fittedCountRef = useRef(0);
  const routeLineRef  = useRef(null);
  const routedRef     = useRef(null);
  const routeReqRef   = useRef(0);
  const fittedRouteRef = useRef(null);

  const isDriver = booking?.driver?.id === user?.id;
  const isRider  = booking?.rider?.id === user?.id;
  const stage = !booking ? null
    : booking.status === 'CONFIRMED' ? (booking.tripStage || 'ACCEPTED')
    : booking.status;
  const isLive = booking?.status === 'CONFIRMED';
  const other = isDriver ? booking?.rider : booking?.driver;
  const pickup = useMemo(() => (booking?.pickupLat && booking?.pickupLng
    ? { lat: booking.pickupLat, lng: booking.pickupLng } : null), [booking?.pickupLat, booking?.pickupLng]);
  const showMap = isLive || stage === 'REQUESTED';

  // Route on the map: driver → rider before pickup, then current position → destination
  const driverLoc = isDriver ? myLoc : otherLoc;
  const riderLoc  = isDriver ? (otherLoc || pickup) : (myLoc || pickup);
  const inTrip    = stage === 'STARTED';
  const routeFrom = inTrip ? (myLoc || otherLoc) : driverLoc;
  const routeTo   = inTrip ? destination : riderLoc;

  // ── Load booking (also called on every trip event) ──
  const loadBooking = useCallback(async () => {
    try {
      const r = await api.get(`/bookings/${bookingId}`);
      setBooking(r.data.data);
    } catch {
      toast.error('Booking not found');
      navigate('/bookings');
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigate]);

  useEffect(() => { loadBooking(); }, [loadBooking]);

  // ── Rider's OTP, shown until the trip starts ──
  useEffect(() => {
    if (!isRider || !isLive || stage === 'STARTED' || otp) return;
    api.get(`/bookings/${bookingId}/ride-otp`).then(r => setOtp(r.data.data?.otp || '')).catch(() => {});
  }, [isRider, isLive, stage, otp, bookingId]);

  // ── Map ──
  useEffect(() => {
    if (!showMap || !mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([18.5204, 73.8567], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map);
    mapRef.current.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9)';
    mapInstance.current = map;
    // Cleared on unmount: resizing a removed map throws
    const resizeTimer = setTimeout(() => map.invalidateSize(), 300);
    return () => {
      clearTimeout(resizeTimer);
      map.stop();
      map.remove(); mapInstance.current = null; markersRef.current = {}; fittedCountRef.current = 0;
      routeLineRef.current = null; fittedRouteRef.current = null;
    };
  }, [booking?.id, showMap]);

  // ── Destination point (older rides only stored the place name) ──
  useEffect(() => {
    if (!booking) return;
    if (hasRealCoords(booking.toLat, booking.toLng)) {
      setDestination({ lat: booking.toLat, lng: booking.toLng });
      return;
    }
    let cancelled = false;
    geocodePlace(booking.toLocation).then(p => { if (!cancelled && p) setDestination(p); });
    return () => { cancelled = true; };
  }, [booking?.id, booking?.toLat, booking?.toLng, booking?.toLocation]);

  // ── Road route; refreshed when someone moves a bit or the trip stage changes ──
  useEffect(() => {
    if (!isLive || !routeFrom || !routeTo) { setRoute(null); routedRef.current = null; return; }
    const last = routedRef.current;
    if (last && last.stage === stage && distanceKm(last.from, routeFrom) < REROUTE_AFTER_KM
        && distanceKm(last.to, routeTo) < REROUTE_AFTER_KM) return;
    routedRef.current = { stage, from: routeFrom, to: routeTo };
    const req = ++routeReqRef.current;
    fetchRoute(routeFrom, routeTo).then(r => {
      if (req !== routeReqRef.current) return;
      const straight = distanceKm(routeFrom, routeTo);
      // Without the routing service, fall back to a straight dashed line
      setRoute(r ? { ...r, stage } : {
        coords: [[routeFrom.lat, routeFrom.lng], [routeTo.lat, routeTo.lng]],
        distanceKm: straight, durationMin: etaMinutes(straight), straight: true, stage,
      });
    });
  }, [isLive, stage, routeFrom, routeTo]);

  // Draw the route, and frame it once per stage
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }
    if (!route) return;
    routeLineRef.current = L.polyline(route.coords, {
      color: route.stage === 'STARTED' ? '#22c55e' : '#f97316',
      weight: 5, opacity: 0.85, dashArray: route.straight ? '8 8' : null,
    }).addTo(map);
    if (fittedRouteRef.current !== route.stage) {
      fittedRouteRef.current = route.stage;
      map.invalidateSize();
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [50, 50], animate: true, maxZoom: 17 });
    }
  }, [route]);

  const placeMarker = useCallback((key, loc, icon, popup) => {
    const map = mapInstance.current;
    if (!map) return;
    const existing = markersRef.current[key];
    if (!loc) {
      if (existing) { map.removeLayer(existing); delete markersRef.current[key]; }
      return;
    }
    if (existing) existing.setLatLng([loc.lat, loc.lng]);
    else markersRef.current[key] = L.marker([loc.lat, loc.lng], { icon }).addTo(map).bindPopup(popup);
  }, []);

  const fitAll = useCallback(() => {
    const map = mapInstance.current;
    const points = [myLoc, otherLoc, inTrip ? destination : pickup].filter(Boolean).map(p => [p.lat, p.lng]);
    if (!map || points.length === 0) return;
    map.invalidateSize();
    if (points.length === 1) map.setView(points[0], 16, { animate: true });
    else map.fitBounds(points, { padding: [50, 50], animate: true, maxZoom: 17 });
  }, [myLoc, otherLoc, pickup, destination, inTrip]);

  // Keep markers in sync with locations
  useEffect(() => {
    if (!booking || !mapInstance.current) return;
    placeMarker('me', myLoc, meIcon(), '📍 You');
    placeMarker('other', otherLoc, isDriver
      ? pinIcon('#22c55e', '🙋', other?.fullName?.split(' ')[0] || 'Rider')
      : pinIcon('#f97316', booking.driver?.vehicleType === 'CAR' ? '🚗' : '🏍️', other?.fullName?.split(' ')[0] || 'Driver'),
      isDriver ? `🙋 ${other?.fullName || 'Rider'}` : `🚗 ${other?.fullName || 'Driver'}`);
    // Once the rider is in the vehicle the pickup pin is replaced by the destination
    placeMarker('pickup', inTrip ? null : pickup, pinIcon('#a855f7', '📌'), '📌 Pickup point');
    placeMarker('dest', destination, pinIcon('#ef4444', '🏁', booking.toLocation?.split(' ').slice(0, 2).join(' ')), `🏁 ${booking.toLocation}`);
    // Reframe when someone new appears on the map; otherwise let the user move it freely
    const known = [myLoc, otherLoc, pickup].filter(Boolean).length;
    if (known > fittedCountRef.current) { fitAll(); fittedCountRef.current = known; }
  }, [booking, myLoc, otherLoc, pickup, destination, inTrip, isDriver, other, placeMarker, fitAll]);

  // ── WebSocket: locations, trip events, quick messages ──
  useEffect(() => {
    if (!booking || !user) return;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${localStorage.getItem('aviro_token')}` },
      reconnectDelay: 3000,
      onConnect: () => {
        const onLoc = (frame) => {
          const d = JSON.parse(frame.body);
          if (String(d.bookingId) !== String(bookingId)) return;
          if (d.lat && d.lng) { setOtherLoc({ lat: d.lat, lng: d.lng }); setOtherSeenAt(Date.now()); }
        };
        if (isRider) client.subscribe('/user/queue/location', onLoc);
        if (isDriver) client.subscribe('/user/queue/rider-location', onLoc);

        client.subscribe('/user/queue/notifications', (frame) => {
          const n = JSON.parse(frame.body);
          if (String(n.referenceId) === String(bookingId) && TRIP_TYPES.includes(n.type)) {
            toast(n.title, { icon: '🔔' });
            loadBooking();
          }
        });

        client.subscribe('/user/queue/quick-message', (frame) => {
          const d = JSON.parse(frame.body);
          if (String(d.bookingId) !== String(bookingId)) return;
          setMessages(prev => [...prev, { ...d, received: true }]);
          toast(d.message, { icon: '💬', duration: 4000 });
        });
      },
    });
    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, [booking?.id, user, isRider, isDriver, bookingId, loadBooking]);

  // ── GPS: both people share automatically while the booking is confirmed ──
  useEffect(() => {
    if (!isLive || !navigator.geolocation) return;
    setGpsStatus('acquiring');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        lastLocRef.current = loc;
        setMyLoc(loc);
        setGpsStatus('active');
      },
      (err) => {
        setGpsStatus(err.code === 1 ? 'denied' : 'lost');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
    // A phone that is standing still reports no new positions, so resend the last one regularly
    const heartbeat = setInterval(() => {
      if (!lastLocRef.current || !clientRef.current?.connected) return;
      clientRef.current.publish({
        destination: isDriver ? '/app/location.update' : '/app/location.rider',
        body: JSON.stringify({ bookingId: Number(bookingId), ...lastLocRef.current, status: booking?.tripStage || 'ACCEPTED' }),
      });
    }, PUBLISH_EVERY_MS);
    return () => {
      clearInterval(heartbeat);
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isLive, isDriver, bookingId, booking?.tripStage]);

  // ── Actions ──
  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); await loadBooking(); }
    catch (err) { toast.error(getErrorMessage(err, 'Something went wrong')); }
    setBusy(false);
  };
  const accept   = () => run(() => api.patch(`/bookings/${bookingId}/status`, { status: 'CONFIRMED' }), 'Ride accepted ✅');
  const decline  = () => run(() => api.patch(`/bookings/${bookingId}/status`, { status: 'REJECTED' }), 'Request declined');
  const setTrip  = (s, msg) => run(() => api.patch(`/bookings/${bookingId}/trip`, { stage: s }), msg);
  const startTrip = () => {
    if (otpInput.length !== 4) { toast.error('Enter the 4-digit OTP from the rider'); return; }
    run(() => api.post(`/bookings/${bookingId}/verify-ride-otp`, { otp: otpInput }), 'Trip started 🏁');
  };
  const endTrip  = () => run(() => api.patch(`/bookings/${bookingId}/status`, { status: 'COMPLETED' }), 'Trip completed 🎉');
  const cancelRequest = () => {
    if (!window.confirm('Cancel this booking?')) return;
    run(() => api.delete(`/bookings/${bookingId}`), 'Booking cancelled');
  };
  const confirmCash = () => run(() => api.post(`/bookings/${bookingId}/confirm-cash`), 'Cash payment confirmed 💰');

  const sendQuickMsg = (text) => {
    if (!clientRef.current?.connected) { toast.error('Not connected'); return; }
    clientRef.current.publish({ destination: '/app/location.message', body: JSON.stringify({ bookingId: Number(bookingId), message: text }) });
    setMessages(prev => [...prev, { message: text, received: false, timestamp: Date.now() }]);
  };

  const sendSOS = () => {
    const send = async (lat, lng) => {
      const link = lat ? `https://maps.google.com/?q=${lat},${lng}` : 'location unavailable';
      try {
        await api.post('/safety/sos', { bookingId: Number(bookingId), lat, lng, message: `🆘 SOS ALERT from ${user.fullName}! Location: ${link}` });
        sendQuickMsg(`🆘 EMERGENCY! ${user.fullName} needs help! 📍 ${link}`);
        toast.error('🆘 SOS sent! Emergency contacts notified.', { duration: 6000 });
      } catch { toast.error('SOS failed — call 112!'); }
      setShowSOS(false); setSosConfirm(false);
    };
    if (myLoc) send(myLoc.lat, myLoc.lng);
    else navigator.geolocation?.getCurrentPosition(p => send(p.coords.latitude, p.coords.longitude), () => send(null, null));
  };

  if (loading || !booking) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-aviro-orange/30 border-t-aviro-orange rounded-full animate-spin" />
    </div>
  );

  if (!isDriver && !isRider) return <p className="text-center text-aviro-muted py-20">This trip is not yours.</p>;

  // Distance and time: road route when available, else straight line
  const gap = distanceKm(driverLoc, riderLoc);
  const routeNow = route && route.stage === stage ? route : null;
  const awayKm  = routeNow && !inTrip ? routeNow.distanceKm : gap;
  const awayMin = routeNow && !inTrip ? routeNow.durationMin : (gap != null ? etaMinutes(gap) : null);
  const navTarget = inTrip ? destination : riderLoc;
  const stepIndex = STEPS.findIndex(s => s.key === stage);
  const otherStale = otherSeenAt && Date.now() - otherSeenAt > 60000;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl">{isDriver ? 'Your Trip 🚗' : 'Your Ride 🗺️'}</h1>
          <p className="text-aviro-muted text-sm">{booking.fromLocation} → {booking.toLocation}</p>
        </div>
        <button onClick={() => navigate('/bookings')}
          className="text-aviro-muted text-sm border border-aviro-border px-3 py-1.5 rounded-lg hover:text-white">
          ← Bookings
        </button>
      </div>

      {/* Progress */}
      {stepIndex >= 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-aviro-border" />
            <div className="absolute top-5 left-0 h-0.5 bg-aviro-orange transition-all duration-700"
              style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }} />
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-col items-center gap-1 z-10">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg transition-all
                  ${i <= stepIndex ? 'bg-aviro-orange border-aviro-orange' : 'bg-aviro-card2 border-aviro-border'}`}>{s.icon}</div>
                <span className={`text-xs font-medium text-center w-14 ${i <= stepIndex ? 'text-aviro-orange' : 'text-aviro-muted'}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main status card */}
      <div className="card p-5 space-y-4" data-testid="trip-status">
        {/* ── REQUESTED ── */}
        {stage === 'REQUESTED' && isRider && (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto border-4 border-aviro-orange/30 border-t-aviro-orange rounded-full animate-spin" />
            <p className="font-bold text-lg">Waiting for {booking.driver?.fullName?.split(' ')[0] || 'the driver'} to accept…</p>
            <p className="text-sm text-aviro-muted">You'll get a notification as soon as they respond.</p>
            <button onClick={cancelRequest} disabled={busy} className="text-sm text-red-400 hover:underline">Cancel request</button>
          </div>
        )}
        {stage === 'REQUESTED' && isDriver && (
          <div className="space-y-3">
            <p className="font-bold text-lg">🔔 New ride request</p>
            <p className="text-sm text-aviro-muted">{booking.rider?.fullName} wants {booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''} · ₹{booking.totalAmount}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={accept} disabled={busy} className="bg-aviro-green text-white font-bold py-3 rounded-xl">✅ Accept</button>
              <button onClick={decline} disabled={busy} className="bg-red-500/10 text-red-400 border border-red-500/30 font-bold py-3 rounded-xl">Decline</button>
            </div>
          </div>
        )}

        {/* ── LIVE TRIP ── */}
        {isLive && (
          <>
            <div>
              <p className="font-bold text-lg">
                {isRider ? {
                  ACCEPTED:   `✅ ${other?.fullName?.split(' ')[0]} accepted your ride`,
                  ON_THE_WAY: `🚗 ${other?.fullName?.split(' ')[0]} is on the way`,
                  ARRIVED:    `📍 ${other?.fullName?.split(' ')[0]} has arrived!`,
                  STARTED:    `🏁 On the way to ${booking.toLocation}`,
                }[stage] : {
                  ACCEPTED:   'Head to the pickup when you\'re ready',
                  ON_THE_WAY: `Picking up ${other?.fullName?.split(' ')[0]}`,
                  ARRIVED:    `Ask ${other?.fullName?.split(' ')[0]} for the ride OTP`,
                  STARTED:    `Drop ${other?.fullName?.split(' ')[0]} at ${booking.toLocation}`,
                }[stage]}
              </p>
              {awayKm != null && !inTrip && (
                <p className="text-sm text-aviro-muted mt-1">
                  {isDriver ? 'Rider' : 'Driver'} is <span className="text-white font-semibold">{formatDistance(awayKm)}</span> away
                  {awayKm > 0.05 && <> · about <span className="text-white font-semibold">{awayMin} min</span></>}
                </p>
              )}
              {inTrip && (
                <p className="text-sm text-aviro-muted mt-1" data-testid="trip-eta">
                  {routeNow
                    ? <>🏁 <span className="text-white font-semibold">{formatDistance(routeNow.distanceKm)}</span> · about <span className="text-white font-semibold">{routeNow.durationMin} min</span> to {booking.toLocation}</>
                    : <>Finding the route to {booking.toLocation}…</>}
                </p>
              )}
              {otherStale && <p className="text-xs text-yellow-400 mt-1">⚠️ {isDriver ? 'Rider' : 'Driver'}'s location hasn't updated for a minute</p>}
            </div>

            {/* Rider: OTP to share at pickup */}
            {isRider && stage !== 'STARTED' && otp && (
              <div className={`rounded-xl p-4 text-center border ${stage === 'ARRIVED' ? 'bg-aviro-orange/10 border-aviro-orange' : 'bg-aviro-card2 border-aviro-border'}`}>
                <p className="text-xs text-aviro-muted mb-1">Share this OTP with your driver at pickup</p>
                <p className="font-mono font-bold text-3xl tracking-[0.4em] text-aviro-orange" data-testid="rider-otp">{otp}</p>
              </div>
            )}

            {/* Turn-by-turn navigation for the driver */}
            {isDriver && (navTarget || inTrip) && (
              <a href={googleMapsDirections(navTarget, booking.toLocation)} target="_blank" rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-aviro-card2 border border-aviro-border text-sm font-semibold py-2.5 rounded-xl hover:border-aviro-orange/50">
                🧭 Navigate to {inTrip ? 'drop' : 'pickup'} in Google Maps
              </a>
            )}

            {/* Driver controls */}
            {isDriver && stage === 'ACCEPTED' && (
              <button onClick={() => setTrip('ON_THE_WAY', 'Rider notified that you are on the way')} disabled={busy}
                className="w-full bg-aviro-orange text-white font-bold py-3 rounded-xl">🚗 Start heading to pickup</button>
            )}
            {isDriver && stage === 'ON_THE_WAY' && (
              <button onClick={() => setTrip('ARRIVED', 'Rider notified that you arrived')} disabled={busy}
                className="w-full bg-aviro-blue text-white font-bold py-3 rounded-xl">📍 I've arrived at pickup</button>
            )}
            {isDriver && stage === 'ARRIVED' && (
              <div className="space-y-2">
                <input value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric" placeholder="Rider's 4-digit OTP" aria-label="Rider OTP"
                  className="input-field text-center font-mono text-2xl tracking-[0.4em]" />
                <button onClick={startTrip} disabled={busy}
                  className="w-full bg-aviro-green text-white font-bold py-3 rounded-xl">🏁 Verify OTP & start trip</button>
              </div>
            )}
            {isDriver && stage === 'STARTED' && (
              <button onClick={() => window.confirm('End this trip?') && endTrip()} disabled={busy}
                className="w-full bg-aviro-blue text-white font-bold py-3 rounded-xl">🏁 End trip</button>
            )}
            {isRider && ['ACCEPTED', 'ON_THE_WAY'].includes(stage) && (
              <button onClick={cancelRequest} disabled={busy} className="w-full text-xs text-red-400 hover:underline">Cancel booking</button>
            )}

            {gpsStatus === 'denied' && (
              <p className="text-xs text-red-400">Location permission is off — allow it in the browser so {isDriver ? 'the rider' : 'the driver'} can see you.</p>
            )}
          </>
        )}

        {/* ── COMPLETED ── */}
        {stage === 'COMPLETED' && (
          <div className="space-y-3 text-center">
            <p className="text-4xl">🎉</p>
            <p className="font-bold text-lg">Trip completed · ₹{booking.totalAmount}</p>
            {isRider && booking.paymentStatus !== 'COMPLETED' && !booking.paymentMethod && (
              <button onClick={() => setShowPay(true)} className="w-full bg-aviro-green text-white font-bold py-3 rounded-xl">💳 Pay ₹{booking.totalAmount}</button>
            )}
            {booking.paymentMethod === 'CASH' && booking.paymentStatus !== 'COMPLETED' && (
              isDriver
                ? <button onClick={confirmCash} disabled={busy} className="w-full bg-aviro-green text-white font-bold py-3 rounded-xl">✅ I received the cash</button>
                : <p className="text-sm text-yellow-400">💵 Waiting for the driver to confirm your cash payment</p>
            )}
            {isDriver && !booking.paymentMethod && <p className="text-sm text-aviro-muted">Waiting for the rider to pay…</p>}
            {booking.paymentStatus === 'COMPLETED' && <p className="text-sm text-aviro-green">✅ Payment complete</p>}
            {!reviewed && (
              <button onClick={() => setShowReview(true)} className="w-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-semibold py-2.5 rounded-xl">
                ⭐ Rate {other?.fullName?.split(' ')[0] || (isDriver ? 'rider' : 'driver')}
              </button>
            )}
          </div>
        )}

        {/* ── REJECTED / CANCELLED ── */}
        {['REJECTED', 'CANCELLED'].includes(stage) && (
          <div className="text-center space-y-3">
            <p className="text-4xl">{stage === 'REJECTED' ? '😕' : '🚫'}</p>
            <p className="font-bold">{stage === 'REJECTED' ? 'The driver could not take this ride' : 'This booking was cancelled'}</p>
            {isRider && <Link to="/search" className="btn-primary inline-block">Find another ride</Link>}
          </div>
        )}
      </div>

      {/* Map */}
      {showMap && (
        <div className="card overflow-hidden rounded-2xl relative">
          <div ref={mapRef} style={{ height: '320px', width: '100%', background: '#1a1a2e' }} />
          <button onClick={fitAll} className="absolute bottom-12 right-2 z-[1000] bg-white text-gray-800 font-bold px-3 py-2 rounded-xl shadow-lg text-xs">
            🎯 Recenter
          </button>
          <div className="absolute bottom-2 left-2 z-[1000] bg-black/80 rounded-lg px-3 py-1.5 flex items-center gap-3 text-xs text-white">
            <span>🔵 You</span>
            <span>{isDriver ? '🟢 Rider' : '🟠 Driver'}</span>
            {pickup && !inTrip && <span>📌 Pickup</span>}
            {destination && <span>🏁 Drop</span>}
            {isLive && <span className={gpsStatus === 'active' ? 'text-aviro-green' : 'text-aviro-muted'}>
              {gpsStatus === 'active' ? '● Sharing live' : gpsStatus === 'acquiring' ? '○ Getting GPS…' : '○ GPS off'}
            </span>}
          </div>
        </div>
      )}

      {/* Person card */}
      <div className="card p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-aviro-card2 flex items-center justify-center text-2xl">
          {other?.gender === 'FEMALE' ? '👩' : '👨'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{other?.fullName}</p>
          <p className="text-xs text-aviro-muted">{isDriver ? 'Your rider' : 'Your driver'} · ⭐ {other?.rating?.toFixed(1) || '5.0'}</p>
          {isRider && booking.driver?.vehicleModel && (
            <p className="text-xs text-aviro-muted truncate">
              {booking.driver.vehicleModel} · {booking.driver.vehicleColor}
              {booking.driver.vehicleRegistrationNumber && <> · <span className="text-white font-semibold">{booking.driver.vehicleRegistrationNumber}</span></>}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {other?.phone && <a href={`tel:${other.phone}`} className="w-10 h-10 rounded-full bg-aviro-green/15 flex items-center justify-center" aria-label="Call">📞</a>}
          {isLive && <Link to="/chat" className="w-10 h-10 rounded-full bg-aviro-orange/15 flex items-center justify-center" aria-label="Chat">💬</Link>}
        </div>
      </div>

      {/* Quick messages */}
      {isLive && (
        <div className="card p-4 space-y-3">
          <h3 className="font-bold text-sm">💬 Quick messages</h3>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_MESSAGES.map(m => (
              <button key={m.label} onClick={() => sendQuickMsg(m.text)}
                className="bg-aviro-card2 border border-aviro-border text-xs font-medium py-2.5 px-2 rounded-xl hover:border-aviro-orange/50">
                {m.label}
              </button>
            ))}
          </div>
          {messages.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.received ? 'justify-start' : 'justify-end'}`}>
                  <div className={`text-xs px-3 py-2 rounded-xl max-w-xs ${m.received ? 'bg-aviro-card2 border border-aviro-border' : 'bg-aviro-orange text-white'}`}>{m.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SOS */}
      {isLive && (
        <button onClick={() => setShowSOS(true)} className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600">
          🆘 SOS Emergency
        </button>
      )}
      {showSOS && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-aviro-card border border-red-500/50 rounded-2xl w-full max-w-sm p-6 space-y-3 text-center">
            <p className="text-4xl">🆘</p>
            <h3 className="font-bold text-xl text-red-400">Emergency alert</h3>
            <p className="text-aviro-muted text-sm">Sends your live location to your emergency contacts and the {isDriver ? 'rider' : 'driver'}.</p>
            {!sosConfirm
              ? <button onClick={() => setSosConfirm(true)} className="w-full bg-red-500 text-white font-bold py-3 rounded-xl">Yes, send SOS</button>
              : <button onClick={sendSOS} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl">Confirm — SEND NOW</button>}
            <button onClick={() => { setShowSOS(false); setSosConfirm(false); }} className="w-full bg-aviro-card2 text-aviro-muted font-semibold py-3 rounded-xl">Cancel</button>
            <p className="text-xs text-aviro-muted">Emergency: <span className="text-red-400 font-bold">112</span></p>
          </div>
        </div>
      )}

      {showPay && (
        <PaymentChoiceModal booking={booking} onClose={() => setShowPay(false)}
          onPaid={() => { setShowPay(false); loadBooking(); }} />
      )}
      {showReview && (
        <ReviewModal booking={booking} revieweeId={other?.id} revieweeName={other?.fullName}
          revieweeGender={other?.gender}
          onClose={() => setShowReview(false)} onSubmitted={() => setReviewed(true)} />
      )}
    </div>
  );
}

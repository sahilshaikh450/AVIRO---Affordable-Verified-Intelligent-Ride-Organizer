import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../services/api';
import toast from 'react-hot-toast';

const BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8080';

const QUICK_MESSAGES = [
  { label: "🚗 On my way!", text: "I'm on my way to pickup!" },
  { label: "📍 I'm here!", text: "I've arrived at the pickup point!" },
  { label: "⏰ 5 min late", text: "Running 5 minutes late, sorry!" },
  { label: "⏰ 10 min late", text: "Running 10 minutes late, sorry!" },
  { label: "🅿️ At gate", text: "I'm waiting at the gate!" },
  { label: "✅ Ready!", text: "Ready to go, come outside!" },
];

const RIDE_STEPS = [
  { key: 'CONFIRMED',  label: 'Confirmed',   icon: '✅' },
  { key: 'ON_THE_WAY', label: 'On the Way',  icon: '🚗' },
  { key: 'ARRIVED',    label: 'Arrived',     icon: '📍' },
  { key: 'STARTED',    label: 'Started',     icon: '🏁' },
  { key: 'COMPLETED',  label: 'Completed',   icon: '🎉' },
];

export default function LiveTrackingPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);

  const [booking, setBooking]           = useState(null);
  const [rideStatus, setRideStatus]     = useState('CONFIRMED');
  const [driverLoc, setDriverLoc]       = useState(null);
  const [messages, setMessages]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [sharing, setSharing]           = useState(false);
  const [locationLost, setLocationLost] = useState(false);
  const [showSOS, setShowSOS]           = useState(false);
  const [sosConfirm, setSosConfirm]     = useState(false);
  const [mapReady, setMapReady]         = useState(false);
  const [lastSeen, setLastSeen]         = useState(null);

  const clientRef       = useRef(null);
  const watchIdRef      = useRef(null);
  const mapRef          = useRef(null);
  const mapInstance     = useRef(null);
  const driverMarkerRef = useRef(null);
  const myMarkerRef     = useRef(null);
  const locationTimerRef = useRef(null); // ⚠️ location lost detection

  const isDriver = booking?.driver?.id === user?.id;
  const isRider  = booking?.rider?.id === user?.id;

  useEffect(() => {
    api.get(`/bookings/${bookingId}`)
      .then(r => { setBooking(r.data.data); setLoading(false); })
      .catch(() => { toast.error('Booking not found'); navigate('/bookings'); });
  }, [bookingId]);

  // ── Init Leaflet map ──
  useEffect(() => {
    if (!booking) return;
    const initMap = () => {
      if (!window.L || !mapRef.current || mapInstance.current) return;
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: true }).setView([18.5204, 73.8567], 14);
      mapInstance.current = map;
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO', maxZoom: 19
      }).addTo(map);
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 300);
    };
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (window.L) initMap();
    else {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = initMap;
      document.head.appendChild(s);
    }
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [booking]);

  // ── WebSocket ──
  useEffect(() => {
    if (!booking || !user) return;
    const token = localStorage.getItem('aviro_token');
    const client = new Client({
      webSocketFactory: () => new SockJS(`${BASE_URL}/api/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        // Rider listens to driver location
        if (isRider) {
          client.subscribe(`/user/${user.id}/queue/location`, (frame) => {
            const data = JSON.parse(frame.body);
            if (data.status) setRideStatus(data.status);
            if (data.lat && data.lng) {
              setDriverLoc({ lat: data.lat, lng: data.lng });
              setLastSeen(Date.now());
              setLocationLost(false);
              updateMarker(data.lat, data.lng, 'driver');

              // ⚠️ Reset location lost timer — if no update in 30s → alert
              clearTimeout(locationTimerRef.current);
              locationTimerRef.current = setTimeout(() => {
                setLocationLost(true);
                toast('⚠️ Driver location signal lost!', { icon: '🔴', duration: 5000 });
              }, 30000);
            }
          });
        }

        // Both: quick messages
        client.subscribe(`/user/${user.id}/queue/quick-message`, (frame) => {
          const data = JSON.parse(frame.body);
          setMessages(prev => [...prev, { ...data, received: true }]);
          toast(data.message, { icon: '💬', duration: 4000 });
        });
      },
    });
    client.activate();
    clientRef.current = client;
    return () => { client.deactivate(); clearTimeout(locationTimerRef.current); };
  }, [booking, user]);

  const updateMarker = (lat, lng, type) => {
    if (!mapInstance.current || !window.L) return;
    const L = window.L;
    const isDriverMarker = type === 'driver';

    const icon = L.divIcon({
      html: isDriverMarker
        ? `<div style="background:#f97316;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(249,115,22,0.9);display:flex;align-items:center;justify-content:center;font-size:12px;">🏍️</div>`
        : `<div style="background:#3b82f6;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.9)"></div>`,
      iconSize: [22, 22], className: ''
    });

    const markerRef = isDriverMarker ? driverMarkerRef : myMarkerRef;
    const label = isDriverMarker ? '🏍️ Driver' : '📍 You';

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon })
        .addTo(mapInstance.current).bindPopup(label);
    }
    mapInstance.current.panTo([lat, lng]);
  };

  // ── Driver: Start GPS sharing ──
  // 🔒 SAFETY: Driver cannot manually stop during active ride
  const startSharing = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setSharing(true);
    toast.success('📍 Live location sharing started!');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        updateMarker(lat, lng, 'self');

        if (clientRef.current?.connected) {
          clientRef.current.publish({
            destination: '/app/location.update',
            body: JSON.stringify({
              bookingId: parseInt(bookingId),
              lat, lng,
              status: rideStatus,
            }),
          });
        }
      },
      (err) => {
        // GPS error — alert rider automatically
        toast.error('GPS signal lost! Rider has been notified.');
        if (clientRef.current?.connected) {
          clientRef.current.publish({
            destination: '/app/location.update',
            body: JSON.stringify({
              bookingId: parseInt(bookingId),
              status: 'LOCATION_LOST',
            }),
          });
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  };

  // 🔒 SAFETY: Only auto-stops on ride completion
  const autoStopSharing = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    setSharing(false);
  };

  // ── Mark arrived ──
  const markArrived = async () => {
    try {
      await api.post(`/location/arrived/${bookingId}`);
      setRideStatus('ARRIVED');
      toast.success('📍 Rider notified — you arrived!');
    } catch { toast.error('Failed'); }
  };

  // ── Mark ride started ──
  const markStarted = () => {
    setRideStatus('STARTED');
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: '/app/location.update',
        body: JSON.stringify({ bookingId: parseInt(bookingId), status: 'STARTED' }),
      });
    }
    toast.success('🏁 Ride started!');
  };

  // ── 🆘 SOS Alert ──
  const sendSOS = async () => {
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;

        await api.post('/notifications/sos', {
          bookingId: parseInt(bookingId),
          lat, lng,
          message: `🆘 SOS ALERT from ${user.fullName}! Current location: ${mapsLink}`,
        });

        // Also alert via WebSocket to driver/rider
        const targetId = isDriver ? booking.rider.id : booking.driver.id;
        if (clientRef.current?.connected) {
          clientRef.current.publish({
            destination: '/app/location.message',
            body: JSON.stringify({
              bookingId: parseInt(bookingId),
              message: `🆘 EMERGENCY ALERT! ${user.fullName} needs help! Location: ${mapsLink}`,
              senderId: user.id,
            }),
          });
        }

        toast.error('🆘 SOS sent! Emergency contacts & driver notified.', { duration: 6000 });
        setShowSOS(false);
        setSosConfirm(false);
      }, () => {
        toast.error('Could not get location for SOS');
      });
    } catch { toast.error('SOS failed, call 112 directly'); }
  };

  // ── Send quick message ──
  const sendQuickMsg = (text) => {
    if (!clientRef.current?.connected) { toast.error('Not connected'); return; }
    clientRef.current.publish({
      destination: '/app/location.message',
      body: JSON.stringify({ bookingId: parseInt(bookingId), message: text, senderId: user.id }),
    });
    setMessages(prev => [...prev, { message: text, received: false, timestamp: Date.now() }]);
    toast.success('✅ Message sent!');
  };

  const stepIndex = RIDE_STEPS.findIndex(s => s.key === rideStatus);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 border-2 border-aviro-orange/30 border-t-aviro-orange rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10 animate-fade-up">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl">Live Tracking 🗺️</h1>
          <p className="text-aviro-muted text-sm">{booking?.fromLocation} → {booking?.toLocation}</p>
        </div>
        <button onClick={() => navigate('/bookings')}
          className="text-aviro-muted text-sm border border-aviro-border px-3 py-1.5 rounded-lg hover:text-white">
          ← Back
        </button>
      </div>

      {/* ── 🆘 SOS Button — always visible ── */}
      <button onClick={() => setShowSOS(true)}
        className="w-full bg-red-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 animate-pulse hover:animate-none hover:bg-red-600 transition-colors">
        🆘 SOS Emergency Alert
      </button>

      {/* SOS Confirm Modal */}
      {showSOS && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-aviro-card border border-red-500/50 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <p className="text-4xl mb-3">🆘</p>
              <h3 className="font-bold text-xl text-red-400">Emergency Alert</h3>
              <p className="text-aviro-muted text-sm mt-2">
                This will send your live location to your emergency contacts and the {isDriver ? 'rider' : 'driver'}.
              </p>
            </div>
            {!sosConfirm ? (
              <div className="space-y-2">
                <button onClick={() => setSosConfirm(true)}
                  className="w-full bg-red-500 text-white font-bold py-3 rounded-xl">
                  🆘 Yes, Send SOS Alert
                </button>
                <button onClick={() => setShowSOS(false)}
                  className="w-full bg-aviro-card2 text-aviro-muted font-semibold py-3 rounded-xl">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-red-400 text-sm font-semibold text-center">Are you sure? This is a real emergency?</p>
                <button onClick={sendSOS}
                  className="w-full bg-red-600 text-white font-bold py-3 rounded-xl">
                  🆘 YES — SEND NOW
                </button>
                <button onClick={() => { setShowSOS(false); setSosConfirm(false); }}
                  className="w-full bg-aviro-card2 text-aviro-muted font-semibold py-3 rounded-xl">
                  Cancel
                </button>
              </div>
            )}
            <p className="text-xs text-aviro-muted text-center">
              For immediate help, call <span className="text-red-400 font-bold">112</span>
            </p>
          </div>
        </div>
      )}

      {/* ── ⚠️ Location Lost Warning ── */}
      {locationLost && isRider && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-red-400 font-bold text-sm">Driver location signal lost!</p>
            <p className="text-xs text-aviro-muted">
              Last seen: {lastSeen ? new Date(lastSeen).toLocaleTimeString() : 'Unknown'}
              {' · '}If you feel unsafe, press SOS above.
            </p>
          </div>
        </div>
      )}

      {/* ── Ride Progress Bar ── */}
      <div className="card p-4">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-aviro-border z-0"/>
          <div className="absolute top-5 left-0 h-0.5 bg-aviro-orange z-0 transition-all duration-700"
            style={{ width: `${(stepIndex / (RIDE_STEPS.length - 1)) * 100}%` }}/>
          {RIDE_STEPS.map((step, i) => (
            <div key={step.key} className="flex flex-col items-center gap-1 z-10">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg transition-all
                ${i <= stepIndex ? 'bg-aviro-orange border-aviro-orange' : 'bg-aviro-card2 border-aviro-border'}`}>
                {step.icon}
              </div>
              <span className={`text-xs font-medium text-center w-14
                ${i <= stepIndex ? 'text-aviro-orange' : 'text-aviro-muted'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Live Map ── */}
      <div className="card overflow-hidden rounded-2xl">
        <div ref={mapRef} style={{ height: '300px', width: '100%', background: '#1a1a2e' }}/>
      </div>

      {/* ── Driver Controls ── */}
      {isDriver && (
        <div className="card p-4 space-y-3">
          <h3 className="font-bold text-sm">🚗 Driver Controls</h3>

          {/* 🔒 Safety notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
            <p className="text-xs text-yellow-400">
              🔒 Location sharing runs automatically during the ride for rider safety. It stops only when ride is completed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!sharing ? (
              <button onClick={startSharing}
                className="bg-aviro-green text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 flex items-center justify-center gap-2">
                📍 Start Sharing
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-aviro-green/10 border border-aviro-green/20 rounded-xl px-3 py-3">
                <span className="w-2 h-2 bg-aviro-green rounded-full animate-pulse"/>
                <span className="text-xs text-aviro-green font-medium">Live & Active</span>
              </div>
            )}

            {rideStatus === 'ON_THE_WAY' || rideStatus === 'CONFIRMED' ? (
              <button onClick={markArrived}
                className="bg-aviro-blue text-white font-bold py-3 rounded-xl text-sm hover:opacity-90">
                📍 Mark Arrived
              </button>
            ) : rideStatus === 'ARRIVED' ? (
              <button onClick={markStarted}
                className="bg-aviro-orange text-white font-bold py-3 rounded-xl text-sm hover:opacity-90">
                🏁 Start Ride
              </button>
            ) : (
              <div className="bg-aviro-card2 rounded-xl flex items-center justify-center text-xs text-aviro-muted py-3">
                Ride in progress
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Rider: Driver location status ── */}
      {isRider && (
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-2">📍 Driver Status</h3>
          {driverLoc ? (
            <div className="flex items-center gap-3 bg-aviro-green/10 border border-aviro-green/20 rounded-xl px-4 py-3">
              <span className="w-3 h-3 bg-aviro-green rounded-full animate-pulse"/>
              <div>
                <p className="text-sm font-semibold text-aviro-green">Driver location is live!</p>
                <p className="text-xs text-aviro-muted">Map updating in real-time 🗺️</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-aviro-card2 border border-aviro-border rounded-xl px-4 py-3">
              <span className="text-xl">⏳</span>
              <div>
                <p className="text-sm font-semibold">Waiting for driver location...</p>
                <p className="text-xs text-aviro-muted">Driver will share when on the way</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Messages ── */}
      <div className="card p-4 space-y-3">
        <h3 className="font-bold text-sm">💬 Quick Messages</h3>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_MESSAGES.map((msg, i) => (
            <button key={i} onClick={() => sendQuickMsg(msg.text)}
              className="bg-aviro-card2 border border-aviro-border text-xs font-medium py-2.5 px-2 rounded-xl hover:border-aviro-orange/50 hover:bg-aviro-orange/5 transition-all text-center">
              {msg.label}
            </button>
          ))}
        </div>

        {messages.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto mt-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.received ? 'justify-start' : 'justify-end'}`}>
                <div className={`text-xs px-3 py-2 rounded-xl max-w-xs
                  ${m.received ? 'bg-aviro-card2 text-white border border-aviro-border' : 'bg-aviro-orange text-white'}`}>
                  {m.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Rider/Driver info ── */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-aviro-card2 flex items-center justify-center text-2xl">
              {isDriver
                ? (booking?.rider?.gender === 'FEMALE' ? '👩' : '👨')
                : (booking?.driver?.gender === 'FEMALE' ? '👩' : '👨')}
            </div>
            <div>
              <p className="font-bold text-sm">
                {isDriver ? booking?.rider?.fullName : booking?.driver?.fullName}
              </p>
              <p className="text-xs text-aviro-muted">{isDriver ? 'Your Rider' : 'Your Driver'}</p>
              <p className="text-xs text-aviro-muted">
                ⭐ {isDriver ? booking?.rider?.rating?.toFixed(1) : booking?.driver?.rating?.toFixed(1)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-aviro-green font-bold text-lg">₹{booking?.totalAmount}</p>
            <p className="text-xs text-aviro-muted">{booking?.seatsBooked} seat{booking?.seatsBooked > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Safety tips */}
      <div className="bg-aviro-card2 border border-aviro-border rounded-xl p-4">
        <p className="text-xs text-aviro-muted font-semibold mb-2">🛡️ Safety Tips</p>
        <p className="text-xs text-aviro-muted">• Share this trip with a trusted contact before riding</p>
        <p className="text-xs text-aviro-muted">• Press SOS if you feel unsafe at any point</p>
        <p className="text-xs text-aviro-muted">• For emergencies, call <span className="text-red-400 font-bold">112</span></p>
      </div>
    </div>
  );
}
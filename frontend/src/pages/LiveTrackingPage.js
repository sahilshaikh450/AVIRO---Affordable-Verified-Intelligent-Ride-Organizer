import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../services/api';
import toast from 'react-hot-toast';

const BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8080';

const QUICK_MESSAGES = [
  { label: "🚗 On my way!", text: "I'm on my way to pickup!" },
  { label: "📍 I'm here!",  text: "I've arrived at the pickup point!" },
  { label: "⏰ 5 min late", text: "Running 5 minutes late, sorry!" },
  { label: "⏰ 10 min late",text: "Running 10 minutes late, sorry!" },
  { label: "🅿️ At gate",   text: "I'm waiting at the gate!" },
  { label: "✅ Ready!",     text: "Ready to go, come outside!" },
];

const RIDE_STEPS = [
  { key: 'CONFIRMED',  label: 'Confirmed',  icon: '✅' },
  { key: 'ON_THE_WAY', label: 'On the Way', icon: '🚗' },
  { key: 'ARRIVED',    label: 'Arrived',    icon: '📍' },
  { key: 'STARTED',    label: 'Started',    icon: '🏁' },
  { key: 'COMPLETED',  label: 'Completed',  icon: '🎉' },
];

// ── Smooth marker animation ──
function animateMarker(marker, newLat, newLng, map) {
  if (!marker || !map) return;
  const startLat = marker.getLatLng().lat;
  const startLng = marker.getLatLng().lng;
  const frames = 30;
  let frame = 0;
  const step = () => {
    frame++;
    const t = frame / frames;
    const lat = startLat + (newLat - startLat) * t;
    const lng = startLng + (newLng - startLng) * t;
    marker.setLatLng([lat, lng]);
    if (frame < frames) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export default function LiveTrackingPage() {
  const { bookingId } = useParams();
  const navigate      = useNavigate();
  const { user }      = useSelector(s => s.auth);

  const [booking, setBooking]           = useState(null);
  const [rideStatus, setRideStatus]     = useState('CONFIRMED');
  const [driverLoc, setDriverLoc]       = useState(null);
  const [myLoc, setMyLoc]               = useState(null);
  const [messages, setMessages]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [sharing, setSharing]           = useState(false);
  const [locationLost, setLocationLost] = useState(false);
  const [showSOS, setShowSOS]           = useState(false);
  const [sosConfirm, setSosConfirm]     = useState(false);
  const [mapReady, setMapReady]         = useState(false);
  const [lastSeen, setLastSeen]         = useState(null);
  const [accuracy, setAccuracy]         = useState(null);
  const [gpsStatus, setGpsStatus]       = useState('idle'); // idle | acquiring | active | lost

  const clientRef        = useRef(null);
  const watchIdRef       = useRef(null);
  const mapRef           = useRef(null);
  const mapInstance      = useRef(null);
  const driverMarkerRef  = useRef(null);
  const myMarkerRef      = useRef(null);
  const riderMarkerRef   = useRef(null);
  const locationTimerRef = useRef(null);
  const routeLineRef     = useRef(null);

  const isDriver = booking?.driver?.id === user?.id;
  const isRider  = booking?.rider?.id === user?.id;

  // ── Fetch booking ──
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

      // Start at Pune center
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([18.5204, 73.8567], 15);

      mapInstance.current = map;

      // Dark map tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO', maxZoom: 19
      }).addTo(map);

      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 300);

      // ── Auto-detect my location on map load ──
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            map.setView([lat, lng], 16);
            addMyLocationMarker(lat, lng, L, map);
            setMyLoc({ lat, lng });
          },
          () => {}, // silent fail
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
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

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [booking]);

  // ── Add "my location" blue dot marker ──
  const addMyLocationMarker = (lat, lng, L, map) => {
    const icon = L.divIcon({
      html: `<div style="position:relative">
        <div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.9)"></div>
        <div style="position:absolute;top:-4px;left:-4px;width:24px;height:24px;border-radius:50%;background:rgba(59,130,246,0.2);animation:pulse 2s infinite"></div>
      </div>`,
      iconSize: [16, 16], className: '', iconAnchor: [8, 8]
    });
    if (myMarkerRef.current) {
      myMarkerRef.current.setLatLng([lat, lng]);
    } else {
      myMarkerRef.current = L.marker([lat, lng], { icon })
        .addTo(map).bindPopup('📍 Your Location');
    }
  };

  // ── Draw route line between driver and rider ──
  const drawRoute = useCallback((dLat, dLng, rLat, rLng) => {
    if (!mapInstance.current || !window.L) return;
    const L = window.L;
    if (routeLineRef.current) {
      mapInstance.current.removeLayer(routeLineRef.current);
    }
    routeLineRef.current = L.polyline(
      [[dLat, dLng], [rLat, rLng]],
      { color: '#f97316', weight: 3, opacity: 0.6, dashArray: '8, 6' }
    ).addTo(mapInstance.current);
  }, []);

  // ── WebSocket connection ──
  useEffect(() => {
    if (!booking || !user) return;
    const token = localStorage.getItem('aviro_token');

    const client = new Client({
      webSocketFactory: () => new SockJS(`${BASE_URL}/api/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        // Rider: listen to driver location updates
        if (isRider) {
          client.subscribe(`/user/${user.id}/queue/location`, (frame) => {
            const data = JSON.parse(frame.body);

            if (data.status === 'LOCATION_LOST') {
              setLocationLost(true);
              setGpsStatus('lost');
              toast('⚠️ Driver location signal lost!', { icon: '🔴', duration: 5000 });
              return;
            }

            if (data.status) setRideStatus(data.status);

            if (data.lat && data.lng) {
              const newLoc = { lat: data.lat, lng: data.lng };
              setDriverLoc(newLoc);
              setLastSeen(Date.now());
              setLocationLost(false);
              setGpsStatus('active');

              // Update/animate driver marker
              if (!mapInstance.current || !window.L) return;
              const L = window.L;

              const icon = L.divIcon({
                html: `<div style="position:relative">
                  <div style="background:#f97316;width:36px;height:36px;border-radius:50%;border:3px solid white;
                    box-shadow:0 0 16px rgba(249,115,22,0.9);display:flex;align-items:center;justify-content:center;font-size:18px;">
                    ${booking?.driver?.gender === 'FEMALE' ? '🛵' : '🏍️'}
                  </div>
                  <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
                    background:#f97316;color:white;font-size:9px;font-weight:bold;padding:1px 5px;border-radius:8px;white-space:nowrap;">
                    ${booking?.driver?.fullName?.split(' ')[0] || 'Driver'}
                  </div>
                </div>`,
                iconSize: [36, 42], className: '', iconAnchor: [18, 42]
              });

              if (driverMarkerRef.current) {
                // Smooth animation to new position
                animateMarker(driverMarkerRef.current, data.lat, data.lng, mapInstance.current);
                driverMarkerRef.current.setIcon(icon);
              } else {
                driverMarkerRef.current = L.marker([data.lat, data.lng], { icon })
                  .addTo(mapInstance.current)
                  .bindPopup(`🏍️ ${booking?.driver?.fullName || 'Driver'}`);
              }

              // Pan map to show driver
              mapInstance.current.panTo([data.lat, data.lng], { animate: true, duration: 0.5 });

              // Draw route line if rider location known
              if (myLoc) {
                drawRoute(data.lat, data.lng, myLoc.lat, myLoc.lng);
              }

              // Reset location lost timer (30 sec)
              clearTimeout(locationTimerRef.current);
              locationTimerRef.current = setTimeout(() => {
                setLocationLost(true);
                setGpsStatus('lost');
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
  }, [booking, user, myLoc, drawRoute]);

  // ── Driver: Start GPS sharing ──
  const startSharing = () => {
    if (!navigator.geolocation) { toast.error('GPS not supported on this device'); return; }

    setGpsStatus('acquiring');
    toast('📡 Acquiring GPS signal...', { icon: '⏳', duration: 2000 });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
        setSharing(true);
        setGpsStatus('active');
        setAccuracy(Math.round(acc));
        setMyLoc({ lat, lng });

        // Update my marker on map
        if (mapInstance.current && window.L) {
          const L = window.L;
          const icon = L.divIcon({
            html: `<div style="background:#22c55e;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(34,197,94,0.9)"></div>`,
            iconSize: [20, 20], className: '', iconAnchor: [10, 10]
          });
          if (myMarkerRef.current) {
            animateMarker(myMarkerRef.current, lat, lng, mapInstance.current);
          } else {
            myMarkerRef.current = L.marker([lat, lng], { icon })
              .addTo(mapInstance.current)
              .bindPopup('📍 You (Driver)');
          }
          mapInstance.current.setView([lat, lng], 16, { animate: true });
        }

        // Broadcast via WebSocket
        if (clientRef.current?.connected) {
          clientRef.current.publish({
            destination: '/app/location.update',
            body: JSON.stringify({
              bookingId: parseInt(bookingId),
              lat, lng,
              accuracy: acc,
              status: rideStatus,
            }),
          });
        }
      },
      (err) => {
        setGpsStatus('lost');
        let msg = 'GPS error';
        if (err.code === 1) msg = 'GPS permission denied! Please allow location access.';
        if (err.code === 2) msg = 'GPS signal unavailable. Try outdoors.';
        if (err.code === 3) msg = 'GPS timeout. Retrying...';
        toast.error(msg);

        // Notify rider
        if (clientRef.current?.connected) {
          clientRef.current.publish({
            destination: '/app/location.update',
            body: JSON.stringify({ bookingId: parseInt(bookingId), status: 'LOCATION_LOST' }),
          });
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,      // Accept 2s old position
        timeout: 15000,        // 15s timeout
      }
    );
  };

  // ── Mark arrived ──
  const markArrived = async () => {
    try {
      await api.post(`/location/arrived/${bookingId}`);
      setRideStatus('ARRIVED');
      if (clientRef.current?.connected) {
        clientRef.current.publish({
          destination: '/app/location.update',
          body: JSON.stringify({ bookingId: parseInt(bookingId), status: 'ARRIVED' }),
        });
      }
      toast.success('📍 Rider notified — you arrived!');
    } catch { toast.error('Failed'); }
  };

  // ── Mark started ──
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

  // ── SOS ──
  const sendSOS = async () => {
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
        await api.post('/safety/sos', {
          bookingId: parseInt(bookingId), lat, lng,
          message: `🆘 SOS ALERT from ${user.fullName}! Location: ${mapsLink}`,
        });
        if (clientRef.current?.connected) {
          clientRef.current.publish({
            destination: '/app/location.message',
            body: JSON.stringify({
              bookingId: parseInt(bookingId),
              message: `🆘 EMERGENCY! ${user.fullName} needs help! 📍 ${mapsLink}`,
              senderId: user.id,
            }),
          });
        }
        toast.error('🆘 SOS sent! Emergency contacts notified.', { duration: 6000 });
        setShowSOS(false); setSosConfirm(false);
      }, () => { toast.error('Could not get location. Call 112 directly!'); });
    } catch { toast.error('SOS failed — Call 112!'); }
  };

  const sendQuickMsg = (text) => {
    if (!clientRef.current?.connected) { toast.error('Not connected'); return; }
    clientRef.current.publish({
      destination: '/app/location.message',
      body: JSON.stringify({ bookingId: parseInt(bookingId), message: text, senderId: user.id }),
    });
    setMessages(prev => [...prev, { message: text, received: false, timestamp: Date.now() }]);
    toast.success('✅ Sent!');
  };

  const stepIndex = RIDE_STEPS.findIndex(s => s.key === rideStatus);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 border-2 border-aviro-orange/30 border-t-aviro-orange rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10 animate-fade-up">

      {/* Header */}
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

      {/* SOS Button */}
      <button onClick={() => setShowSOS(true)}
        className="w-full bg-red-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 transition-colors">
        🆘 SOS Emergency Alert
      </button>

      {/* SOS Modal */}
      {showSOS && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-aviro-card border border-red-500/50 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <p className="text-4xl mb-3">🆘</p>
              <h3 className="font-bold text-xl text-red-400">Emergency Alert</h3>
              <p className="text-aviro-muted text-sm mt-2">
                Sends your live location to emergency contacts and {isDriver ? 'rider' : 'driver'}.
              </p>
            </div>
            {!sosConfirm ? (
              <div className="space-y-2">
                <button onClick={() => setSosConfirm(true)} className="w-full bg-red-500 text-white font-bold py-3 rounded-xl">🆘 Yes, Send SOS Alert</button>
                <button onClick={() => setShowSOS(false)} className="w-full bg-aviro-card2 text-aviro-muted font-semibold py-3 rounded-xl">Cancel</button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-red-400 text-sm font-semibold text-center">Confirm — real emergency?</p>
                <button onClick={sendSOS} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl">🆘 YES — SEND NOW</button>
                <button onClick={() => { setShowSOS(false); setSosConfirm(false); }} className="w-full bg-aviro-card2 text-aviro-muted font-semibold py-3 rounded-xl">Cancel</button>
              </div>
            )}
            <p className="text-xs text-aviro-muted text-center">Emergency: <span className="text-red-400 font-bold">112</span></p>
          </div>
        </div>
      )}

      {/* Location Lost Warning */}
      {locationLost && isRider && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-red-400 font-bold text-sm">Driver location signal lost!</p>
            <p className="text-xs text-aviro-muted">
              Last seen: {lastSeen ? new Date(lastSeen).toLocaleTimeString() : 'Unknown'} · Press SOS if unsafe.
            </p>
          </div>
        </div>
      )}

      {/* Ride Progress Bar */}
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
              <span className={`text-xs font-medium text-center w-14 ${i <= stepIndex ? 'text-aviro-orange' : 'text-aviro-muted'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Map */}
      <div className="card overflow-hidden rounded-2xl relative">
        <div ref={mapRef} style={{ height: '320px', width: '100%', background: '#1a1a2e' }}/>

        {/* GPS accuracy badge */}
        {isDriver && sharing && accuracy && (
          <div className="absolute top-2 right-2 z-10 bg-black/70 backdrop-blur rounded-lg px-2 py-1">
            <p className="text-xs text-aviro-green font-semibold">📡 ±{accuracy}m accuracy</p>
          </div>
        )}

        {/* Legend */}
        {mapReady && (
          <div className="absolute bottom-2 left-2 z-10 bg-black/70 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-aviro-orange border border-white"/>
              <span className="text-xs text-white">Driver</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-aviro-blue border border-white"/>
              <span className="text-xs text-white">You</span>
            </div>
          </div>
        )}
      </div>

      {/* Driver Controls */}
      {isDriver && (
        <div className="card p-4 space-y-3">
          <h3 className="font-bold text-sm">🚗 Driver Controls</h3>

          {/* GPS Status */}
          <div className={`rounded-xl px-3 py-2.5 flex items-center gap-2
            ${gpsStatus === 'active' ? 'bg-aviro-green/10 border border-aviro-green/20' :
              gpsStatus === 'acquiring' ? 'bg-yellow-500/10 border border-yellow-500/20' :
              gpsStatus === 'lost' ? 'bg-red-500/10 border border-red-500/20' :
              'bg-aviro-card2 border border-aviro-border'}`}>
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0
              ${gpsStatus === 'active' ? 'bg-aviro-green animate-pulse' :
                gpsStatus === 'acquiring' ? 'bg-yellow-400 animate-pulse' :
                gpsStatus === 'lost' ? 'bg-red-400' : 'bg-aviro-muted'}`}/>
            <div>
              <p className={`text-xs font-semibold
                ${gpsStatus === 'active' ? 'text-aviro-green' :
                  gpsStatus === 'acquiring' ? 'text-yellow-400' :
                  gpsStatus === 'lost' ? 'text-red-400' : 'text-aviro-muted'}`}>
                {gpsStatus === 'active'     ? `📡 Live GPS Active ${accuracy ? `(±${accuracy}m)` : ''}` :
                 gpsStatus === 'acquiring'  ? '📡 Acquiring GPS signal...' :
                 gpsStatus === 'lost'       ? '⚠️ GPS signal lost! Retrying...' :
                 '📡 GPS not started'}
              </p>
              {gpsStatus === 'idle' && (
                <p className="text-xs text-aviro-muted">Press "Share Location" to start</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!sharing ? (
              <button onClick={startSharing}
                className="bg-aviro-green text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 flex items-center justify-center gap-2">
                📍 Share Location
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-aviro-green/10 border border-aviro-green/20 rounded-xl px-3 py-3">
                <span className="w-2 h-2 bg-aviro-green rounded-full animate-pulse"/>
                <span className="text-xs text-aviro-green font-medium">Broadcasting Live</span>
              </div>
            )}

            {rideStatus === 'CONFIRMED' || rideStatus === 'ON_THE_WAY' ? (
              <button onClick={markArrived}
                className="bg-aviro-blue text-white font-bold py-3 rounded-xl text-sm hover:opacity-90">
                📍 Arrived at Pickup
              </button>
            ) : rideStatus === 'ARRIVED' ? (
              <button onClick={markStarted}
                className="bg-aviro-orange text-white font-bold py-3 rounded-xl text-sm hover:opacity-90">
                🏁 Start Ride
              </button>
            ) : (
              <div className="bg-aviro-card2 rounded-xl flex items-center justify-center text-xs text-aviro-muted py-3 px-2 text-center">
                {rideStatus === 'STARTED' ? '🚗 Ride in progress' : '✅ Done'}
              </div>
            )}
          </div>

          <p className="text-xs text-yellow-400 text-center">
            🔒 Location broadcasts automatically — rider can track you in real-time
          </p>
        </div>
      )}

      {/* Rider: Driver Status */}
      {isRider && (
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-2">📍 Driver Location</h3>
          {driverLoc ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-aviro-green/10 border border-aviro-green/20 rounded-xl px-4 py-3">
                <span className="w-3 h-3 bg-aviro-green rounded-full animate-pulse"/>
                <div>
                  <p className="text-sm font-semibold text-aviro-green">Driver is live on map!</p>
                  <p className="text-xs text-aviro-muted">
                    Last update: {lastSeen ? new Date(lastSeen).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-aviro-muted">Coords</p>
                  <p className="text-xs font-mono text-aviro-orange">
                    {driverLoc.lat.toFixed(4)}, {driverLoc.lng.toFixed(4)}
                  </p>
                </div>
              </div>
              <a
                href={`https://maps.google.com/?q=${driverLoc.lat},${driverLoc.lng}`}
                target="_blank" rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-aviro-card2 border border-aviro-border text-sm text-aviro-muted py-2 rounded-xl hover:text-white hover:border-aviro-orange/50 transition-all">
                🗺️ Open in Google Maps
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-aviro-card2 border border-aviro-border rounded-xl px-4 py-3">
              <span className="text-xl">⏳</span>
              <div>
                <p className="text-sm font-semibold">Waiting for driver location...</p>
                <p className="text-xs text-aviro-muted">Driver will share location when on the way</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Messages */}
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

      {/* Rider/Driver Info */}
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
              {/* Phone number */}
              {isRider && booking?.driver?.phone && (
                <a href={`tel:${booking.driver.phone}`} className="text-xs text-aviro-orange">
                  📞 {booking.driver.phone}
                </a>
              )}
              {isDriver && booking?.rider?.phone && (
                <a href={`tel:${booking.rider.phone}`} className="text-xs text-aviro-orange">
                  📞 {booking.rider.phone}
                </a>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-aviro-green font-bold text-lg">₹{booking?.totalAmount}</p>
            <p className="text-xs text-aviro-muted">{booking?.seatsBooked} seat{booking?.seatsBooked > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Safety Tips */}
      <div className="bg-aviro-card2 border border-aviro-border rounded-xl p-4">
        <p className="text-xs text-aviro-muted font-semibold mb-2">🛡️ Safety Tips</p>
        <p className="text-xs text-aviro-muted">• Share this trip with a trusted contact before riding</p>
        <p className="text-xs text-aviro-muted">• Press SOS if you feel unsafe at any point</p>
        <p className="text-xs text-aviro-muted">• For emergencies, call <span className="text-red-400 font-bold">112</span></p>
      </div>
    </div>
  );
}
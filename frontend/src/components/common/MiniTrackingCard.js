import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Link } from 'react-router-dom';

const BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8080';

const RIDE_STATUS_LABELS = {
  CONFIRMED:  { label: 'Driver Confirmed',   icon: '✅', color: 'text-aviro-green'  },
  ON_THE_WAY: { label: 'Driver On the Way',  icon: '🏍️', color: 'text-aviro-orange' },
  ARRIVED:    { label: 'Driver Arrived!',    icon: '📍', color: 'text-yellow-400'   },
  STARTED:    { label: 'Ride in Progress',   icon: '🚗', color: 'text-aviro-blue'   },
};

export default function MiniTrackingCard({ booking }) {
  const { user }      = useSelector(s => s.auth);
  const [driverLoc, setDriverLoc]   = useState(null);
  const [rideStatus, setRideStatus] = useState('CONFIRMED');
  const [mapReady, setMapReady]     = useState(false);
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const markerRef   = useRef(null);
  const clientRef   = useRef(null);

  // ── WebSocket — listen to driver location ──
  useEffect(() => {
    if (!user?.id || !booking?.id) return;
    const token = localStorage.getItem('aviro_token');

    const client = new Client({
      webSocketFactory: () => new SockJS(`${BASE_URL}/api/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/user/${user.id}/queue/location`, (frame) => {
          const data = JSON.parse(frame.body);
          if (data.bookingId?.toString() === booking.id?.toString()) {
            if (data.status) setRideStatus(data.status);
            if (data.lat && data.lng) {
              setDriverLoc({ lat: data.lat, lng: data.lng });
              updateMarker(data.lat, data.lng);
            }
          }
        });
      },
    });
    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, [user?.id, booking?.id]);

  // ── Init mini map ──
  useEffect(() => {
    const initMap = () => {
      if (!window.L || !mapRef.current || mapInstance.current) return;
      const L = window.L;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      }).setView([18.5204, 73.8567], 14);

      mapInstance.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '', maxZoom: 18
      }).addTo(map);

      // Pickup marker
      const pickupIcon = L.divIcon({
        html: `<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px rgba(34,197,94,0.8)"></div>`,
        iconSize: [12, 12], className: ''
      });
      L.marker([18.5204, 73.8567], { icon: pickupIcon })
        .addTo(map).bindPopup('📍 Your Pickup');

      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 200);
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
  }, []);

  const updateMarker = (lat, lng) => {
    if (!mapInstance.current || !window.L) return;
    const L = window.L;

    // 🏍️ Zomato style driver icon
    const driverIcon = L.divIcon({
      html: `
        <div style="position:relative">
          <div style="background:#f97316;width:32px;height:32px;border-radius:50%;border:3px solid white;
            box-shadow:0 0 12px rgba(249,115,22,0.9);display:flex;align-items:center;
            justify-content:center;font-size:16px;animation:pulse 1.5s infinite">
            🏍️
          </div>
          <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
            width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
            border-top:8px solid #f97316"></div>
        </div>`,
      iconSize: [32, 38], className: '', iconAnchor: [16, 38]
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: driverIcon })
        .addTo(mapInstance.current)
        .bindPopup(`🏍️ ${booking?.driver?.fullName || 'Driver'}`);
    }
    mapInstance.current.panTo([lat, lng], { animate: true, duration: 0.5 });
  };

  const statusInfo = RIDE_STATUS_LABELS[rideStatus] || RIDE_STATUS_LABELS.CONFIRMED;

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-aviro-border bg-aviro-card2">

      {/* Status bar — Zomato style */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-aviro-card">
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusInfo.icon}</span>
          <div>
            <p className={`text-xs font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
            <p className="text-xs text-aviro-muted">{booking?.driver?.fullName}</p>
          </div>
        </div>
        {driverLoc ? (
          <span className="flex items-center gap-1 text-xs text-aviro-green">
            <span className="w-2 h-2 bg-aviro-green rounded-full animate-pulse"/>
            Live
          </span>
        ) : (
          <span className="text-xs text-aviro-muted">Waiting...</span>
        )}
      </div>

      {/* Mini Map */}
      <div style={{ height: '160px', position: 'relative' }}>
        <div ref={mapRef} style={{ height: '160px', width: '100%' }}/>

        {/* Overlay if no location yet */}
        {!driverLoc && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(10,10,20,0.7)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ fontSize: 32 }}>🏍️</div>
            <p style={{ color: '#f97316', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
              Waiting for driver to share location...
            </p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-aviro-card border-t border-aviro-border">
        <div className="flex items-center gap-2 text-xs text-aviro-muted">
          <span>🏍️ {booking?.driver?.vehicleModel || 'Vehicle'}</span>
          <span>·</span>
          <span>⭐ {booking?.driver?.rating?.toFixed(1) || '5.0'}</span>
        </div>
        <Link to={`/tracking/${booking?.id}`}
          className="text-xs text-aviro-orange font-semibold hover:underline flex items-center gap-1">
          Full Map →
        </Link>
      </div>
    </div>
  );
}
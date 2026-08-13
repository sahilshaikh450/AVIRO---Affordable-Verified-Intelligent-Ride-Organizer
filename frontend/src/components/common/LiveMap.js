import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored icons
const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const orangeIcon = createIcon('orange');
const greenIcon  = createIcon('green');
const blueIcon   = createIcon('blue');

export default function LiveMap({
  fromLat = 18.5204, fromLng = 73.8567,
  toLat   = 18.5314, toLng   = 73.8446,
  fromLabel = 'Pickup',
  toLabel   = 'Destination',
  driverLat,
  driverLng,
  driverLabel = 'Driver',
  height = '300px',
}) {
  const center = [
    (fromLat + toLat) / 2,
    (fromLng + toLng) / 2,
  ];

  return (
    <div style={{ height, width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%', background: '#1a1d24' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Pickup marker */}
        <Marker position={[fromLat, fromLng]} icon={orangeIcon}>
          <Popup>📍 {fromLabel}</Popup>
        </Marker>

        {/* Destination marker */}
        <Marker position={[toLat, toLng]} icon={greenIcon}>
          <Popup>🏁 {toLabel}</Popup>
        </Marker>

        {/* Route line */}
        <Polyline
          positions={[[fromLat, fromLng], [toLat, toLng]]}
          pathOptions={{ color: '#FF6B2B', weight: 4, dashArray: '8, 8', opacity: 0.8 }}
        />

        {/* Live driver location */}
        {driverLat && driverLng && (
          <Marker position={[driverLat, driverLng]} icon={blueIcon}>
            <Popup>🏍️ {driverLabel} (Live)</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
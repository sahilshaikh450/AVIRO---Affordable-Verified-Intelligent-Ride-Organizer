import L from 'leaflet';

// One clean, light map look for every map in the app, like Google Maps / Uber:
// muted base map, a thick blue road route with a white edge, and simple pins.

// CARTO "Voyager": light streets with soft colours (free, needs this attribution)
export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const TILE_OPTIONS = {
  attribution: '© OpenStreetMap © CARTO',
  subdomains: 'abcd',
  maxZoom: 20,
};

export const ROUTE_BLUE = '#1A73E8';
export const ROUTE_DONE = '#9AA0A6';

export const addTiles = (map) => L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map);

// Blue line on a white edge, so it stands out on any street colour; dashed grey when it's only a straight guess
export const routeLayer = (coords, { straight = false } = {}) => {
  if (straight) {
    return L.polyline(coords, { color: ROUTE_DONE, weight: 4, opacity: 0.9, dashArray: '2 10', lineCap: 'round' });
  }
  return L.layerGroup([
    L.polyline(coords, { color: '#ffffff', weight: 10, opacity: 1, lineCap: 'round', lineJoin: 'round' }),
    L.polyline(coords, { color: ROUTE_BLUE, weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }),
  ]);
};

// Bounds of whatever routeLayer returned
export const layerBounds = (layer) => (layer.getBounds ? layer.getBounds() : L.featureGroup(layer.getLayers()).getBounds());

const label = (text) => (text
  ? `<div style="position:absolute;left:50%;top:-30px;transform:translateX(-50%);background:#fff;color:#202124;font:600 11px/1 system-ui,sans-serif;padding:5px 8px;border-radius:8px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.25)">${text.replace(/</g, '&lt;')}</div>`
  : '');

// Start of a trip: green dot with a white ring
export const startIcon = (text) => L.divIcon({
  html: `<div style="position:relative;width:18px;height:18px">${label(text)}<div style="width:18px;height:18px;border-radius:50%;background:#1E8E3E;border:4px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9], className: '',
});

// Where the trip ends: red map pin
export const endIcon = (text) => L.divIcon({
  html: `<div style="position:relative;width:28px;height:38px">${label(text).replace('top:-30px', 'top:-26px')}
    <svg width="28" height="38" viewBox="0 0 28 38"><path d="M14 37C9 30 1 22 1 13.5A13 13 0 0 1 27 13.5C27 22 19 30 14 37Z" fill="#EA4335" stroke="#B31412" stroke-width="1"/><circle cx="14" cy="13.5" r="5" fill="#fff"/></svg></div>`,
  iconSize: [28, 38], iconAnchor: [14, 37], className: '',
});

// The vehicle: white disc with the vehicle emoji, like the car on a cab app
export const vehicleIcon = (emoji = '🚗', text) => L.divIcon({
  html: `<div style="position:relative;width:36px;height:36px">${label(text)}<div style="width:36px;height:36px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,.35)">${emoji}</div></div>`,
  iconSize: [36, 36], iconAnchor: [18, 18], className: '',
});

// "You are here": Google-style blue dot with a soft halo
export const meIcon = () => L.divIcon({
  html: '<div style="width:44px;height:44px;border-radius:50%;background:rgba(26,115,232,.18);display:flex;align-items:center;justify-content:center"><div style="width:16px;height:16px;border-radius:50%;background:#1A73E8;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div></div>',
  iconSize: [44, 44], iconAnchor: [22, 22], className: '',
});

// A person waiting at the pickup
export const personIcon = (text) => L.divIcon({
  html: `<div style="position:relative;width:32px;height:32px">${label(text)}<div style="width:32px;height:32px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,.35)">🙋</div></div>`,
  iconSize: [32, 32], iconAnchor: [16, 16], className: '',
});

export const VEHICLE_EMOJI = { BIKE: '🏍️', SCOOTY: '🛵', CAR: '🚗' };

// Plain map options: no +/- buttons (pinch to zoom on phones), small attribution
export const MAP_OPTIONS = { zoomControl: false, attributionControl: true };

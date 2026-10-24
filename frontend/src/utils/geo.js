// Place search and road routes using free OpenStreetMap services (no API key)
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const REQUEST_TIMEOUT_MS = 8000;

// Older rides were saved with this Pune centre point instead of the real place
export const PUNE_CENTRE = { lat: 18.5204, lng: 73.8567 };

export const hasRealCoords = (lat, lng) => lat != null && lng != null
  && !(Math.abs(lat - PUNE_CENTRE.lat) < 1e-6 && Math.abs(lng - PUNE_CENTRE.lng) < 1e-6);

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const geocodeCache = new Map();
const storageKey = (name) => `aviro_geo_${name}`;

// Place name (e.g. "MIT World Peace University") -> { lat, lng }, or null if not found
export const geocodePlace = async (name) => {
  const key = (name || '').trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(key)) || 'null');
    if (saved) { geocodeCache.set(key, saved); return saved; }
  } catch {}

  const search = async (q) => {
    const hits = await fetchJson(`${NOMINATIM_URL}?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`);
    return hits?.[0] ? { lat: Number(hits[0].lat), lng: Number(hits[0].lon) } : null;
  };
  try {
    // Try within Pune first, then anywhere in India
    const point = (await search(`${name}, Pune`)) || (await search(name));
    if (point) {
      geocodeCache.set(key, point);
      try { localStorage.setItem(storageKey(key), JSON.stringify(point)); } catch {}
    }
    return point;
  } catch {
    return null;
  }
};

// Road route between two points -> { coords: [[lat, lng], ...], distanceKm, durationMin }, or null
export const fetchRoute = async (from, to) => {
  try {
    const data = await fetchJson(`${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`);
    const route = data?.routes?.[0];
    if (!route) return null;
    return {
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: route.distance / 1000,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
    };
  } catch {
    return null;
  }
};

// Opens turn-by-turn navigation in Google Maps
export const googleMapsDirections = (dest, fallbackName) => {
  const target = dest ? `${dest.lat},${dest.lng}` : encodeURIComponent(`${fallbackName}, Pune`);
  return `https://www.google.com/maps/dir/?api=1&destination=${target}&travelmode=driving`;
};

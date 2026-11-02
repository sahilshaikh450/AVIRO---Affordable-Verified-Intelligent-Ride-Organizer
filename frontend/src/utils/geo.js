// Place search and road routes using free OpenStreetMap services (no API key)
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const REQUEST_TIMEOUT_MS = 8000;

// Older rides were saved with this Pune centre point instead of the real place
export const PUNE_CENTRE = { lat: 18.5204, lng: 73.8567 };

// Pune and nearby (Lonavala to Shikrapur, Saswad to Chakan); matches outside this are wrong guesses
const PUNE_BOX = { west: 73.35, east: 74.25, north: 18.85, south: 18.25 };
const inPuneArea = (p) => p && p.lat <= PUNE_BOX.north && p.lat >= PUNE_BOX.south && p.lng >= PUNE_BOX.west && p.lng <= PUNE_BOX.east;

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
// v2: earlier cached points could be outside Pune
const storageKey = (name) => `aviro_geo2_${name}`;

// Place name (e.g. "MIT World Peace University") -> { lat, lng }, or null if not found
export const geocodePlace = async (name) => {
  const key = (name || '').trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(key)) || 'null');
    if (saved) { geocodeCache.set(key, saved); return saved; }
  } catch {}

  const box = `${PUNE_BOX.west},${PUNE_BOX.north},${PUNE_BOX.east},${PUNE_BOX.south}`;
  const search = async (q) => {
    const hits = await fetchJson(`${NOMINATIM_URL}?format=json&limit=1&countrycodes=in&viewbox=${box}&bounded=1&q=${encodeURIComponent(q)}`);
    const p = hits?.[0] ? { lat: Number(hits[0].lat), lng: Number(hits[0].lon) } : null;
    return inPuneArea(p) ? p : null;
  };
  try {
    // Only places in and around Pune: a same-named place elsewhere in India would put the ride in the wrong city
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

// Phone GPS -> { lat, lng }; rejects with a message the user can act on
export const currentPosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) { reject(new Error('Location is not supported on this device')); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    (err) => reject(new Error(err.code === 1
      ? 'Location permission is off. Allow it in your browser settings.'
      : 'Could not get your location. Turn on GPS and try again.')),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
  );
});

// { lat, lng } -> a short place name like "Karve Nagar", or null
export const placeName = async (point) => {
  try {
    const data = await fetchJson(`${NOMINATIM_REVERSE_URL}?format=json&zoom=16&lat=${point.lat}&lon=${point.lng}`);
    const a = data?.address || {};
    return a.suburb || a.neighbourhood || a.quarter || a.village || a.road || a.town || a.city || null;
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

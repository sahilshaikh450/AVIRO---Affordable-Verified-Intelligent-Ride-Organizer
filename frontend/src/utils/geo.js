const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const REQUEST_TIMEOUT_MS = 8000;

export const PUNE_CENTRE = { lat: 18.5204, lng: 73.8567 };

const PUNE_BOX = { west: 73.35, east: 74.25, north: 18.85, south: 18.25 };
const inPuneArea = (p) =>
  p &&
  p.lat <= PUNE_BOX.north &&
  p.lat >= PUNE_BOX.south &&
  p.lng >= PUNE_BOX.west &&
  p.lng <= PUNE_BOX.east;

export const hasRealCoords = (lat, lng) =>
  lat != null &&
  lng != null &&
  !(Math.abs(lat - PUNE_CENTRE.lat) < 1e-6 && Math.abs(lng - PUNE_CENTRE.lng) < 1e-6);

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'en' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const geocodeCache = new Map();
const storageKey = (name) => `aviro_geo2_${name}`;

export const geocodePlace = async (name) => {
  const key = (name || '').trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(key)) || 'null');
    if (saved) {
      geocodeCache.set(key, saved);
      return saved;
    }
  } catch {}

  const box = `${PUNE_BOX.west},${PUNE_BOX.north},${PUNE_BOX.east},${PUNE_BOX.south}`;
  const search = async (q) => {
    const hits = await fetchJson(
      `${NOMINATIM_URL}?format=json&limit=1&countrycodes=in&viewbox=${box}&bounded=1&q=${encodeURIComponent(q)}`
    );
    const p = hits?.[0] ? { lat: Number(hits[0].lat), lng: Number(hits[0].lon) } : null;
    return inPuneArea(p) ? p : null;
  };
  try {
    const point = (await search(`${name}, Pune`)) || (await search(name));
    if (point) {
      geocodeCache.set(key, point);
      try {
        localStorage.setItem(storageKey(key), JSON.stringify(point));
      } catch {}
    }
    return point;
  } catch {
    return null;
  }
};

export const currentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === 1
              ? 'Location permission is off. Allow it in your browser settings.'
              : 'Could not get your location. Turn on GPS and try again.'
          )
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });

const firstOf = (a, keys) => keys.map((k) => a[k]).find((v) => typeof v === 'string' && v.trim());

export const formatPlace = (address) => {
  const a = address || {};
  const street = firstOf(a, ['road', 'pedestrian', 'footway', 'residential', 'path', 'cycleway']);
  const landmark = firstOf(a, ['amenity', 'building', 'shop', 'office', 'tourism', 'leisure']);
  const locality = firstOf(a, ['neighbourhood', 'quarter', 'hamlet', 'residential']);
  const area = firstOf(a, ['suburb', 'city_district', 'village', 'town']);
  const city = firstOf(a, ['city', 'town', 'county']);

  const parts = [];
  const add = (v) => {
    const clean = (v || '').trim();
    if (clean && !parts.some((p) => p.toLowerCase() === clean.toLowerCase())) parts.push(clean);
  };
  add(street || landmark);
  add(locality);
  add(area);
  if (parts.length < 2) add(city);
  return parts.length ? parts.slice(0, 3).join(', ') : null;
};

export const placeName = async (point) => {
  try {
    const data = await fetchJson(
      `${NOMINATIM_REVERSE_URL}?format=json&zoom=18&addressdetails=1&accept-language=en&lat=${point.lat}&lon=${point.lng}`
    );
    return formatPlace(data?.address);
  } catch {
    return null;
  }
};

export const fetchRoute = async (from, to) => {
  try {
    const data = await fetchJson(
      `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    );
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

export const googleMapsDirections = (dest, fallbackName) => {
  const target = dest ? `${dest.lat},${dest.lng}` : encodeURIComponent(`${fallbackName}, Pune`);
  return `https://www.google.com/maps/dir/?api=1&destination=${target}&travelmode=driving`;
};

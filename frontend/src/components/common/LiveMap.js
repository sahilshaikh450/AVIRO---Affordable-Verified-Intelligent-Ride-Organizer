import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchRoute } from '../../utils/geo';
import { MAP_OPTIONS, addTiles, routeLayer, layerBounds, startIcon, endIcon } from '../../utils/mapStyle';

const short = (name) => (name || '').split(',')[0].split(' ').slice(0, 3).join(' ');

// A ride's route on a clean map: start dot, end pin, and the road between them with time and distance
export default function LiveMap({
  fromLat = 18.5204, fromLng = 73.8567,
  toLat = 18.5314, toLng = 73.8446,
  fromLabel = 'Pickup', toLabel = 'Destination',
  height = '300px',
}) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!boxRef.current) return undefined;
    const map = L.map(boxRef.current, MAP_OPTIONS);
    mapRef.current = map;
    addTiles(map);
    const from = { lat: fromLat, lng: fromLng };
    const to = { lat: toLat, lng: toLng };
    L.marker([from.lat, from.lng], { icon: startIcon(short(fromLabel)) }).addTo(map);
    L.marker([to.lat, to.lng], { icon: endIcon(short(toLabel)) }).addTo(map);
    map.fitBounds([[from.lat, from.lng], [to.lat, to.lng]], { padding: [48, 48], animate: false });

    let alive = true;
    fetchRoute(from, to).then(r => {
      if (!alive) return;
      const layer = routeLayer(r ? r.coords : [[from.lat, from.lng], [to.lat, to.lng]], { straight: !r }).addTo(map);
      map.fitBounds(layerBounds(layer), { padding: [48, 48], animate: false });
      setInfo(r ? { min: r.durationMin, km: r.distanceKm } : null);
    });
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => { alive = false; clearTimeout(t); map.remove(); mapRef.current = null; };
  }, [fromLat, fromLng, toLat, toLng, fromLabel, toLabel]);

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height }}>
      <div ref={boxRef} className="absolute inset-0" data-testid="route-map" />
      {info && (
        <div className="absolute top-3 left-3 z-[500] bg-white text-[#202124] rounded-xl px-3 py-2 shadow-lg text-xs font-semibold pointer-events-none" data-testid="route-info">
          <span className="text-[#1A73E8] text-sm font-bold">{info.min} min</span>
          <span className="text-[#5f6368]"> · {info.km < 1 ? `${Math.round(info.km * 1000)} m` : `${info.km.toFixed(1)} km`}</span>
        </div>
      )}
    </div>
  );
}

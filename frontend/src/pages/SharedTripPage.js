import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import api from '../services/api';
import { Wordmark } from '../components/common/Logo';
import { RouteLines, formatWhen } from '../components/common/RideAlerts';
import { TILE_URL, TILE_OPTIONS, vehicleIcon, VEHICLE_EMOJI } from '../utils/mapStyle';

// Opened by family from a shared link: no account, read-only, refreshes itself
const REFRESH_MS = 15000;

const STAGE_TEXT = {
  ON_THE_WAY: 'Driver is on the way to the pickup',
  ARRIVED: 'Driver has reached the pickup',
  STARTED: 'On the trip now',
};
const VEHICLE_ICON = { CAR: '🚗', BIKE: '🏍️', SCOOTY: '🛵' };


function FollowPoint({ at }) {
  const map = useMap();
  useEffect(() => { map.setView([at.lat, at.lng], Math.max(map.getZoom(), 15)); }, [at.lat, at.lng, map]);
  return null;
}

const ago = (ms) => {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  return `${m} min ago`;
};

export default function SharedTripPage() {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);
  const [, setTick] = useState(0);
  const loaded = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/public/share/${encodeURIComponent(token)}`);
      setTrip(res.data.data);
      loaded.current = true;
      setError(null);
    } catch (err) {
      // Keep showing the last known trip if a refresh fails
      if (err.response?.status === 400 || err.response?.status === 404) setError(err.response?.data?.message || 'This link is not valid');
      else if (!loaded.current) setError('Could not load the trip. Check your internet and reload.');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!trip?.live) return undefined;
    const id = setInterval(() => { load(); setTick(t => t + 1); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [trip?.live, load]);

  const header = (
    <header className="h-14 px-4 flex items-center justify-between border-b border-aviro-border bg-aviro-card/90">
      <Wordmark height={24} />
      <span className="text-xs text-aviro-muted">Shared trip</span>
    </header>
  );

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-aviro-dark text-white">
        {header}
        <div className="max-w-md mx-auto p-6 text-center space-y-3 mt-10">
          {error ? (
            <>
              <p className="text-4xl">🔗</p>
              <p className="font-bold text-lg">{error}</p>
              <p className="text-sm text-aviro-muted">Ask the person who sent it to share the trip again.</p>
            </>
          ) : (
            <div className="w-8 h-8 border-2 border-aviro-orange/30 border-t-aviro-orange rounded-full animate-spin mx-auto" />
          )}
        </div>
      </div>
    );
  }

  const status = !trip.live
    ? (trip.status === 'COMPLETED' ? { text: 'Trip completed ✅', cls: 'bg-green-500/10 text-green-300 border-green-500/30' }
      : trip.status === 'CANCELLED' ? { text: 'This trip was cancelled', cls: 'bg-aviro-card2 text-aviro-muted border-aviro-border' }
      : { text: 'This link has expired', cls: 'bg-aviro-card2 text-aviro-muted border-aviro-border' })
    : { text: STAGE_TEXT[trip.tripStage] || `Trip booked for ${formatWhen(trip.departureTime)}`, cls: 'bg-aviro-orange/10 text-aviro-orange border-aviro-orange/30' };
  const v = trip.vehicle;

  return (
    <div className="min-h-screen bg-aviro-dark text-white">
      {header}
      <main className="max-w-md mx-auto p-4 space-y-4 pb-10">
        <div>
          <p className="text-xs text-aviro-muted">You're following</p>
          <h1 className="font-display font-bold text-2xl">{trip.sharerName}'s trip</h1>
        </div>

        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${status.cls}`} data-testid="trip-status">
          {trip.live && <span className="w-2 h-2 rounded-full bg-aviro-orange animate-pulse" />}
          {status.text}
        </div>

        {trip.live && (
          trip.location ? (
            <div className="card overflow-hidden">
              <MapContainer center={[trip.location.lat, trip.location.lng]} zoom={16} style={{ height: 300 }} scrollWheelZoom={false} zoomControl={false}>
                <TileLayer url={TILE_URL} {...TILE_OPTIONS} />
                <Marker position={[trip.location.lat, trip.location.lng]} icon={vehicleIcon(VEHICLE_EMOJI[v?.type] || '🚗', trip.sharerName)} />
                <FollowPoint at={trip.location} />
              </MapContainer>
              <div className="px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="text-aviro-muted">📍 Updated {ago(trip.location.updatedAt)}</span>
                <a href={`https://maps.google.com/?q=${trip.location.lat},${trip.location.lng}`} target="_blank" rel="noreferrer"
                  className="text-aviro-orange font-semibold">Open in Google Maps</a>
              </div>
            </div>
          ) : (
            <div className="card p-4 text-sm text-aviro-muted text-center" data-testid="no-location">
              📍 Live location shows here once the trip screen is open on their phone. This page refreshes by itself.
            </div>
          )
        )}

        <div className="card p-4 space-y-4">
          <RouteLines from={trip.fromLocation} to={trip.toLocation} />
          <p className="text-xs text-aviro-muted">🕘 {formatWhen(trip.departureTime)}</p>
        </div>

        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-aviro-orange/15 flex items-center justify-center text-xl">{VEHICLE_ICON[v?.type] || '🚗'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Driver: {trip.driverName}</p>
              <p className="text-xs text-aviro-muted truncate">{[v?.name, v?.color].filter(Boolean).join(' · ') || 'Vehicle details not added'}</p>
            </div>
          </div>
          {v?.plate && (
            <div className="bg-white text-black font-mono font-bold text-center text-lg tracking-widest rounded-lg py-2" data-testid="plate">
              {v.plate}
            </div>
          )}
          <p className="text-xs text-aviro-muted">Rider: {trip.riderName} · Both are verified college students.</p>
        </div>

        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <p className="font-semibold text-red-300">Worried?</p>
          <p className="text-aviro-muted text-xs mt-1">Call {trip.sharerName} first. If you think they are in danger, call the police.</p>
          <a href="tel:112" className="mt-3 block text-center bg-red-500 text-white font-bold py-2.5 rounded-xl">📞 Call 112</a>
        </div>

        <p className="text-center text-xs text-aviro-muted">
          AVIRO is ride sharing for Pune college students. <Link to="/" className="text-aviro-orange">Learn more</Link>
        </p>
      </main>
    </div>
  );
}

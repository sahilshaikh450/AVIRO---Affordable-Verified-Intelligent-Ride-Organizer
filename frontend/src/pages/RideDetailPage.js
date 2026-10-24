import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { GenderBadge, VehicleIcon, Spinner } from '../components/common/UIComponents';
import LiveMap from '../components/common/LiveMap';
import useGeolocation from '../hooks/useGeolocation';
import useBookRide from '../hooks/useBookRide';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_URL } from '../services/websocket';
import toast from 'react-hot-toast';

export default function RideDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);

  const [ride, setRide]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverLoc, setDriverLoc] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const { bookRide, bookingRideId } = useBookRide();

  const clientRef = useRef(null);
  const isDriver  = ride && user && ride.driver?.id === user.id;

  // Track own location if driver is sharing
  const { position } = useGeolocation(isSharing && isDriver);

  // Load ride details
  useEffect(() => {
    api.get(`/rides/${id}`).then(res => {
      setRide(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // WebSocket - subscribe to driver location updates for this ride
  // Uses backend's actual endpoint: /topic/track/{rideId}
  useEffect(() => {
    if (!ride) return;

    const token = localStorage.getItem('aviro_token');
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/track/${ride.id}`, (frame) => {
          try {
            const loc = JSON.parse(frame.body);
            setDriverLoc({ lat: loc.lat, lng: loc.lng });
          } catch {}
        });
      },
    });
    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, [ride]);

  // Driver: broadcast own location when sharing -> uses /app/track.update
  useEffect(() => {
    if (!isDriver || !isSharing || !position || !ride) return;
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: '/app/track.update',
        body: JSON.stringify({
          rideId: ride.id,
          driverId: user.id,
          lat: position.lat,
          lng: position.lng,
          speed: position.speed || 0,
          timestamp: Date.now(),
        }),
      });
      // Show locally too
      setDriverLoc({ lat: position.lat, lng: position.lng });
    }
  }, [position, isSharing, isDriver, ride, user]);

  const toggleSharing = () => {
    if (!isSharing) {
      toast.success('📍 Live location sharing started!');
    } else {
      toast('Location sharing stopped', { icon: '⏹️' });
    }
    setIsSharing(!isSharing);
  };

  // SOS button - uses backend's /app/sos.alert
  const sendSOS = () => {
    if (!ride || !user) return;
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: '/app/sos.alert',
        body: JSON.stringify({
          rideId: ride.id,
          userId: user.id,
          lat: position?.lat || ride.fromLat,
          lng: position?.lng || ride.fromLng,
          message: `${user.fullName} triggered an SOS alert!`,
        }),
      });
      toast.success('🆘 SOS Alert sent!', { duration: 4000 });
    } else {
      toast.error('Not connected. Try again.');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!ride) return <div className="text-center py-20 text-aviro-muted">Ride not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <button onClick={() => navigate(-1)} className="text-aviro-muted text-sm hover:text-white flex items-center gap-1">
        ← Back
      </button>

      {/* Driver Card */}
      <div className="card p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-aviro-card2 border-2 border-aviro-border flex items-center justify-center text-2xl">
            {ride.driver?.gender === 'FEMALE' ? '👩' : '👨'}
          </div>
          <div>
            <p className="font-bold text-base">{ride.driver?.fullName}</p>
            <p className="text-xs text-aviro-muted">{ride.driver?.collegeName}</p>
            <div className="flex items-center gap-2 mt-1">
              <GenderBadge gender={ride.driver?.gender} />
              <span className="text-xs text-aviro-muted">⭐ {ride.driver?.rating?.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-aviro-green font-bold text-2xl">₹{ride.pricePerSeat}</p>
          <p className="text-xs text-aviro-muted">per seat</p>
        </div>
      </div>

      {/* Live Map */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">🗺️ Route Map</h3>
          {driverLoc && (
            <span className="flex items-center gap-1.5 text-xs text-aviro-green font-medium">
              <div className="w-2 h-2 bg-aviro-green rounded-full animate-pulse" />
              Live tracking active
            </span>
          )}
        </div>
        <LiveMap
          fromLat={ride.fromLat || 18.5204}
          fromLng={ride.fromLng || 73.8567}
          toLat={ride.toLat || 18.5314}
          toLng={ride.toLng || 73.8446}
          fromLabel={ride.fromLocation}
          toLabel={ride.toLocation}
          driverLat={driverLoc?.lat}
          driverLng={driverLoc?.lng}
          driverLabel={ride.driver?.fullName}
          height="320px"
        />

        {/* Driver: Share location button */}
        {isDriver && (
          <button
            onClick={toggleSharing}
            className={`w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${isSharing
                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                : 'bg-aviro-green/10 text-aviro-green border border-aviro-green/30'}`}
          >
            {isSharing ? '⏹️ Stop Sharing Location' : '📍 Start Sharing Live Location'}
          </button>
        )}

        {/* SOS button - visible to everyone on this ride */}
        <button
          onClick={sendSOS}
          className="w-full mt-2 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
        >
          🆘 SOS Emergency Alert
        </button>
      </div>

      {/* Route Details */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider mb-3">📍 Trip Details</h3>
        <div className="bg-aviro-card2 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-aviro-orange" />
              <div className="w-px h-8 bg-aviro-border" />
              <div className="w-3 h-3 rounded-full bg-aviro-green" />
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-white font-medium">{ride.fromLocation}</span>
              <span className="text-aviro-muted">{ride.toLocation}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span>🕐</span>
            <span className="text-aviro-muted">
              {ride.departureTime ? new Date(ride.departureTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <VehicleIcon type={ride.driver?.vehicleType} />
            <span className="text-aviro-muted">{ride.driver?.vehicleType} • {ride.driver?.vehicleModel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>💺</span>
            <span className="text-aviro-muted">{ride.availableSeats} seats available</span>
          </div>
          {ride.womenOnly && (
            <div className="flex items-center gap-2">
              <span>🚺</span>
              <span className="text-pink-400">Women-only ride</span>
            </div>
          )}
        </div>

        {ride.notes && (
          <div className="mt-4 bg-aviro-card2 rounded-xl p-3 text-sm text-aviro-muted">
            <span className="font-medium text-white">Note: </span>{ride.notes}
          </div>
        )}
      </div>

      {/* Book button */}
      {!isDriver && ['PENDING', 'ACTIVE'].includes(ride.status) && ride.availableSeats > 0 && (
        <button onClick={() => bookRide(ride)} disabled={!!bookingRideId} className="btn-primary w-full py-3 text-base">
          Book This Ride →
        </button>
      )}
    </div>
  );
}
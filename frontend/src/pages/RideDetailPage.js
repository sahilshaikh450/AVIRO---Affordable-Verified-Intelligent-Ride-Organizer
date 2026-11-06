import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { VehicleIcon, Spinner } from '../components/common/UIComponents';
import LiveMap from '../components/common/LiveMap';
import useBookRide from '../hooks/useBookRide';
import { RouteLines } from '../components/common/RideAlerts';
import { timeOf, dayOf, isPast } from '../utils/when';
import Icon, { initial } from '../components/common/Icon';

const OPEN = ['PENDING', 'ACTIVE'];
const cap = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '');

// A ride before booking: when, where, who's driving, and one clear Book button.
// Live location and SOS are on the trip screen once the seat is booked.
export default function RideDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const { bookRide, bookingRideId } = useBookRide();

  useEffect(() => {
    api.get(`/rides/${id}`).then(res => setRide(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!ride) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-4xl"><Icon e="🔍" /></p>
        <p className="font-semibold">This ride is no longer available</p>
        <Link to="/search" className="btn-primary inline-block">Find another ride</Link>
      </div>
    );
  }

  const d = ride.driver || {};
  const isDriver = user && d.id === user.id;
  const gone = isPast(ride.departureTime);
  const canBook = !isDriver && OPEN.includes(ride.status) && ride.availableSeats > 0 && !gone;
  const why = ride.status === 'CANCELLED' ? 'The driver cancelled this ride'
    : gone || !OPEN.includes(ride.status) ? 'This ride has already left'
    : ride.availableSeats < 1 ? 'This ride is full' : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-up pb-24 md:pb-6">
      <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/search'))}
        className="text-aviro-muted text-sm hover:text-aviro-fg">← Back</button>

      {/* When, where, how much */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display font-bold text-3xl leading-none">{timeOf(ride.departureTime)}</p>
            <p className="text-sm text-aviro-muted mt-1.5">{dayOf(ride.departureTime)}</p>
          </div>
          <div className="text-right">
            <p className="text-aviro-green font-bold text-3xl leading-none">₹{ride.pricePerSeat}</p>
            <p className="text-xs text-aviro-muted mt-1.5">per seat</p>
          </div>
        </div>
        <RouteLines from={ride.fromLocation} to={ride.toLocation} size="lg" />
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-aviro-card2 border border-aviro-border rounded-full px-2.5 py-1"><Icon e="💺" /> {ride.availableSeats} of {ride.totalSeats} seats left</span>
          {ride.womenOnly && <span className="bg-pink-500/10 text-pink-600 rounded-full px-2.5 py-1 font-semibold"><Icon e="🚺" /> Women-only</span>}
        </div>
        {ride.notes && (
          <p className="text-sm bg-aviro-card2 rounded-xl p-3"><span className="text-aviro-muted">Driver's note: </span>{ride.notes}</p>
        )}
      </div>

      {/* Who's driving */}
      <div className="card p-5 space-y-3">
        <p className="text-xs font-semibold text-aviro-muted uppercase tracking-wider">Driver</p>
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-full bg-aviro-card2 border border-aviro-border flex items-center justify-center text-2xl flex-shrink-0">
            {initial(d?.fullName)}
          </span>
          <div className="min-w-0">
            <p className="font-bold">{d.fullName}{d.isCollegeVerified && <span className="text-aviro-green text-sm ml-1.5"><Icon e="✓" /> Verified</span>}</p>
            <p className="text-xs text-aviro-muted truncate">{d.collegeName}{d.department ? ` · ${d.department}` : ''}</p>
            <p className="text-xs text-aviro-muted">⭐ {d.rating != null ? Number(d.rating).toFixed(1) : '–'}{d.totalRides ? ` · ${d.totalRides} rides` : ''}</p>
          </div>
        </div>
        {d.vehicleType && (
          <p className="text-sm bg-aviro-card2 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <VehicleIcon type={d.vehicleType} />
            <span>{[d.vehicleModel, d.vehicleColor].filter(Boolean).join(' · ') || cap(d.vehicleType)}</span>
          </p>
        )}
        <p className="text-xs text-aviro-muted">Phone number and number plate show after the driver accepts your booking.</p>
      </div>

      {/* Route on a map */}
      <div className="card p-3">
        <LiveMap
          fromLat={ride.fromLat || 18.5204} fromLng={ride.fromLng || 73.8567}
          toLat={ride.toLat || 18.5314} toLng={ride.toLng || 73.8446}
          fromLabel={ride.fromLocation} toLabel={ride.toLocation}
          height="220px"
        />
      </div>

      {/* Book bar: sits above the bottom nav on phones */}
      <div className="fixed md:static left-0 right-0 bottom-[68px] z-10 px-4 md:px-0">
        <div className="max-w-2xl mx-auto bg-aviro-card/95 backdrop-blur border border-aviro-border rounded-2xl p-3 flex items-center gap-3 shadow-2xl md:shadow-none" data-testid="book-bar">
          {isDriver ? (
            <>
              <p className="flex-1 text-sm text-aviro-muted">This is your ride.</p>
              <Link to="/my-rides" className="btn-primary text-sm py-2.5">Manage</Link>
            </>
          ) : canBook ? (
            <>
              <div className="flex-1">
                <p className="font-bold">₹{ride.pricePerSeat} <span className="text-xs text-aviro-muted font-normal">for 1 seat</span></p>
                <p className="text-[11px] text-aviro-muted">Pay the driver after the trip</p>
              </div>
              <button onClick={() => bookRide(ride)} disabled={!!bookingRideId} className="btn-primary py-3 px-6 disabled:opacity-60">
                {bookingRideId ? 'Booking…' : 'Book seat'}
              </button>
            </>
          ) : (
            <>
              <p className="flex-1 text-sm text-aviro-muted">{why}</p>
              <Link to="/search" className="btn-secondary text-sm py-2">Find another</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

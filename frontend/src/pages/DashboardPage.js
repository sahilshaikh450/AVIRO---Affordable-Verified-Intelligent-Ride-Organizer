import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { fetchNearbyRides, fetchMyRides } from '../store/rideSlice';
import { fetchMyBookings } from '../store/bookingSlice';
import useBookRide from '../hooks/useBookRide';
import { fetchProfile } from '../store/authSlice';
import { RideCard, Spinner } from '../components/common/UIComponents';
import { RouteLines } from '../components/common/RideAlerts';
import { StatusLine, riderStatus } from '../components/common/Trips';
import { formatWhen, isPast } from '../utils/when';

const OPEN_RIDE = ['PENDING', 'ACTIVE', 'IN_PROGRESS'];

// The one trip that matters most right now, as rider or driver
function NextTrip({ booking, ride, requests }) {
  if (booking) {
    const st = riderStatus(booking);
    return (
      <Link to={`/tracking/${booking.id}`} className={`card p-4 block space-y-3 ${st.tone === 'live' ? 'border-aviro-orange/50' : ''}`} data-testid="next-trip">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-aviro-muted uppercase tracking-wider">Your next ride</p>
          <span className="text-xs text-aviro-orange font-semibold">Open →</span>
        </div>
        <StatusLine {...st} />
        <p className="font-bold text-lg">{formatWhen(booking.departureTime)}</p>
        <RouteLines from={booking.fromLocation} to={booking.toLocation} />
      </Link>
    );
  }
  if (ride) {
    return (
      <Link to="/my-rides" className={`card p-4 block space-y-3 ${requests ? 'border-aviro-blue/50' : ''}`} data-testid="next-trip">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-aviro-muted uppercase tracking-wider">Ride you're offering</p>
          <span className="text-xs text-aviro-orange font-semibold">Manage →</span>
        </div>
        <StatusLine {...(requests
          ? { icon: '🔔', text: `${requests} request${requests > 1 ? 's' : ''} waiting for you`, tone: 'act' }
          : { icon: '🟢', text: `${ride.totalSeats - ride.availableSeats} of ${ride.totalSeats} seats booked`, tone: 'good' })} />
        <p className="font-bold text-lg">{formatWhen(ride.departureTime)}</p>
        <RouteLines from={ride.fromLocation} to={ride.toLocation} />
      </Link>
    );
  }
  return null;
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { nearby, loading, myRides } = useSelector(s => s.rides);
  const { list: bookings } = useSelector(s => s.booking);
  const [requests, setRequests] = useState(0);
  const { bookRide, bookingRideId } = useBookRide();

  useEffect(() => {
    dispatch(fetchProfile());
    dispatch(fetchMyBookings());
    dispatch(fetchMyRides());
    dispatch(fetchNearbyRides({ lat: 18.5204, lng: 73.8567, seats: 1 }));
  }, [dispatch]);

  const nextBooking = useMemo(() => bookings
    .filter(b => ['REQUESTED', 'CONFIRMED'].includes(b.status) && !isPast(b.departureTime, 12))
    .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime))[0], [bookings]);
  const toPay = bookings.filter(b => riderStatus(b).needsAction);
  const upcomingRides = useMemo(() => (myRides || [])
    .filter(r => OPEN_RIDE.includes(r.status) && !isPast(r.departureTime, 3))
    .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime)), [myRides]);
  const nextRide = upcomingRides[0];

  // Requests waiting on the driver's upcoming rides
  useEffect(() => {
    if (!upcomingRides.length) { setRequests(0); return; }
    Promise.all(upcomingRides.slice(0, 5).map(r => api.get(`/bookings/ride/${r.id}`).then(res => res.data.data || []).catch(() => [])))
      .then(all => setRequests(all.flat().filter(b => b.status === 'REQUESTED').length));
  }, [upcomingRides]);

  // The driver's ride comes first when someone is waiting for an answer, or when it is sooner
  const showRideFirst = nextRide && (requests > 0 || !nextBooking
    || new Date(nextRide.departureTime) < new Date(nextBooking.departureTime));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const others = nearby.filter(r => r.driver?.id !== user?.id && !isPast(r.departureTime)).slice(0, 4);

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="font-display font-bold text-2xl">{greeting}, {user?.fullName?.split(' ')[0]} 👋</h1>
        <p className="text-aviro-muted text-sm mt-0.5">Where are you going today?</p>
      </div>

      {!user?.isCollegeVerified && (
        <Link to="/profile?tab=id" className="card p-4 border-yellow-500/40 bg-yellow-500/5 flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <span className="flex-1">
            <span className="font-semibold text-sm text-yellow-300 block">Verify your college ID to start riding</span>
            <span className="text-xs text-aviro-muted">Upload a photo of your ID card. It takes a minute.</span>
          </span>
          <span className="text-aviro-orange text-sm font-semibold">Verify →</span>
        </Link>
      )}

      {toPay.length > 0 && (
        <Link to="/bookings" className="card p-4 border-aviro-blue/40 bg-aviro-blue/5 flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <span className="flex-1 text-sm">
            <span className="font-semibold block">{toPay.length > 1 ? 'Pay for your rides' : 'Pay for your last ride'}</span>
            <span className="text-xs text-aviro-muted">{toPay.length > 1
              ? `${toPay.length} finished rides are waiting for payment`
              : `₹${toPay[0].totalAmount} to ${toPay[0].driver?.fullName?.split(' ')[0] || 'the driver'}`}</span>
          </span>
          <span className="text-aviro-orange text-sm font-semibold">Pay →</span>
        </Link>
      )}

      {(nextBooking || nextRide) && (
        showRideFirst
          ? <NextTrip ride={nextRide} requests={requests} />
          : <NextTrip booking={nextBooking} />
      )}

      {/* The two things people come here to do */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/search" className="card p-4 hover:border-aviro-orange/50 transition-colors bg-aviro-orange/5 border-aviro-orange/30" data-testid="action-find">
          <span className="text-3xl block">🔍</span>
          <span className="font-bold block mt-2">Find a ride</span>
          <span className="text-xs text-aviro-muted block mt-0.5">Get a seat with a student going your way</span>
        </Link>
        <Link to="/offer-ride" className="card p-4 hover:border-aviro-orange/50 transition-colors" data-testid="action-offer">
          <span className="text-3xl block">🏍️</span>
          <span className="font-bold block mt-2">Offer a ride</span>
          <span className="text-xs text-aviro-muted block mt-0.5">Driving anyway? Share seats, split fuel</span>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Rides coming up</h2>
          <Link to="/search" className="text-aviro-orange text-sm font-semibold">See all</Link>
        </div>
        {loading && nearby.length === 0 ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : others.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {others.map(ride => (
              <RideCard key={ride.id} ride={ride} booking={bookingRideId === ride.id}
                onBook={() => bookRide(ride)} onClick={() => navigate(`/rides/${ride.id}`)} />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center space-y-2">
            <p className="text-3xl">🛣️</p>
            <p className="font-semibold">No rides posted yet</p>
            <p className="text-sm text-aviro-muted">Search your route and turn on an alert, or offer a ride yourself.</p>
          </div>
        )}
      </div>
    </div>
  );
}

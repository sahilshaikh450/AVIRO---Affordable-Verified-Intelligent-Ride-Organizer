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
import Icon, { initial } from '../components/common/Icon';

const OPEN_RIDE = ['PENDING', 'ACTIVE', 'IN_PROGRESS'];

// Small status pill for the black card
const DarkChip = ({ text, tone }) => (
  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tone === 'wait' ? 'bg-yellow-400/20 text-yellow-200' : 'bg-white/15 text-white'}`}>{text}</span>
);

// The one trip that matters most right now, as rider or driver
function NextTrip({ booking, ride, requests }) {
  if (booking) {
    const st = riderStatus(booking);
    return (
      <Link to={`/tracking/${booking.id}`} className="block rounded-2xl bg-black text-white p-4 space-y-3" data-testid="next-trip">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-white/60">Your next ride</p>
          <DarkChip {...st} />
        </div>
        <p className="font-bold text-xl tracking-tight">{formatWhen(booking.departureTime)}</p>
        <RouteLines from={booking.fromLocation} to={booking.toLocation} onDark />
        {booking.driver && (
          <div className="flex items-center gap-3 pt-3 border-t border-white/15">
            <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center font-bold text-sm">{initial(booking.driver.fullName)}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold truncate">{booking.driver.fullName}</span>
              <span className="block text-xs text-white/60 truncate">{[booking.driver.vehicleModel, booking.driver.vehicleColor].filter(Boolean).join(' · ') || 'Driver'}</span>
            </span>
            <span className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-full">Open trip</span>
          </div>
        )}
      </Link>
    );
  }
  if (ride) {
    return (
      <Link to="/my-rides" className="block rounded-2xl bg-black text-white p-4 space-y-3" data-testid="next-trip">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-white/60">Ride you're offering</p>
          <DarkChip text={requests ? `${requests} request${requests > 1 ? 's' : ''} waiting` : `${ride.totalSeats - ride.availableSeats} of ${ride.totalSeats} seats booked`} />
        </div>
        <p className="font-bold text-xl tracking-tight">{formatWhen(ride.departureTime)}</p>
        <RouteLines from={ride.fromLocation} to={ride.toLocation} onDark />
        <div className="pt-3 border-t border-white/15 flex justify-end">
          <span className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-full">{requests ? 'Answer requests' : 'Manage ride'}</span>
        </div>
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
        <p className="text-aviro-muted text-sm">{greeting}, {user?.fullName?.split(' ')[0]}</p>
        <h1 className="font-display font-extrabold text-3xl tracking-tight mt-0.5">Where to today?</h1>
      </div>

      <Link to="/search" className="flex items-center gap-3 h-[52px] pl-4 pr-2 rounded-2xl bg-aviro-card2 text-aviro-muted" data-testid="home-search">
        <Icon name="search" size={18} />
        <span className="flex-1 text-[15px] font-medium">Search a destination</span>
        <span className="flex items-center gap-1.5 bg-white text-black text-sm font-semibold px-3 py-2 rounded-full"><Icon name="clock" size={14} /> Now</span>
      </Link>

      {!user?.isCollegeVerified && (
        <Link to="/profile?tab=id" className="card p-4 border-yellow-500/40 bg-yellow-500/5 flex items-center gap-3">
          <span className="text-2xl"><Icon e="🎓" /></span>
          <span className="flex-1">
            <span className="font-semibold text-sm text-yellow-700 block">Verify your college ID to start riding</span>
            <span className="text-xs text-aviro-muted">Upload a photo of your ID card. It takes a minute.</span>
          </span>
          <span className="text-aviro-orange text-sm font-semibold">Verify →</span>
        </Link>
      )}

      {toPay.length > 0 && (
        <Link to="/bookings" className="rounded-2xl p-4 bg-aviro-card2 flex items-center gap-3">
          <span className="text-2xl"><Icon e="💳" /></span>
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
        <Link to="/search" className="card p-4 hover:border-black transition-colors" data-testid="action-find">
          <span className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center"><Icon name="search" size={20} /></span>
          <span className="font-bold block mt-3">Find a ride</span>
          <span className="text-xs text-aviro-muted block mt-0.5">Get a seat with a student going your way</span>
        </Link>
        <Link to="/offer-ride" className="card p-4 hover:border-black transition-colors" data-testid="action-offer">
          <span className="w-10 h-10 rounded-xl bg-aviro-card2 flex items-center justify-center"><Icon name="bike" size={22} /></span>
          <span className="font-bold block mt-3">Offer a ride</span>
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

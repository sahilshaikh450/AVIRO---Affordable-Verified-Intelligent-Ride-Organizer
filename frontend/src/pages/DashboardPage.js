import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchNearbyRides } from '../store/rideSlice';
import { fetchMyBookings } from '../store/bookingSlice';
import useBookRide from '../hooks/useBookRide';
import { fetchProfile } from '../store/authSlice';
import { StatCard, RideCard, EmptyState, Spinner } from '../components/common/UIComponents';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user }   = useSelector(s => s.auth);
  const { nearby, loading } = useSelector(s => s.rides);
  const { list: bookings  } = useSelector(s => s.booking);

  useEffect(() => {
    dispatch(fetchProfile());
    dispatch(fetchMyBookings());
    dispatch(fetchNearbyRides({ lat: 18.5204, lng: 73.8567, seats: 1 }));
  }, [dispatch]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { bookRide: handleBook } = useBookRide();

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Welcome */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl">
            {greeting}, {user?.fullName?.split(' ')[0]}! {user?.gender === 'FEMALE' ? '👩' : '👨'}
          </h1>
          <p className="text-aviro-muted text-sm mt-0.5">{user?.collegeName} · {user?.locality}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/search"     className="btn-primary text-sm">🔍 Find Ride</Link>
          <Link to="/offer-ride" className="btn-secondary text-sm">🏍️ Offer Ride</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🏍️" label="Total Rides"   value={user?.totalRides || 0}                    color="orange" />
        <StatCard icon="⭐" label="Your Rating"    value={`${user?.rating?.toFixed(1) || '5.0'}★`} color="yellow" />
        <StatCard icon="🪙" label="AVIRO Credits"  value={user?.aviroCredits || 100}                color="green"  />
        <StatCard icon="🌱" label="CO₂ Saved (kg)" value={user?.co2Saved?.toFixed(1) || '0'}       color="green" trend="↑ Great work!" />
      </div>

      {/* Active Bookings */}
      {bookings.filter(b => ['CONFIRMED','REQUESTED'].includes(b.status)).length > 0 && (
        <div>
          <h2 className="font-bold text-lg mb-3">📋 Active Bookings</h2>
          <div className="grid gap-3">
            {bookings.filter(b => ['CONFIRMED','REQUESTED'].includes(b.status)).slice(0,2).map(b => (
              <div key={b.id} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">{b.fromLocation} → {b.toLocation}</p>
                  <p className="text-xs text-aviro-muted mt-0.5">
                    🕐 {b.departureTime ? new Date(b.departureTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    · {b.driver?.fullName} ({b.driver?.gender === 'FEMALE' ? 'Female' : 'Male'} driver)
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${b.status === 'CONFIRMED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Rides */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">🗺️ Rides Near You</h2>
          <Link to="/search" className="text-aviro-orange text-sm hover:underline">View all →</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : nearby.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {nearby.slice(0, 4).map(ride => (
              <RideCard
                key={ride.id}
                ride={ride}
                onBook={() => handleBook(ride)}
                onClick={() => navigate(`/rides/${ride.id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🏍️"
            title="No rides nearby"
            subtitle="Be the first to offer a ride on your route!"
            action={<Link to="/offer-ride" className="btn-primary">Offer a Ride</Link>}
          />
        )}
      </div>

      {/* Verification banner */}
      {!user?.isCollegeVerified && (
        <div className="card p-4 border-yellow-500/30 bg-yellow-500/5 flex items-center gap-4">
          <span className="text-2xl">🎓</span>
          <div className="flex-1">
            <p className="font-semibold text-sm text-yellow-400">Verify your college ID</p>
            <p className="text-xs text-aviro-muted mt-0.5">Upload your college ID to unlock all features and increase trust score</p>
          </div>
          <Link to="/profile" className="text-aviro-orange text-sm font-semibold whitespace-nowrap hover:underline">Verify →</Link>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyRides, cancelRide } from '../store/rideSlice';
import { EmptyState, Spinner, GenderBadge } from '../components/common/UIComponents';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  PENDING:     'bg-yellow-500/10 text-yellow-400',
  ACTIVE:      'bg-green-500/10 text-green-400',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400',
  COMPLETED:   'bg-aviro-muted/10 text-aviro-muted',
  CANCELLED:   'bg-red-500/10 text-red-400',
  DEPARTED:    'bg-aviro-muted/10 text-aviro-muted',
};

const VEHICLE_ICONS = { BIKE: '🏍️', SCOOTY: '🛵', CAR: '🚗', AUTO: '🛺', VAN: '🚐' };

const isOpen = (r) => ['PENDING', 'ACTIVE', 'IN_PROGRESS'].includes(r.status);
const hasLeft = (r) => r.departureTime && new Date(r.departureTime).getTime() < Date.now();
// An open ride whose time has passed is shown as departed, not as still waiting
const displayStatus = (r) => (r.status === 'PENDING' && hasLeft(r) ? 'DEPARTED' : r.status);

const TABS = [
  { key: 'UPCOMING',  label: 'Upcoming',  match: r => isOpen(r) && !hasLeft(r) },
  { key: 'PAST',      label: 'Past',      match: r => r.status === 'COMPLETED' || (isOpen(r) && hasLeft(r)) },
  { key: 'CANCELLED', label: 'Cancelled', match: r => r.status === 'CANCELLED' },
  { key: 'ALL',       label: 'All',       match: () => true },
];

export default function MyRidesPage() {
  const dispatch = useDispatch();
  const { myRides, loading } = useSelector(s => s.rides);
  const { user } = useSelector(s => s.auth);
  const [tab, setTab] = useState('UPCOMING');

  useEffect(() => { dispatch(fetchMyRides()); }, [dispatch]);

  const current = TABS.find(t => t.key === tab);
  // Upcoming: soonest first; everything else: newest first
  const filtered = myRides.filter(current.match).sort((a, b) =>
    (tab === 'UPCOMING' ? 1 : -1) * (new Date(a.departureTime) - new Date(b.departureTime)));

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this ride? Riders who requested it will be told.')) return;
    const res = await dispatch(cancelRide(id));
    if (res.error) toast.error(res.payload || 'Could not cancel the ride');
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">My Rides 🗺️</h1>
          <p className="text-aviro-muted text-sm">Rides you've offered</p>
        </div>
        <Link to="/offer-ride" className="btn-primary text-sm">+ Offer New Ride</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => {
          const count = myRides.filter(t.match).length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all
                ${tab === t.key ? 'bg-aviro-orange text-white' : 'bg-aviro-card2 text-aviro-muted border border-aviro-border hover:border-aviro-orange/50'}`}>
              {t.label}{count > 0 && <span className="ml-1.5 opacity-75">{count}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏍️" title={tab === 'UPCOMING' ? 'No upcoming rides' : 'No rides here'}
          subtitle="Offer a ride on your college route and share the cost of the trip!"
          action={<Link to="/offer-ride" className="btn-primary">Offer a Ride</Link>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(ride => {
            const shown = displayStatus(ride);
            const vehicle = ride.driver?.vehicleType;
            return (
            <div key={ride.id} className={`card p-4 sm:p-5 hover:border-aviro-orange/30 transition-colors ${shown === 'CANCELLED' ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[shown]}`}>{shown.replace('_', ' ')}</span>
                    {ride.womenOnly && <span className="text-xs bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full font-semibold">🚺 Women-only</span>}
                    {ride.isRecurring && <span className="text-xs bg-aviro-blue/10 text-aviro-blue px-2 py-0.5 rounded-full font-semibold">🔁 Recurring</span>}
                  </div>
                  <p className="font-semibold leading-snug break-words">{ride.fromLocation} → {ride.toLocation}</p>
                  <p className="text-xs text-aviro-muted mt-0.5">
                    🕐 {ride.departureTime ? new Date(ride.departureTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-aviro-green font-bold text-lg">₹{ride.pricePerSeat}</p>
                  <p className="text-xs text-aviro-muted">per seat</p>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-3 text-xs text-aviro-muted">
                  <span>💺 {ride.availableSeats}/{ride.totalSeats} seats left</span>
                  {vehicle && <span>{VEHICLE_ICONS[vehicle] || '🚘'} {vehicle.charAt(0) + vehicle.slice(1).toLowerCase()}</span>}
                </div>
                {shown === 'PENDING' && (
                  <button onClick={() => handleCancel(ride.id)}
                    className="text-xs text-red-400 hover:underline font-medium">Cancel Ride</button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

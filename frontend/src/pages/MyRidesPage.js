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
};

export default function MyRidesPage() {
  const dispatch = useDispatch();
  const { myRides, loading } = useSelector(s => s.rides);
  const { user } = useSelector(s => s.auth);
  const [tab, setTab] = useState('ALL');

  useEffect(() => { dispatch(fetchMyRides()); }, [dispatch]);

  const filtered = tab === 'ALL' ? myRides : myRides.filter(r => r.status === tab);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this ride?')) return;
    const res = await dispatch(cancelRide(id));
    if (!res.error) toast.success('Ride cancelled');
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
        {['ALL','PENDING','ACTIVE','COMPLETED','CANCELLED'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all
              ${tab === t ? 'bg-aviro-orange text-white' : 'bg-aviro-card2 text-aviro-muted border border-aviro-border hover:border-aviro-orange/50'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏍️" title="No rides found"
          subtitle="Start offering rides on your college route and earn AVIRO credits!"
          action={<Link to="/offer-ride" className="btn-primary">Offer a Ride</Link>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(ride => (
            <div key={ride.id} className="card p-5 hover:border-aviro-orange/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[ride.status]}`}>{ride.status}</span>
                    {ride.womenOnly && <span className="text-xs bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full font-semibold">🚺 Women-only</span>}
                    {ride.isRecurring && <span className="text-xs bg-aviro-blue/10 text-aviro-blue px-2 py-0.5 rounded-full font-semibold">🔁 Recurring</span>}
                  </div>
                  <p className="font-semibold">{ride.fromLocation} → {ride.toLocation}</p>
                  <p className="text-xs text-aviro-muted mt-0.5">
                    🕐 {ride.departureTime ? new Date(ride.departureTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-aviro-green font-bold text-lg">₹{ride.pricePerSeat}</p>
                  <p className="text-xs text-aviro-muted">per seat</p>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-3 text-xs text-aviro-muted">
                  <span>💺 {ride.availableSeats}/{ride.totalSeats} seats left</span>
                  <span>{ride.driver?.vehicleType === 'BIKE' ? '🏍️' : ride.driver?.vehicleType === 'CAR' ? '🚗' : '🛵'} {ride.driver?.vehicleType}</span>
                </div>
                {ride.status === 'PENDING' && (
                  <button onClick={() => handleCancel(ride.id)}
                    className="text-xs text-red-400 hover:underline font-medium">Cancel Ride</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

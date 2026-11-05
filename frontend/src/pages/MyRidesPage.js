import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { fetchMyRides, cancelRide } from '../store/rideSlice';
import { EmptyState, Spinner } from '../components/common/UIComponents';
import { RouteLines } from '../components/common/RideAlerts';
import { TripsSwitch, Segments, StatusLine, firstName } from '../components/common/Trips';
import { formatWhen, isPast } from '../utils/when';

const PAGE = 10;
const OPEN = ['PENDING', 'ACTIVE', 'IN_PROGRESS'];
// Bookings are loaded for upcoming rides and for rides of the last week (cash to confirm)
const RECENT_DAYS = 7;

const isUpcomingRide = (r) => OPEN.includes(r.status) && !isPast(r.departureTime, 3);

const STAGE = {
  ON_THE_WAY: 'On the way to pickup',
  ARRIVED: 'At the pickup',
  STARTED: 'On the trip',
};

const rideStatus = (r, bookings) => {
  if (r.status === 'CANCELLED') return { icon: '✕', text: 'Cancelled', tone: 'bad' };
  if (r.status === 'COMPLETED' || !isUpcomingRide(r)) return { icon: '🏁', text: 'Done', tone: 'done' };
  const waiting = bookings.filter(b => b.status === 'REQUESTED').length;
  if (waiting) return { icon: '🔔', text: `${waiting} request${waiting > 1 ? 's' : ''} to answer`, tone: 'act' };
  if (bookings.some(b => b.status === 'CONFIRMED' && b.tripStage)) return { icon: '🚗', text: 'Trip in progress', tone: 'live' };
  if (r.availableSeats === 0) return { icon: '✅', text: 'Full', tone: 'good' };
  return { icon: '🟢', text: 'Open for bookings', tone: 'good' };
};

function RiderRow({ b, onAnswer, onCash, busy }) {
  const r = b.rider || {};
  const cashToConfirm = b.status === 'COMPLETED' && b.paymentMethod === 'CASH' && b.paymentStatus !== 'COMPLETED';
  return (
    <div className="rounded-xl bg-aviro-card2 border border-aviro-border p-3 space-y-2.5">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-aviro-card flex items-center justify-center flex-shrink-0">{r.gender === 'FEMALE' ? '👩' : '👨'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{r.fullName || 'Rider'}</p>
          <p className="text-xs text-aviro-muted truncate">
            {b.status === 'REQUESTED' ? `Wants ${b.seatsBooked} seat${b.seatsBooked > 1 ? 's' : ''} · ₹${b.totalAmount}`
              : b.status === 'CONFIRMED' ? (STAGE[b.tripStage] || 'Confirmed')
              : cashToConfirm ? `Says they paid ₹${b.totalAmount} cash`
              : b.status === 'COMPLETED' ? 'Completed' : b.status.toLowerCase()}
            {r.collegeName && b.status === 'REQUESTED' ? ` · ${r.collegeName}` : ''}
          </p>
        </div>
      </div>
      {b.status === 'REQUESTED' && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onAnswer(b, 'REJECTED')} disabled={busy}
            className="bg-aviro-card border border-aviro-border text-aviro-muted font-semibold py-2 rounded-lg text-sm disabled:opacity-50">Decline</button>
          <button onClick={() => onAnswer(b, 'CONFIRMED')} disabled={busy}
            className="bg-aviro-green text-white font-bold py-2 rounded-lg text-sm disabled:opacity-50">Accept</button>
        </div>
      )}
      {b.status === 'CONFIRMED' && (
        <Link to={`/tracking/${b.id}`} className="block text-center btn-primary py-2 text-sm">Open trip · enter OTP & start</Link>
      )}
      {cashToConfirm && (
        <button onClick={() => onCash(b)} disabled={busy}
          className="w-full bg-aviro-green text-white font-bold py-2 rounded-lg text-sm disabled:opacity-50">✅ Yes, I got the cash</button>
      )}
    </div>
  );
}

// Rides this person offers as a driver, each with the riders on it
export default function MyRidesPage() {
  const dispatch = useDispatch();
  const { myRides, loading } = useSelector(s => s.rides);
  const [view, setView] = useState('upcoming');
  const [shown, setShown] = useState(PAGE);
  const [bookingsByRide, setBookingsByRide] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => { dispatch(fetchMyRides()); }, [dispatch]);

  const loadBookings = useCallback(async (rides) => {
    const recent = rides.filter(r => r.status !== 'CANCELLED' && !isPast(r.departureTime, 24 * RECENT_DAYS));
    const pairs = await Promise.all(recent.map(r =>
      api.get(`/bookings/ride/${r.id}`).then(res => [r.id, res.data.data || []]).catch(() => [r.id, []])));
    setBookingsByRide(Object.fromEntries(pairs));
  }, []);
  useEffect(() => { if (myRides.length) loadBookings(myRides); }, [myRides, loadBookings]);

  const { upcoming, past } = useMemo(() => ({
    upcoming: myRides.filter(isUpcomingRide).sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime)),
    past: myRides.filter(r => !isUpcomingRide(r)).sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime)),
  }), [myRides]);

  const requests = upcoming.flatMap(r => bookingsByRide[r.id] || []).filter(b => b.status === 'REQUESTED').length;
  const items = view === 'upcoming' ? upcoming : past.slice(0, shown);

  const refresh = () => dispatch(fetchMyRides());

  const answer = async (b, status) => {
    setBusy(b.id);
    try {
      await api.patch(`/bookings/${b.id}/status`, { status });
      toast.success(status === 'CONFIRMED' ? `${firstName(b.rider) || 'Rider'} is confirmed ✅` : 'Request declined');
      refresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not update'); }
    setBusy(null);
  };

  const confirmCash = async (b) => {
    setBusy(b.id);
    try {
      await api.post(`/bookings/${b.id}/confirm-cash`);
      toast.success('Cash payment confirmed 💰');
      refresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not confirm'); }
    setBusy(null);
  };

  const cancel = async (ride) => {
    const riders = (bookingsByRide[ride.id] || []).filter(b => ['REQUESTED', 'CONFIRMED'].includes(b.status)).length;
    if (!window.confirm(`Cancel this ride?${riders ? ` ${riders} rider${riders > 1 ? 's' : ''} will be told.` : ''}`)) return;
    const res = await dispatch(cancelRide(ride.id));
    if (res.error) toast.error(res.payload || 'Could not cancel the ride');
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display font-bold text-2xl">Trips</h1>
        <Link to="/offer-ride" className="btn-primary text-sm py-2 px-4">+ Offer a ride</Link>
      </div>
      <TripsSwitch requests={requests} />

      <Segments value={view} onChange={(v) => { setView(v); setShown(PAGE); }} options={[
        { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
        { key: 'past', label: 'Past', count: past.length },
      ]} />

      {loading && myRides.length === 0 ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : items.length === 0 ? (
        view === 'upcoming' ? (
          <EmptyState icon="🏍️" title="You're not offering any rides"
            subtitle="Going to college anyway? Offer your empty seats and split the fuel cost."
            action={<Link to="/offer-ride" className="btn-primary">Offer a ride</Link>} />
        ) : (
          <EmptyState icon="🕘" title="No past rides yet" subtitle="Rides you finish or cancel show up here." />
        )
      ) : (
        <div className="space-y-3">
          {items.map(ride => {
            const bookings = bookingsByRide[ride.id] || [];
            const st = rideStatus(ride, bookings);
            const active = bookings.filter(b => ['REQUESTED', 'CONFIRMED'].includes(b.status)
              || (b.status === 'COMPLETED' && b.paymentMethod === 'CASH' && b.paymentStatus !== 'COMPLETED'));
            const booked = ride.totalSeats - ride.availableSeats;
            const upcomingRide = isUpcomingRide(ride);
            return (
              <div key={ride.id} className={`card p-4 space-y-3 ${ride.status === 'CANCELLED' ? 'opacity-60' : ''} ${st.tone === 'act' ? 'border-aviro-blue/40' : ''}`} data-testid="ride-card">
                <StatusLine {...st} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{formatWhen(ride.departureTime)}</p>
                    <div className="mt-2"><RouteLines from={ride.fromLocation} to={ride.toLocation} /></div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-aviro-green font-bold text-lg">₹{ride.pricePerSeat}</p>
                    <p className="text-[11px] text-aviro-muted">per seat</p>
                  </div>
                </div>
                <p className="text-xs text-aviro-muted">
                  💺 {booked} of {ride.totalSeats} seat{ride.totalSeats > 1 ? 's' : ''} booked
                  {ride.womenOnly && <span className="text-pink-400"> · 🚺 Women-only</span>}
                </p>

                {active.length > 0 && (
                  <div className="space-y-2">
                    {active.map(b => <RiderRow key={b.id} b={b} onAnswer={answer} onCash={confirmCash} busy={busy === b.id} />)}
                  </div>
                )}
                {upcomingRide && active.length === 0 && (
                  <p className="text-xs text-aviro-muted bg-aviro-card2 rounded-xl p-3">No requests yet. You'll get a notification when a student books.</p>
                )}
                {upcomingRide && (
                  <button onClick={() => cancel(ride)} className="text-xs text-red-400 font-medium">Cancel this ride</button>
                )}
              </div>
            );
          })}
          {view === 'past' && past.length > shown && (
            <button onClick={() => setShown(n => n + PAGE)} className="w-full text-sm text-aviro-orange font-semibold py-2">
              Show more ({past.length - shown} left)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

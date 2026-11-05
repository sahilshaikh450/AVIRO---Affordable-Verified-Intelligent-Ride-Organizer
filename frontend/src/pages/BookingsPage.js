import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchMyBookings, cancelBooking } from '../store/bookingSlice';
import { EmptyState, Spinner } from '../components/common/UIComponents';
import ReviewModal from '../components/common/ReviewModal';
import PaymentChoiceModal from '../components/common/PaymentChoiceModal';
import { TripsSwitch, Segments, BookingCard, riderStatus } from '../components/common/Trips';
import { isPast } from '../utils/when';

const PAGE = 10;

// Still to happen, or needs something from the rider (pay)
const isUpcoming = (b) =>
  (['REQUESTED', 'CONFIRMED'].includes(b.status) && !isPast(b.departureTime, 12)) || riderStatus(b).needsAction;

// The rides this person booked as a rider. Rides they drive are on My Rides.
export default function BookingsPage() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.booking);
  const [view, setView] = useState('upcoming');
  const [shown, setShown] = useState(PAGE);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [paymentBooking, setPaymentBooking] = useState(null);

  useEffect(() => { dispatch(fetchMyBookings()); }, [dispatch]);

  const { upcoming, past } = useMemo(() => {
    const up = list.filter(isUpcoming)
      // Things to act on first, then soonest first
      .sort((a, b) => (riderStatus(b).needsAction ? 1 : 0) - (riderStatus(a).needsAction ? 1 : 0)
        || new Date(a.departureTime) - new Date(b.departureTime));
    const old = list.filter(b => !isUpcoming(b)).sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime));
    return { upcoming: up, past: old };
  }, [list]);

  const items = view === 'upcoming' ? upcoming : past.slice(0, shown);

  const cancel = async (b) => {
    if (!window.confirm(`Cancel your booking for ${b.fromLocation} → ${b.toLocation}?`)) return;
    const res = await dispatch(cancelBooking(b.id));
    if (!res.error) dispatch(fetchMyBookings());
  };

  const canRate = (b) => b.status === 'COMPLETED' && b.paymentStatus === 'COMPLETED' && !reviewedIds.has(b.id)
    && !isPast(b.departureTime, 24 * 7);

  return (
    <div className="space-y-4 animate-fade-up">
      <h1 className="font-display font-bold text-2xl">Trips</h1>
      <TripsSwitch />

      <Segments value={view} onChange={(v) => { setView(v); setShown(PAGE); }} options={[
        { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
        { key: 'past', label: 'Past', count: past.length },
      ]} />

      {loading && list.length === 0 ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : items.length === 0 ? (
        view === 'upcoming' ? (
          <EmptyState icon="🎒" title="No upcoming rides"
            subtitle="Find a ride on your route. Once you book, it shows up here with the OTP and live map."
            action={<Link to="/search" className="btn-primary">Find a ride</Link>} />
        ) : (
          <EmptyState icon="🕘" title="No past rides yet" subtitle="Rides you finish or cancel show up here." />
        )
      ) : (
        <div className="space-y-3">
          {items.map(b => (
            <BookingCard key={b.id} b={b} onCancel={cancel} onPay={setPaymentBooking}
              onRate={canRate(b) ? () => setReviewTarget({ booking: b, revieweeId: b.driver?.id, revieweeName: b.driver?.fullName || 'Driver' }) : null} />
          ))}
          {view === 'past' && past.length > shown && (
            <button onClick={() => setShown(n => n + PAGE)} className="w-full text-sm text-aviro-orange font-semibold py-2">
              Show more ({past.length - shown} left)
            </button>
          )}
        </div>
      )}

      {paymentBooking && (
        <PaymentChoiceModal booking={paymentBooking} onClose={() => setPaymentBooking(null)}
          onPaid={() => { dispatch(fetchMyBookings()); setPaymentBooking(null); }} />
      )}
      {reviewTarget && (
        <ReviewModal booking={reviewTarget.booking} revieweeId={reviewTarget.revieweeId}
          revieweeName={reviewTarget.revieweeName}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => setReviewedIds(prev => new Set(prev).add(reviewTarget.booking.id))} />
      )}
    </div>
  );
}

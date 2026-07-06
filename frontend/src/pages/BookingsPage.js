import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyBookings, cancelBooking } from '../store/bookingSlice';
import { EmptyState, Spinner, StatusBadge, GenderBadge } from '../components/common/UIComponents';
import ReviewModal from '../components/common/ReviewModal';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const TABS = ['ALL', 'REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

// ── Inline UPI Payment component (no separate file needed) ──────────────
function PaymentSection({ booking, onPaid }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [txnRef, setTxnRef]           = useState('');
  const [confirming, setConfirming]   = useState(false);

  // Already paid
  if (booking.paymentStatus === 'PAID') {
    return (
      <div className="flex items-center gap-2 bg-aviro-green/10 border border-aviro-green/20 rounded-xl px-4 py-2.5 text-sm font-semibold text-aviro-green">
        ✅ Payment Done
        {booking.paymentReference && (
          <span className="text-xs text-aviro-muted ml-auto">Ref: {booking.paymentReference.slice(0,14)}</span>
        )}
      </div>
    );
  }

  const amount    = booking.totalAmount;
  const upiId     = booking.driver?.upiId || 'aviro@upi';
  const note      = `AVIRO-${booking.id}`;
  const upiLink   = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=AVIRO+Driver&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  const handlePayClick = () => {
    window.location.href = upiLink;
    setTimeout(() => setShowConfirm(true), 2000);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await api.patch(`/bookings/${booking.id}/payment`, {
        paymentReference: txnRef.trim() || `UPI-${Date.now()}`,
      });
      toast.success('Payment confirmed! ✅');
      setShowConfirm(false);
      onPaid && onPaid();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm');
    }
    setConfirming(false);
  };

  if (showConfirm) {
    return (
      <div className="bg-aviro-card2 border border-aviro-orange/30 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-white">Did you complete the UPI payment?</p>
        <input
          value={txnRef}
          onChange={e => setTxnRef(e.target.value)}
          placeholder="UPI Transaction ID (optional)"
          className="input-field text-sm"
        />
        <div className="flex gap-2">
          <button onClick={() => setShowConfirm(false)}
            className="flex-1 bg-aviro-card border border-aviro-border text-aviro-muted text-sm py-2 rounded-lg">
            Not yet
          </button>
          <button onClick={handleConfirm} disabled={confirming}
            className="flex-1 bg-aviro-green text-white font-bold text-sm py-2 rounded-lg disabled:opacity-50">
            {confirming ? 'Saving...' : '✅ Yes, Paid!'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-aviro-muted bg-aviro-card2 rounded-lg px-3 py-2">
        <span>💳 Amount due</span>
        <span className="text-aviro-orange font-bold text-sm">₹{amount}</span>
      </div>
      <button onClick={handlePayClick}
        className="w-full bg-gradient-to-r from-aviro-green to-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        💳 Pay ₹{amount} via UPI
      </button>
      <p className="text-xs text-aviro-muted text-center">Opens GPay / PhonePe / Paytm automatically</p>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.booking);
  const { user } = useSelector(s => s.auth);
  const [tab, setTab] = useState('ALL');
  const [rideBookings, setRideBookings] = useState([]);
  const [loadingRide, setLoadingRide] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());

  useEffect(() => {
    dispatch(fetchMyBookings());
    fetchDriverBookings();
  }, [dispatch]);

  const fetchDriverBookings = async () => {
    setLoadingRide(true);
    try {
      const ridesRes = await api.get('/rides/my');
      const rides = ridesRes.data.data || [];
      let allBookings = [];
      for (const ride of rides) {
        try {
          const bRes = await api.get(`/bookings/ride/${ride.id}`);
          allBookings = [...allBookings, ...(bRes.data.data || [])];
        } catch {}
      }
      setRideBookings(allBookings);
    } catch {}
    setLoadingRide(false);
  };

  const handleAccept = async (bookingId) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: 'CONFIRMED' });
      toast.success('Booking accepted! ✅');
      fetchDriverBookings();
      dispatch(fetchMyBookings());
    } catch { toast.error('Failed to accept'); }
  };

  const handleReject = async (bookingId) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: 'REJECTED' });
      toast.success('Booking rejected');
      fetchDriverBookings();
    } catch { toast.error('Failed to reject'); }
  };

  const handleComplete = async (bookingId, openReviewFor) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: 'COMPLETED' });
      toast.success('Ride marked as completed! 🏁');
      fetchDriverBookings();
      dispatch(fetchMyBookings());
      if (openReviewFor) setReviewTarget(openReviewFor);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete ride');
    }
  };

  const filtered = tab === 'ALL' ? list : list.filter(b => b.status === tab);
  const pendingRequests  = rideBookings.filter(b => b.status === 'REQUESTED');
  const confirmedAsDriver = rideBookings.filter(b => b.status === 'CONFIRMED');

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display font-bold text-2xl mb-1">My Bookings 📋</h1>
        <p className="text-aviro-muted text-sm">Track all your ride bookings</p>
      </div>

      {/* ── INCOMING REQUESTS (Driver) ── */}
      <div>
        <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
          🔔 Incoming Ride Requests
          {pendingRequests.length > 0 && (
            <span className="bg-aviro-orange text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </h2>
        {loadingRide ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : pendingRequests.length === 0 ? (
          <div className="card p-6 text-center text-aviro-muted text-sm">
            <div className="text-3xl mb-2">🏍️</div>No pending requests right now
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map(b => (
              <div key={b.id} className="card p-5 border-aviro-orange/40 bg-aviro-orange/5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-aviro-card2 border-2 border-aviro-orange/30 flex items-center justify-center text-xl">
                      {b.rider?.gender === 'FEMALE' ? '👩' : '👨'}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{b.rider?.fullName || 'Rider'}</p>
                      <p className="text-xs text-aviro-muted">{b.rider?.collegeName}</p>
                      <GenderBadge gender={b.rider?.gender} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-aviro-green font-bold text-lg">₹{b.totalAmount}</p>
                    <p className="text-xs text-aviro-muted">{b.seatsBooked} seat{b.seatsBooked > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="bg-aviro-card2 rounded-xl p-3 mb-4">
                  <p className="text-sm font-medium">{b.fromLocation} → {b.toLocation}</p>
                  <p className="text-xs text-aviro-muted mt-1">
                    {b.departureTime ? new Date(b.departureTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleAccept(b.id)}
                    className="flex-1 bg-aviro-green text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90">
                    ✅ Accept
                  </button>
                  <button onClick={() => handleReject(b.id)}
                    className="flex-1 bg-red-500/10 text-red-400 border border-red-500/30 font-bold py-2.5 rounded-xl text-sm hover:bg-red-500/20">
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CONFIRMED AS DRIVER ── */}
      {confirmedAsDriver.length > 0 && (
        <div>
          <h2 className="font-bold text-lg mb-3">🚗 Your Confirmed Rides (as Driver)</h2>
          <div className="space-y-3">
            {confirmedAsDriver.map(b => (
              <div key={b.id} className="card p-5 border-aviro-blue/30 bg-aviro-blue/5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-aviro-card2 flex items-center justify-center text-lg">
                      {b.rider?.gender === 'FEMALE' ? '👩' : '👨'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{b.rider?.fullName || 'Rider'}</p>
                      <p className="text-xs text-aviro-muted">{b.fromLocation} → {b.toLocation}</p>
                      {/* Payment status for driver */}
                      <span className={`text-xs font-semibold ${b.paymentStatus === 'PAID' ? 'text-aviro-green' : 'text-yellow-400'}`}>
                        {b.paymentStatus === 'PAID' ? '💰 Payment Received' : '⏳ Payment Pending'}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status="CONFIRMED" />
                </div>
                <button
                  onClick={() => handleComplete(b.id, {
                    booking: b,
                    revieweeId: b.rider?.id,
                    revieweeName: b.rider?.fullName || 'Rider',
                    revieweeGender: b.rider?.gender,
                  })}
                  className="w-full bg-aviro-blue text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90">
                  🏁 Mark Ride as Completed
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MY BOOKINGS (as Rider) ── */}
      <div>
        <h2 className="font-bold text-lg mb-3">🎒 My Ride Bookings</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {TABS.map(t => (
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
          <EmptyState icon="📋" title="No bookings found" subtitle="Find a ride and book your first AVIRO ride!"
            action={<Link to="/search" className="btn-primary">Find a Ride</Link>} />
        ) : (
          <div className="space-y-3">
            {filtered.map(b => (
              <div key={b.id} className="card p-5 hover:border-aviro-orange/30 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-aviro-card2 border border-aviro-border flex items-center justify-center text-lg">
                      {b.driver?.gender === 'FEMALE' ? '👩' : '👨'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{b.driver?.fullName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <GenderBadge gender={b.driver?.gender} />
                        <span className="text-xs text-aviro-muted">⭐ {b.driver?.rating?.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={b.status} />
                    {/* Payment badge */}
                    {b.status === 'CONFIRMED' && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${b.paymentStatus === 'PAID'
                          ? 'bg-aviro-green/10 text-aviro-green'
                          : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {b.paymentStatus === 'PAID' ? '✅ Paid' : '⏳ Payment Due'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-aviro-card2 rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-aviro-orange" />
                      <div className="w-px h-4 bg-aviro-border" />
                      <div className="w-2 h-2 rounded-full bg-aviro-green" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-white font-medium">{b.fromLocation}</span>
                      <span className="text-aviro-muted">{b.toLocation}</span>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-aviro-green font-bold">₹{b.totalAmount}</p>
                      <p className="text-xs text-aviro-muted">{b.seatsBooked} seat{b.seatsBooked > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className="text-xs text-aviro-muted mt-2">
                    🕐 {b.departureTime ? new Date(b.departureTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </p>
                </div>

                {/* ── UPI PAYMENT (only for CONFIRMED + not yet paid) ── */}
                {b.status === 'CONFIRMED' && b.paymentStatus !== 'PAID' && (
                  <div className="mb-3">
                    <PaymentSection booking={b} onPaid={() => dispatch(fetchMyBookings())} />
                  </div>
                )}

                {/* ── Mark Complete ── */}
                {b.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleComplete(b.id, {
                      booking: b,
                      revieweeId: b.driver?.id,
                      revieweeName: b.driver?.fullName || 'Driver',
                      revieweeGender: b.driver?.gender,
                    })}
                    className="w-full mb-2 bg-aviro-card2 border border-aviro-border text-white font-semibold py-2 rounded-xl text-sm hover:border-aviro-blue/50 transition-colors">
                    🏁 Mark as Completed
                  </button>
                )}

                {/* ── Cancel ── */}
                {['REQUESTED', 'CONFIRMED'].includes(b.status) && (
                  <button onClick={() => dispatch(cancelBooking(b.id))}
                    className="w-full text-xs text-red-400 hover:underline font-medium py-1">
                    Cancel Booking
                  </button>
                )}

                {/* ── Rate Driver ── */}
                {b.status === 'COMPLETED' && !reviewedIds.has(b.id) && (
                  <button
                    onClick={() => setReviewTarget({
                      booking: b,
                      revieweeId: b.driver?.id,
                      revieweeName: b.driver?.fullName || 'Driver',
                      revieweeGender: b.driver?.gender,
                    })}
                    className="w-full mt-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-semibold py-2 rounded-xl text-sm hover:bg-yellow-500/20">
                    ⭐ Rate this Driver
                  </button>
                )}

                {b.status === 'COMPLETED' && reviewedIds.has(b.id) && (
                  <div className="mt-2 text-center text-xs text-aviro-green bg-aviro-green/5 py-2 rounded-xl">
                    ✅ Ride completed & reviewed
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewTarget && (
        <ReviewModal
          booking={reviewTarget.booking}
          revieweeId={reviewTarget.revieweeId}
          revieweeName={reviewTarget.revieweeName}
          revieweeGender={reviewTarget.revieweeGender}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => setReviewedIds(prev => new Set(prev).add(reviewTarget.booking.id))}
        />
      )}
    </div>
  );
}
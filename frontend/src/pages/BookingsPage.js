import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyBookings, cancelBooking } from '../store/bookingSlice';
import { EmptyState, Spinner, StatusBadge, GenderBadge } from '../components/common/UIComponents';
import ReviewModal from '../components/common/ReviewModal';
import PaymentChoiceModal from '../components/common/PaymentChoiceModal';
import MiniTrackingCard from '../components/common/MiniTrackingCard';
import { RiderOTPCard, DriverOTPVerifyCard } from '../components/common/RideOTPCard';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const TABS = ['ALL', 'REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

const TRIP_LABELS = {
  NONE:       'Driver not started yet',
  ON_THE_WAY: '🚗 Driver on the way',
  ARRIVED:    '📍 Driver arrived',
  STARTED:    '🏁 Trip in progress',
};

export default function BookingsPage() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.booking);
  const { user } = useSelector(s => s.auth);
  const [tab, setTab] = useState('ALL');
  const [rideBookings, setRideBookings] = useState([]);
  const [loadingRide, setLoadingRide] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [paymentBooking, setPaymentBooking] = useState(null);

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

  const handleDriverComplete = async (bookingId, openReviewFor) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: 'COMPLETED' });
      toast.success('Ride marked as completed! 🏁');
      fetchDriverBookings();
      dispatch(fetchMyBookings());
      if (openReviewFor) setReviewTarget(openReviewFor);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleConfirmCash = async (bookingId) => {
    try {
      await api.post(`/bookings/${bookingId}/confirm-cash`);
      toast.success('💰 Cash payment confirmed!');
      fetchDriverBookings();
      dispatch(fetchMyBookings());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const filtered = tab === 'ALL' ? list : list.filter(b => b.status === tab);
  const pendingRequests     = rideBookings.filter(b => b.status === 'REQUESTED');
  const confirmedAsDriver   = rideBookings.filter(b => b.status === 'CONFIRMED');
  const cashPendingAsDriver = rideBookings.filter(b =>
    b.status === 'COMPLETED' && b.paymentMethod === 'CASH' && b.paymentStatus !== 'COMPLETED'
  );

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
            <div className="text-3xl mb-2">🏍️</div>No pending requests
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
                      {b.rider?.department && (
                        <p className="text-xs text-aviro-muted">{b.rider.department} · Year {b.rider.yearOfStudy}</p>
                      )}
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
                      {b.rider?.phone && (
                        <a href={`tel:${b.rider.phone}`} className="text-xs text-aviro-orange">📞 {b.rider.phone}</a>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <StatusBadge status="CONFIRMED" />
                    <p className="text-xs text-aviro-muted">{TRIP_LABELS[b.tripStage] || TRIP_LABELS.NONE}</p>
                  </div>
                </div>

                {/* ── Driver OTP Verify Card ── */}
                {b.tripStage !== 'STARTED' && (
                  <div className="mb-3">
                    <DriverOTPVerifyCard
                      bookingId={b.id}
                      onVerified={() => fetchDriverBookings()}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Link to={`/tracking/${b.id}`}
                    className="flex-1 bg-aviro-orange text-white font-bold py-2.5 rounded-xl text-sm text-center hover:opacity-90">
                    🗺️ Open trip
                  </Link>
                  {b.tripStage === 'STARTED' && (
                    <button onClick={() => handleDriverComplete(b.id, {
                        booking: b, revieweeId: b.rider?.id,
                        revieweeName: b.rider?.fullName || 'Rider',
                      })}
                      className="flex-1 bg-aviro-blue text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90">
                      🏁 End trip
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CASH PAYMENT PENDING ── */}
      {cashPendingAsDriver.length > 0 && (
        <div>
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            💵 Cash Payment Confirmation
            <span className="bg-yellow-500 text-black text-xs font-bold px-2.5 py-0.5 rounded-full">
              {cashPendingAsDriver.length}
            </span>
          </h2>
          <div className="space-y-3">
            {cashPendingAsDriver.map(b => (
              <div key={b.id} className="card p-5 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-aviro-card2 flex items-center justify-center text-lg">
                    {b.rider?.gender === 'FEMALE' ? '👩' : '👨'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{b.rider?.fullName}</p>
                    <p className="text-xs text-aviro-muted">{b.fromLocation} → {b.toLocation}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-aviro-green font-bold">₹{b.totalAmount}</p>
                    <p className="text-xs text-yellow-400">Cash claimed</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleConfirmCash(b.id)}
                    className="flex-1 bg-aviro-green text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90">
                    ✅ Yes, I got the cash!
                  </button>
                </div>
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
                  <StatusBadge status={b.status} />
                </div>

                {/* Route + Booking ID */}
                <div className="bg-aviro-card2 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-aviro-muted">Booking ID</span>
                    <span className="text-xs font-bold text-aviro-orange bg-aviro-orange/10 px-2 py-0.5 rounded-full">
                      #AVR{String(b.id).padStart(5, '0')}
                    </span>
                  </div>
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

                {/* Driver Details after CONFIRMED */}
                {b.status === 'CONFIRMED' && b.driver && (
                  <div className="bg-aviro-card2 rounded-xl p-4 mb-3 border border-aviro-green/20">
                    <p className="text-xs text-aviro-green font-semibold mb-3">✅ Booking Confirmed — Driver Details</p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-aviro-orange/20 border-2 border-aviro-orange/30 flex items-center justify-center text-2xl">
                        {b.driver?.gender === 'FEMALE' ? '👩' : '👨'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{b.driver?.fullName}</p>
                        <p className="text-xs text-aviro-muted">{b.driver?.collegeName}</p>
                        {b.driver?.department && <p className="text-xs text-aviro-muted">{b.driver.department} · Year {b.driver.yearOfStudy}</p>}
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-aviro-orange font-bold">⭐ {b.driver?.rating?.toFixed(1)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {b.driver?.phone && (
                        <div className="bg-aviro-card rounded-lg p-2.5 col-span-2">
                          <p className="text-xs text-aviro-muted mb-0.5">Mobile</p>
                          <a href={`tel:${b.driver.phone}`} className="text-sm font-bold text-aviro-orange">
                            📞 {b.driver.phone}
                          </a>
                        </div>
                      )}
                      {b.driver?.vehicleModel && (
                        <div className="bg-aviro-card rounded-lg p-2.5 col-span-2">
                          <p className="text-xs text-aviro-muted mb-0.5">Vehicle</p>
                          <p className="text-xs font-semibold text-white">
                            🚗 {b.driver.vehicleModel} · {b.driver.vehicleColor}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Rider OTP Card ── */}
                {b.status === 'CONFIRMED' && (
                  <div className="mb-3">
                    <RiderOTPCard bookingId={b.id} />
                  </div>
                )}

                {/* Mini Tracking Map */}
                {b.status === 'CONFIRMED' && (
                  <MiniTrackingCard booking={b} />
                )}

                {/* Open the live trip screen */}
                {['REQUESTED', 'CONFIRMED'].includes(b.status) && (
                  <Link to={`/tracking/${b.id}`}
                    className="block w-full mt-2 bg-aviro-orange text-white font-bold py-2.5 rounded-xl text-sm text-center hover:opacity-90">
                    🗺️ Open ride{b.status === 'CONFIRMED' ? ` · ${TRIP_LABELS[b.tripStage] || TRIP_LABELS.NONE}` : ''}
                  </Link>
                )}

                {/* Pay after the driver ends the trip */}
                {b.status === 'COMPLETED' && !b.paymentMethod && (
                  <button onClick={() => setPaymentBooking(b)}
                    className="w-full mt-2 bg-aviro-green text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90">
                    💳 Pay ₹{b.totalAmount}
                  </button>
                )}

                {/* Cancel */}
                {['REQUESTED', 'CONFIRMED'].includes(b.status) && (
                  <button onClick={() => dispatch(cancelBooking(b.id))}
                    className="w-full mt-2 text-xs text-red-400 hover:underline font-medium py-1">
                    Cancel Booking
                  </button>
                )}

                {/* Rate Driver */}
                {b.status === 'COMPLETED' && b.paymentStatus === 'COMPLETED' && !reviewedIds.has(b.id) && (
                  <button onClick={() => setReviewTarget({
                    booking: b, revieweeId: b.driver?.id,
                    revieweeName: b.driver?.fullName || 'Driver',
                  })}
                    className="w-full mt-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-semibold py-2 rounded-xl text-sm">
                    ⭐ Rate this Driver
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
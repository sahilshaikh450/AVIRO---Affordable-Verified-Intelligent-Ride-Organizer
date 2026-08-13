import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Simple UPI deep-link payment button.
// Opens the user's UPI app (GPay/PhonePe/Paytm) with amount pre-filled.
// User completes payment there, then comes back and confirms.
export default function UpiPayButton({ booking, driverUpiId = 'driver@upi', onPaid }) {
  const [confirming, setConfirming] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [txnRef, setTxnRef] = useState('');

  const amount = booking.totalAmount;
  const note = `AVIRO ride ${booking.fromLocation} to ${booking.toLocation}`;

  // Build UPI deep link (works with GPay, PhonePe, Paytm, BHIM, etc.)
  const upiLink = `upi://pay?pa=${encodeURIComponent(driverUpiId)}&pn=${encodeURIComponent('AVIRO Driver')}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  const handlePayClick = () => {
    // Try to open UPI app
    window.location.href = upiLink;
    // After a short delay, show confirmation step
    setTimeout(() => setShowConfirm(true), 1500);
  };

  const handleConfirmPaid = async () => {
    setConfirming(true);
    try {
      await api.patch(`/bookings/${booking.id}/payment`, {
        paymentReference: txnRef.trim() || `UPI-${Date.now()}`,
      });
      toast.success('Payment confirmed! ✅');
      setShowConfirm(false);
      onPaid && onPaid();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm payment');
    } finally {
      setConfirming(false);
    }
  };

  if (booking.paymentStatus === 'PAID') {
    return (
      <div className="flex items-center justify-center gap-2 bg-aviro-green/10 text-aviro-green font-semibold py-2.5 rounded-xl text-sm border border-aviro-green/20">
        ✅ Paid
        {booking.paymentReference && (
          <span className="text-xs text-aviro-muted">· Ref: {booking.paymentReference.slice(0, 12)}</span>
        )}
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="bg-aviro-card2 border border-aviro-orange/30 rounded-xl p-4 space-y-3">
        <p className="text-sm text-white font-medium">Did you complete the UPI payment?</p>
        <input
          value={txnRef}
          onChange={e => setTxnRef(e.target.value)}
          placeholder="UPI Transaction ID (optional)"
          className="input-field text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 bg-aviro-card border border-aviro-border text-aviro-muted font-medium py-2 rounded-lg text-sm"
          >
            Not yet
          </button>
          <button
            onClick={handleConfirmPaid}
            disabled={confirming}
            className="flex-1 bg-aviro-green text-white font-bold py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {confirming ? 'Confirming...' : '✅ Yes, Paid!'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handlePayClick}
      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-aviro-green to-emerald-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
    >
      💳 Pay ₹{amount} via UPI
    </button>
  );
}
import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function PaymentChoiceModal({ booking, isDriver = false, onClose, onPaid }) {
  const [method, setMethod]         = useState(null);
  const [txnRef, setTxnRef]         = useState('');
  const [confirming, setConfirming] = useState(false);
  const [upiOpened, setUpiOpened]   = useState(false);

  const amount     = booking?.totalAmount || 0;
  const driverName = booking?.driver?.fullName || 'Driver';
  const riderName  = booking?.rider?.fullName || 'Rider';
  const note       = `AVIRO-${booking?.id}`;
  const upiLink    = `upi://pay?pa=aviro@upi&pn=${encodeURIComponent(driverName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  // ── DRIVER VIEW: Confirm cash received ──────────────────────────
  if (isDriver) {
    const handleDriverConfirmCash = async () => {
      setConfirming(true);
      try {
        await api.post(`/bookings/${booking.id}/confirm-cash`);
        toast.success('💰 Cash payment confirmed! Both parties notified.');
        onPaid && onPaid();
        onClose && onClose();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to confirm');
      }
      setConfirming(false);
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-aviro-card border border-aviro-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-up">
          <div className="p-5 border-b border-aviro-border">
            <h2 className="font-display font-bold text-xl">💵 Cash Payment</h2>
            <p className="text-aviro-muted text-sm mt-1">
              {riderName} claims to have paid <span className="text-aviro-green font-bold">₹{amount}</span> in cash
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl mb-2">💵</p>
              <p className="font-bold text-white">Did you receive ₹{amount} cash?</p>
              <p className="text-xs text-aviro-muted mt-1">from {riderName}</p>
            </div>
            <button onClick={handleDriverConfirmCash} disabled={confirming}
              className="w-full bg-aviro-green text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
              {confirming ? 'Confirming...' : '✅ Yes, I received the cash!'}
            </button>
            <button onClick={onClose}
              className="w-full text-xs text-aviro-muted hover:text-white py-2 border border-aviro-border rounded-xl">
              Not yet received
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RIDER VIEW: Choose payment method ───────────────────────────
  const handleUpiPay = () => {
    window.location.href = upiLink;
    setTimeout(() => setUpiOpened(true), 2000);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const ref = method === 'CASH'
        ? `CASH-${Date.now()}`
        : txnRef.trim() || `UPI-${Date.now()}`;

      await api.patch(`/bookings/${booking.id}/payment`, {
        paymentReference: ref,
        paymentMethod: method,
      });

      if (method === 'CASH') {
        toast('💵 Cash payment submitted! Waiting for driver confirmation.', { icon: '⏳' });
      } else {
        toast.success('✅ UPI payment confirmed! Driver notified.');
      }

      onPaid && onPaid();
      onClose && onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm payment');
    }
    setConfirming(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-aviro-card border border-aviro-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-up">

        <div className="p-5 border-b border-aviro-border">
          <h2 className="font-display font-bold text-xl">💰 Payment</h2>
          <p className="text-aviro-muted text-sm mt-1">
            Pay <span className="text-aviro-green font-bold">₹{amount}</span> to {driverName}
          </p>
        </div>

        <div className="p-5 space-y-4">

          {/* Method Selection */}
          {!method && (
            <>
              <p className="text-sm font-medium text-white">Choose payment method:</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setMethod('UPI')}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-aviro-border hover:border-aviro-green hover:bg-aviro-green/5 transition-all">
                  <span className="text-4xl">📱</span>
                  <div className="text-center">
                    <p className="font-bold text-sm">UPI</p>
                    <p className="text-xs text-aviro-muted">GPay / PhonePe / Paytm</p>
                    <p className="text-xs text-aviro-green mt-1">Instant confirm ✅</p>
                  </div>
                </button>
                <button onClick={() => setMethod('CASH')}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-aviro-border hover:border-aviro-orange hover:bg-aviro-orange/5 transition-all">
                  <span className="text-4xl">💵</span>
                  <div className="text-center">
                    <p className="font-bold text-sm">Cash</p>
                    <p className="text-xs text-aviro-muted">Pay directly to driver</p>
                    <p className="text-xs text-yellow-400 mt-1">Driver confirms ⏳</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* UPI Flow */}
          {method === 'UPI' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-aviro-green/10 border border-aviro-green/20 rounded-xl px-4 py-3">
                <span className="text-xl">📱</span>
                <div>
                  <p className="text-sm font-semibold text-aviro-green">UPI Payment</p>
                  <p className="text-xs text-aviro-muted">Amount: ₹{amount} to {driverName}</p>
                </div>
              </div>

              {!upiOpened ? (
                <button onClick={handleUpiPay}
                  className="w-full bg-gradient-to-r from-aviro-green to-emerald-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 flex items-center justify-center gap-2">
                  💳 Open UPI App & Pay ₹{amount}
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Enter Transaction ID (optional):</p>
                  <input value={txnRef} onChange={e => setTxnRef(e.target.value)}
                    placeholder="UPI Transaction ID"
                    className="input-field text-sm"/>
                  <button onClick={handleConfirm} disabled={confirming}
                    className="w-full bg-aviro-green text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
                    {confirming ? 'Confirming...' : '✅ Yes, Payment Done!'}
                  </button>
                  <button onClick={() => { setUpiOpened(false); window.location.href = upiLink; }}
                    className="w-full text-xs text-aviro-orange hover:underline py-1">
                    Open UPI app again
                  </button>
                </div>
              )}
              <button onClick={() => setMethod(null)} className="w-full text-xs text-aviro-muted py-1">← Change method</button>
            </div>
          )}

          {/* Cash Flow */}
          {method === 'CASH' && (
            <div className="space-y-3">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-3xl text-center mb-2">💵</p>
                <p className="font-bold text-white text-center">Pay ₹{amount} cash</p>
                <p className="text-xs text-aviro-muted text-center mt-1">Hand over cash to {driverName}</p>
                <div className="mt-3 bg-aviro-card2 rounded-lg p-3">
                  <p className="text-xs text-yellow-400 text-center">⚠️ Driver will confirm receipt</p>
                  <p className="text-xs text-aviro-muted text-center mt-1">Both will get notified once confirmed</p>
                </div>
              </div>
              <button onClick={handleConfirm} disabled={confirming}
                className="w-full bg-aviro-orange text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
                {confirming ? 'Submitting...' : '💵 I\'ve Paid Cash to Driver'}
              </button>
              <button onClick={() => setMethod(null)} className="w-full text-xs text-aviro-muted py-1">← Change method</button>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose}
            className="w-full text-xs text-aviro-muted hover:text-white py-2 border border-aviro-border rounded-xl">
            Pay Later
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Icon from './Icon';

const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function PaymentChoiceContent({ booking, isDriver = false, onClose, onPaid }) {
  const [method, setMethod]         = useState(null);
  const [txnRef, setTxnRef]         = useState('');
  const [confirming, setConfirming] = useState(false);
  const [upiOpened, setUpiOpened]   = useState(false);

  const amount     = booking?.totalAmount || 0;
  const driverName = booking?.driver?.fullName || 'Driver';
  const riderName  = booking?.rider?.fullName || 'Rider';
  const driverUpi  = booking?.driverUpiId;
  const note       = `AVIRO ride ${booking?.id}`;
  // Standard UPI link: GPay, PhonePe, Paytm and BHIM all read it, and the QR code holds the same link
  const upiLink    = driverUpi
    ? `upi://pay?pa=${encodeURIComponent(driverUpi)}&pn=${encodeURIComponent(driverName)}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`
    : null;

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
        <div className="bg-aviro-card border border-aviro-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-up max-h-[92vh] overflow-y-auto">
          <div className="p-5 border-b border-aviro-border">
            <h2 className="font-display font-bold text-xl">Cash Payment</h2>
            <p className="text-aviro-muted text-sm mt-1">
              {riderName} claims to have paid <span className="text-aviro-green font-bold">₹{amount}</span> in cash
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl mb-2"><Icon e="💵" /></p>
              <p className="font-bold text-aviro-fg">Did you receive ₹{amount} cash?</p>
              <p className="text-xs text-aviro-muted mt-1">from {riderName}</p>
            </div>
            <button onClick={handleDriverConfirmCash} disabled={confirming}
              className="w-full bg-aviro-green text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
              {confirming ? 'Confirming...' : '✅ Yes, I received the cash!'}
            </button>
            <button onClick={onClose}
              className="w-full text-xs text-aviro-muted hover:text-aviro-fg py-2 border border-aviro-border rounded-xl">
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
    setTimeout(() => setUpiOpened(true), 1500);
  };

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(driverUpi);
      toast.success('UPI ID copied');
    } catch {
      toast.error('Could not copy. Select the UPI ID and copy it.');
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const ref = method === 'CASH'
        ? `CASH-${Date.now()}`
        : `UPI-${txnRef.trim() || Date.now()}`;

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
      <div className="bg-aviro-card border border-aviro-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-up max-h-[92vh] overflow-y-auto">

        <div className="p-5 border-b border-aviro-border">
          <h2 className="font-display font-bold text-xl">Payment</h2>
          <p className="text-aviro-muted text-sm mt-1">
            Pay <span className="text-aviro-green font-bold">₹{amount}</span> to {driverName}
          </p>
        </div>

        <div className="p-5 space-y-4">

          {/* Method Selection */}
          {!method && (
            <>
              <p className="text-sm font-medium text-aviro-fg">Choose payment method:</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setMethod('UPI')} disabled={!driverUpi}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-aviro-border hover:border-aviro-green hover:bg-aviro-green/5 transition-all
                    disabled:opacity-50 disabled:hover:border-aviro-border disabled:hover:bg-transparent">
                  <span className="text-4xl"><Icon e="📱" /></span>
                  <div className="text-center">
                    <p className="font-bold text-sm">UPI</p>
                    <p className="text-xs text-aviro-muted">GPay / PhonePe / Paytm</p>
                    {driverUpi
                      ? <p className="text-xs text-aviro-green mt-1">Pay to driver's UPI ✅</p>
                      : <p className="text-xs text-yellow-600 mt-1">Driver hasn't added UPI</p>}
                  </div>
                </button>
                <button onClick={() => setMethod('CASH')}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-aviro-border hover:border-aviro-orange hover:bg-aviro-orange/5 transition-all">
                  <span className="text-4xl"><Icon e="💵" /></span>
                  <div className="text-center">
                    <p className="font-bold text-sm">Cash</p>
                    <p className="text-xs text-aviro-muted">Pay directly to driver</p>
                    <p className="text-xs text-yellow-600 mt-1">Driver confirms ⏳</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* UPI Flow */}
          {method === 'UPI' && driverUpi && (
            <div className="space-y-3">
              {/* Where the money goes */}
              <div className="bg-aviro-card2 border border-aviro-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-aviro-muted">Paying {driverName}</p>
                    <p className="font-mono text-sm font-semibold break-all" data-testid="driver-upi">{driverUpi}</p>
                  </div>
                  <button onClick={copyUpi} className="text-xs text-aviro-orange border border-aviro-orange/40 px-3 py-1.5 rounded-lg flex-shrink-0">
                    Copy
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-aviro-border pt-3">
                  <span className="text-xs text-aviro-muted">Amount</span>
                  <span className="text-xl font-bold text-aviro-green">₹{amount}</span>
                </div>
              </div>

              {isPhone() ? (
                <button onClick={handleUpiPay}
                  className="w-full bg-gradient-to-r from-aviro-green to-emerald-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90">
                  <Icon e="📱" /> Open UPI app & pay ₹{amount}
                </button>
              ) : null}

              {/* Scan from another phone, or when the app doesn't open */}
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="bg-white p-3 rounded-xl" data-testid="upi-qr">
                  <QRCodeSVG value={upiLink} size={isPhone() ? 132 : 176} level="M" />
                </div>
                <p className="text-xs text-aviro-muted text-center">
                  {isPhone() ? "App didn't open? Copy the UPI ID or scan this QR from any UPI app." : 'Scan with GPay, PhonePe, Paytm or any UPI app'}
                </p>
              </div>

              {/* Confirm after paying */}
              <div className="space-y-2 border-t border-aviro-border pt-3">
                <input value={txnRef} onChange={e => setTxnRef(e.target.value.replace(/\s/g, ''))}
                  placeholder="UPI transaction ID / UTR (optional)" className="input-field text-sm" />
                <button onClick={handleConfirm} disabled={confirming}
                  className={`w-full font-bold py-3 rounded-xl text-sm disabled:opacity-50 ${upiOpened || !isPhone()
                    ? 'bg-aviro-green text-white' : 'bg-aviro-card2 border border-aviro-green/40 text-aviro-green'}`}>
                  {confirming ? 'Confirming…' : `✅ I've paid ₹${amount}`}
                </button>
              </div>
              <button onClick={() => { setMethod(null); setUpiOpened(false); }} className="w-full text-xs text-aviro-muted py-1">← Change method</button>
            </div>
          )}

          {/* Cash Flow */}
          {method === 'CASH' && (
            <div className="space-y-3">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-3xl text-center mb-2"><Icon e="💵" /></p>
                <p className="font-bold text-aviro-fg text-center">Pay ₹{amount} cash</p>
                <p className="text-xs text-aviro-muted text-center mt-1">Hand over cash to {driverName}</p>
                <div className="mt-3 bg-aviro-card2 rounded-lg p-3">
                  <p className="text-xs text-yellow-600 text-center"><Icon e="⚠️" /> Driver will confirm receipt</p>
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
            className="w-full text-xs text-aviro-muted hover:text-aviro-fg py-2 border border-aviro-border rounded-xl">
            Pay Later
          </button>
        </div>
      </div>
    </div>
  );
}
// Rendered on <body>: the pages animate with transforms, which would trap a fixed overlay inside them
export default function PaymentChoiceModal(props) {
  return createPortal(<PaymentChoiceContent {...props} />, document.body);
}

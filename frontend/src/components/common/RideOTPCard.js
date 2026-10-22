import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ══════════════════════════════════════════════════
// RIDER SIDE — OTP Display Card
// BookingsPage.js mein CONFIRMED booking mein add karo
// ══════════════════════════════════════════════════
export function RiderOTPCard({ bookingId }) {
  const [otp, setOtp]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  // The OTP does not change, so load it once (polling every 5s only added server load)
  useEffect(() => {
    fetchOtp();
  }, [bookingId]);

  const fetchOtp = async () => {
    try {
      const res = await api.get(`/bookings/${bookingId}/ride-otp`);
      setOtp(res.data.data?.otp);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="bg-aviro-card2 rounded-2xl p-4 animate-pulse">
      <div className="h-16 bg-aviro-border rounded-xl"/>
    </div>
  );

  if (verified) return (
    <div className="bg-aviro-green/10 border border-aviro-green/30 rounded-2xl p-4 text-center">
      <p className="text-2xl mb-1">🚗</p>
      <p className="font-bold text-aviro-green">Ride Started!</p>
      <p className="text-xs text-aviro-muted">Driver verified your OTP. Have a safe journey!</p>
    </div>
  );

  return (
    <div className="bg-aviro-orange/10 border-2 border-aviro-orange/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🔐</span>
        <p className="font-bold text-sm text-white">Your Ride OTP</p>
        <span className="ml-auto text-xs text-aviro-muted">Show to driver</span>
      </div>

      {/* Big OTP Display */}
      <div className="flex justify-center gap-3 my-4">
        {otp?.split('').map((digit, i) => (
          <div key={i}
            className="w-14 h-16 bg-aviro-orange rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg">
            {digit}
          </div>
        ))}
      </div>

      <div className="bg-aviro-card2 rounded-xl p-3 text-center">
        <p className="text-xs text-aviro-muted">
          🔒 Share this OTP with your driver to start the ride
        </p>
        <p className="text-xs text-yellow-400 mt-1 font-semibold">
          ⚠️ Do not share with anyone else!
        </p>
      </div>

      {/* Copy OTP */}
      <button
        onClick={() => {
          navigator.clipboard.writeText(otp);
          toast.success('OTP copied!');
        }}
        className="w-full mt-3 bg-aviro-card2 border border-aviro-border text-aviro-muted text-sm py-2 rounded-xl hover:text-white transition-colors">
        📋 Copy OTP
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════
// DRIVER SIDE — OTP Verify Card
// BookingsPage.js mein driver confirmed bookings mein add karo
// ══════════════════════════════════════════════════
export function DriverOTPVerifyCard({ bookingId, onVerified }) {
  const [otp, setOtp]           = useState(['', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError]       = useState('');
  const inputRefs               = [React.useRef(), React.useRef(), React.useRef(), React.useRef()];

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');
    // Auto-focus next
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 4) {
      setError('Please enter complete 4-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`/bookings/${bookingId}/verify-ride-otp`, { otp: otpString });
      setVerified(true);
      toast.success('✅ OTP Verified! Ride started!');
      onVerified && onVerified();
    } catch (err) {
      const msg = err.response?.data?.message || 'Wrong OTP! Try again.';
      setError(msg);
      toast.error(msg);
      // Clear OTP on wrong
      setOtp(['', '', '', '']);
      inputRefs[0].current?.focus();
    }
    setLoading(false);
  };

  if (verified) return (
    <div className="bg-aviro-green/10 border border-aviro-green/30 rounded-2xl p-4 text-center">
      <p className="text-3xl mb-2">✅</p>
      <p className="font-bold text-aviro-green text-lg">Ride Started!</p>
      <p className="text-xs text-aviro-muted mt-1">OTP verified. Have a safe journey!</p>
    </div>
  );

  return (
    <div className="bg-aviro-card2 border border-aviro-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔐</span>
        <p className="font-bold text-sm text-white">Verify Rider OTP</p>
      </div>

      <p className="text-xs text-aviro-muted mb-4 text-center">
        Ask rider for their 4-digit OTP to start the ride
      </p>

      {/* OTP Input Boxes */}
      <div className="flex justify-center gap-3 mb-4">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={inputRefs[i]}
            type="number"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className={`w-14 h-16 text-center text-2xl font-bold rounded-2xl border-2 bg-aviro-card
              focus:outline-none transition-all
              ${error
                ? 'border-red-500 text-red-400'
                : digit
                  ? 'border-aviro-orange text-aviro-orange'
                  : 'border-aviro-border text-white'}`}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-3 text-center">
          <p className="text-xs text-red-400 font-semibold">{error}</p>
        </div>
      )}

      {/* Verify Button */}
      <button
        onClick={handleVerify}
        disabled={loading || otp.join('').length !== 4}
        className="w-full bg-aviro-green text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
        {loading
          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Verifying...</>
          : '✅ Verify OTP & Start Ride'}
      </button>

      <p className="text-xs text-aviro-muted text-center mt-2">
        ⚠️ Ride will only start after OTP verification
      </p>
    </div>
  );
}
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp } from '../store/authSlice';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function VerifyOtpPage() {
  const [otp, setOtp]   = useState(['','','','','','']);
  const inputs          = useRef([]);
  const dispatch        = useDispatch();
  const navigate        = useNavigate();
  const { loading, pendingEmail, user } = useSelector(s => s.auth);
  const email           = pendingEmail || user?.email || '';
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error('Email not found. Please register again.');
      return;
    }
    setResending(true);
    try {
      const res = await api.post('/auth/resend-otp', { email });
      toast.success(res.data?.message || 'OTP sent! 📧');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const handleChange = (val, i) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return;
    const res = await dispatch(verifyOtp({ email, otp: code }));
    if (!res.error) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-aviro-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4 animate-float">📧</div>
        <h1 className="font-display font-bold text-2xl mb-2">Check your email</h1>
        <p className="text-aviro-muted text-sm mb-8">We sent a 6-digit OTP to<br/><span className="text-white font-medium">{email}</span></p>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 justify-center mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(e.target.value, i)}
                onKeyDown={e => handleKeyDown(e, i)}
                className="w-12 h-14 text-center text-xl font-bold bg-aviro-card2 border-2 border-aviro-border rounded-xl focus:outline-none focus:border-aviro-orange text-white transition-colors"
              />
            ))}
          </div>
          <button type="submit" disabled={loading || otp.join('').length < 6} className="btn-primary w-full">
            {loading ? 'Verifying...' : 'Verify OTP ✓'}
          </button>
        </form>

        <p className="text-aviro-muted text-xs mt-4">Didn't get it? Check spam or <button type="button" onClick={handleResend} disabled={resending} className="text-aviro-orange hover:underline disabled:opacity-50">{resending ? 'sending...' : 'resend OTP'}</button></p>
      </div>
    </div>
  );
}

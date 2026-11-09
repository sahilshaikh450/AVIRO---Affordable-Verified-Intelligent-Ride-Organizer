import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp } from '../store/authSlice';
import api from '../services/api';
import toast from 'react-hot-toast';
import Icon from '../components/common/Icon';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, pendingEmail } = useSelector((s) => s.auth);
  const email = pendingEmail || '';
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('New code sent. Check your inbox and spam folder.');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Couldn't send a new code. Try again in a few minutes."
      );
    } finally {
      setResending(false);
    }
  };

  const handleChange = (val, i) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''].map((_, i) => digits[i] || '');
    setOtp(next);
    inputs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return;
    const res = await dispatch(verifyOtp({ email, otp: code }));
    if (!res.error) navigate('/welcome', { replace: true });
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-aviro-dark flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">
            <Icon e="📧" />
          </div>
          <h1 className="font-display font-bold text-2xl mb-2">Verify your email</h1>
          <p className="text-aviro-muted text-sm mb-6">
            Log in with your email and password and we'll send you a new code.
          </p>
          <Link to="/login" className="btn-primary w-full inline-block">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aviro-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">
          <Icon e="📧" />
        </div>
        <h1 className="font-display font-bold text-2xl mb-2">Check your email</h1>
        <p className="text-aviro-muted text-sm mb-8">
          We sent a 6-digit code to
          <br />
          <span className="text-aviro-fg font-medium break-all">{email}</span>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${i + 1}`}
                maxLength={1}
                value={digit}
                autoFocus={i === 0}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className="w-11 h-14 text-center text-xl font-bold bg-aviro-card2 border-2 border-aviro-border rounded-xl focus:outline-none focus:border-aviro-orange text-aviro-fg transition-colors"
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={loading || otp.join('').length < 6}
            className="btn-primary w-full"
          >
            {loading ? 'Verifying...' : 'Verify and continue'}
          </button>
        </form>

        <p className="text-aviro-muted text-xs mt-5">
          Didn't get it? Check spam, or{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-semibold text-aviro-fg underline disabled:opacity-50"
          >
            {resending ? 'sending...' : 'send a new code'}
          </button>
        </p>
        <p className="text-aviro-muted text-xs mt-2">
          Wrong email?{' '}
          <Link to="/register" className="font-semibold text-aviro-fg underline">
            Sign up again
          </Link>
        </p>
      </div>
    </div>
  );
}

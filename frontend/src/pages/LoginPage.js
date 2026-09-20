import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();

  const [step, setStep]         = useState(1); // 1=login, 2=otp, 3=forgot, 4=forgot-otp, 5=reset
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // ── STEP 1: verify password → OTP sent ──
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Fill in all fields'); return; }
    setLoading(true);
    try {
      await api.post('/auth/login', { email, password });
      toast.success('OTP sent to your email! 📧');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  // ── STEP 2: verify OTP ──
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) { toast.error('Enter the OTP'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login-verify-otp', { email, otp });
      const { accessToken, refreshToken, user } = res.data.data;
      localStorage.setItem('aviro_token', accessToken);
      localStorage.setItem('aviro_refresh_token', refreshToken);
      localStorage.setItem('aviro_user', JSON.stringify(user));
      toast.success(`Welcome back, ${user.fullName}! 🎉`);
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    try {
      await api.post('/auth/login', { email, password });
      toast.success('OTP resent! Check your email 📧');
    } catch { toast.error('Failed to resend OTP'); }
  };

  // ── STEP 3: Forgot Password — send OTP ──
  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Enter your email'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Password reset OTP sent! 📧');
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Email not found');
    } finally { setLoading(false); }
  };

  // ── STEP 5: Reset Password ──
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) { toast.error('Fill all fields'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      toast.success('Password reset successfully! Please login. 🎉');
      setStep(1);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Check OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-aviro-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-aviro-orange rounded-2xl flex items-center justify-center text-white font-display font-bold text-3xl mx-auto mb-4 shadow-lg shadow-aviro-orange/30">
            A
          </div>
          <h1 className="font-display font-bold text-3xl text-white">AVIRO</h1>
          <p className="text-aviro-muted text-sm mt-1">Pune's College Ride Network</p>
        </div>

        <div className="card p-6">

          {/* ── STEP 1: Email + Password ── */}
          {step === 1 && (
            <>
              <div className="mb-6">
                <h2 className="font-bold text-xl text-white">Welcome back 👋</h2>
                <p className="text-aviro-muted text-sm mt-1">Sign in to your AVIRO account</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@college.edu.in" className="input-field" autoFocus />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-aviro-muted font-medium">Password</label>
                    <button type="button" onClick={() => { setStep(3); setOtp(''); }}
                      className="text-xs text-aviro-orange hover:underline font-medium">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 characters" className="input-field pr-10" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-aviro-muted hover:text-white text-sm">
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 text-base disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending OTP...</>
                  ) : 'Continue →'}
                </button>
              </form>

              <p className="text-center text-aviro-muted text-sm mt-6">
                New to AVIRO?{' '}
                <Link to="/register" className="text-aviro-orange font-semibold hover:underline">Create account</Link>
              </p>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <>
              <div className="mb-6">
                <button onClick={() => { setStep(1); setOtp(''); }}
                  className="text-aviro-muted text-sm hover:text-white flex items-center gap-1 mb-4">
                  ← Back
                </button>
                <div className="text-center">
                  <div className="text-4xl mb-3">📧</div>
                  <h2 className="font-bold text-xl text-white">Check your email</h2>
                  <p className="text-aviro-muted text-sm mt-2">We sent a 6-digit OTP to</p>
                  <p className="text-aviro-orange font-semibold text-sm mt-0.5">{email}</p>
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Enter OTP</label>
                  <input type="text" value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit OTP"
                    className="input-field text-center text-2xl tracking-[0.5em] font-bold"
                    maxLength={6} autoFocus />
                  <p className="text-xs text-aviro-muted mt-1.5 text-center">OTP expires in 10 minutes</p>
                </div>

                <button type="submit" disabled={loading || otp.length < 6}
                  className="btn-primary w-full py-3 text-base disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</>
                  ) : '🔓 Verify & Login'}
                </button>
              </form>

              <div className="text-center mt-4">
                <p className="text-aviro-muted text-xs">Didn't receive the OTP?</p>
                <button onClick={handleResendOtp}
                  className="text-aviro-orange text-sm font-semibold hover:underline mt-1">
                  Resend OTP
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Forgot Password — Enter Email ── */}
          {step === 3 && (
            <>
              <div className="mb-6">
                <button onClick={() => setStep(1)}
                  className="text-aviro-muted text-sm hover:text-white flex items-center gap-1 mb-4">
                  ← Back to Login
                </button>
                <div className="text-center">
                  <div className="text-4xl mb-3">🔐</div>
                  <h2 className="font-bold text-xl text-white">Forgot Password?</h2>
                  <p className="text-aviro-muted text-sm mt-2">Enter your email and we'll send you a reset OTP</p>
                </div>
              </div>

              <form onSubmit={handleForgotSendOtp} className="space-y-4">
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@college.edu.in" className="input-field" autoFocus />
                </div>

                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 text-base disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending OTP...</>
                  ) : '📧 Send Reset OTP'}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 4: Forgot OTP + New Password ── */}
          {step === 4 && (
            <>
              <div className="mb-6">
                <button onClick={() => setStep(3)}
                  className="text-aviro-muted text-sm hover:text-white flex items-center gap-1 mb-4">
                  ← Back
                </button>
                <div className="text-center">
                  <div className="text-4xl mb-3">🔑</div>
                  <h2 className="font-bold text-xl text-white">Reset Password</h2>
                  <p className="text-aviro-muted text-sm mt-2">OTP sent to <span className="text-aviro-orange font-semibold">{email}</span></p>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Enter OTP</label>
                  <input type="text" value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit OTP"
                    className="input-field text-center text-xl tracking-[0.4em] font-bold"
                    maxLength={6} autoFocus />
                </div>

                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={showNewPass ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters" className="input-field pr-10" />
                    <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-aviro-muted hover:text-white text-sm">
                      {showNewPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Confirm New Password</label>
                  <input type="password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password" className="input-field" />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>

                <button type="submit"
                  disabled={loading || otp.length < 6 || !newPassword || newPassword !== confirmPassword}
                  className="btn-primary w-full py-3 text-base disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Resetting...</>
                  ) : '🔐 Reset Password'}
                </button>
              </form>

              <div className="text-center mt-4">
                <p className="text-aviro-muted text-xs">Didn't receive the OTP?</p>
                <button onClick={handleForgotSendOtp}
                  className="text-aviro-orange text-sm font-semibold hover:underline mt-1">
                  Resend OTP
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-aviro-muted text-xs mt-6">
          By signing in, you agree to AVIRO's Terms of Service
        </p>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function CollegeEmailVerify({ user, onVerified }) {
  const [step, setStep]             = useState(1);
  const [collegeEmail, setCollegeEmail] = useState('');
  const [otp, setOtp]               = useState('');
  const [loading, setLoading]       = useState(false);

  const isEduIn = (email) => email.toLowerCase().trim().endsWith('.edu.in');

  const handleSendOtp = async () => {
    if (!collegeEmail) { toast.error('Enter your college email'); return; }
    if (!isEduIn(collegeEmail)) {
      toast.error('Only .edu.in emails allowed (e.g. name@college.edu.in)');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/send-college-email-otp', { collegeEmail });
      toast.success(`OTP sent to ${collegeEmail} 📧`);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) { toast.error('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      await api.post('/auth/verify-college-email-otp', { collegeEmail, otp });
      toast.success('College email verified! 🎓');
      onVerified && onVerified();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Already verified
  if (user?.isCollegeVerified) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold mb-3">🎓 College Verification</h3>
        <div className="flex items-center gap-3 bg-aviro-green/10 border border-aviro-green/20 rounded-xl p-4">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-aviro-green">College Verified!</p>
            <p className="text-xs text-aviro-muted">Your college identity has been confirmed</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-1">🎓 College Email Verification</h3>
      <p className="text-aviro-muted text-sm mb-4">
        Verify using your <span className="text-aviro-orange font-medium">.edu.in</span> college email
      </p>

      {step === 1 && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-aviro-muted font-medium block mb-1.5">
              College Email Address
            </label>
            <input
              type="email"
              value={collegeEmail}
              onChange={e => setCollegeEmail(e.target.value)}
              placeholder="yourname@college.edu.in"
              className="input-field"
            />
            <p className="text-xs text-aviro-muted mt-1">
              Only <span className="text-aviro-orange">.edu.in</span> emails accepted
            </p>
          </div>
          <button
            onClick={handleSendOtp}
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Sending OTP...' : 'Send OTP →'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="bg-aviro-card2 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-aviro-muted">OTP sent to</p>
              <p className="text-sm font-semibold text-aviro-orange">{collegeEmail}</p>
            </div>
            <button
              onClick={() => { setStep(1); setOtp(''); }}
              className="text-xs text-aviro-muted hover:text-white"
            >
              Change
            </button>
          </div>

          <div>
            <label className="text-xs text-aviro-muted font-medium block mb-1.5">
              Enter 6-digit OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="input-field text-center text-xl tracking-[0.4em] font-bold"
              maxLength={6}
              autoFocus
            />
            <p className="text-xs text-aviro-muted mt-1 text-center">Expires in 10 minutes</p>
          </div>

          <button
            onClick={handleVerifyOtp}
            disabled={loading || otp.length < 6}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Verifying...' : '🎓 Verify College Email'}
          </button>

          <button
            onClick={handleSendOtp}
            className="w-full text-xs text-aviro-orange hover:underline text-center"
          >
            Resend OTP
          </button>
        </div>
      )}
    </div>
  );
}
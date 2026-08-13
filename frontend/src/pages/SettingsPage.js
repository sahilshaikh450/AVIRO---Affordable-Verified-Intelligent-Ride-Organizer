import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import api from '../services/api';
import toast from 'react-hot-toast';

// ── Help chatbot responses ──
const HELP_RESPONSES = {
  'login': 'Having trouble logging in? Make sure you enter the correct email and OTP. OTP expires in 10 minutes. Try clicking "Resend OTP" if not received. Check your spam folder too!',
  'otp': 'OTP not received? Check your spam/junk folder. Make sure your email is correct. OTP is valid for 10 minutes only. Click "Resend OTP" on the login page.',
  'booking': 'To book a ride: Go to "Find a Ride" → Search your route → Click on a ride → Click "Book". Your college ID must be verified to book rides.',
  'payment': 'AVIRO supports UPI (GPay, PhonePe, Paytm) and Cash payments. After ride completion, select your payment method. For cash, driver will confirm receipt.',
  'verification': 'College ID not verified? Go to Profile → Upload your college ID card photo. Our AI verifies it instantly. Make sure the ID is clearly visible.',
  'ride': 'To offer a ride: Go to "Offer Ride" → Fill in your route, time, seats and price → Post it. Your college ID and vehicle must be verified first.',
  'cancel': 'To cancel a booking: Go to "My Bookings" → Find your booking → Click "Cancel Booking". Note: Frequent cancellations may affect your rating.',
  'vehicle': 'To add a vehicle: Go to Profile → Scroll to "My Vehicle" → Click "Add Vehicle" → Fill in details. Vehicle is auto-verified on AVIRO.',
  'sos': 'SOS feature: During a ride, go to Live Tracking page → Press the red "SOS Emergency Alert" button. It will notify your emergency contacts with your live location.',
  'refund': 'For refund issues, please contact us at aviro.support@gmail.com with your Booking ID. We process refunds within 3-5 business days.',
  'rating': 'Your rating is calculated based on reviews from riders and drivers. Complete more rides and provide good service to improve your rating.',
  'delete': 'To delete your account, please email us at aviro.support@gmail.com from your registered email. We will process it within 48 hours.',
  'default': 'I am not sure about that. Please contact our support team at aviro.support@gmail.com or try asking about: login, otp, booking, payment, verification, ride, cancel, vehicle, sos, refund, rating.',
};

function getHelpResponse(msg) {
  const lower = msg.toLowerCase();
  for (const key of Object.keys(HELP_RESPONSES)) {
    if (key !== 'default' && lower.includes(key)) return HELP_RESPONSES[key];
  }
  return HELP_RESPONSES.default;
}

// ── Help Chatbot ──
function HelpChatbot({ onClose }) {
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! 👋 I am AVIRO Support. How can I help you today?\n\nYou can ask about: Login issues, OTP problems, Booking, Payment, Verification, SOS, Refund, etc.' }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { from: 'user', text: userMsg }]);
    setTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'bot', text: getHelpResponse(userMsg) }]);
      setTyping(false);
    }, 800);
  };

  const quickQuestions = ['Login issue', 'OTP not received', 'Payment help', 'Verification', 'Cancel booking', 'SOS help'];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-aviro-card border border-aviro-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col" style={{ height: '520px' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-aviro-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-aviro-orange/20 flex items-center justify-center text-xl">🤖</div>
            <div>
              <p className="font-bold text-sm">AVIRO Support</p>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-aviro-green rounded-full animate-pulse"/>
                <p className="text-xs text-aviro-green">Online</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-aviro-muted hover:text-white text-xl">✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.from === 'bot' && (
                <div className="w-7 h-7 rounded-full bg-aviro-orange/20 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">🤖</div>
              )}
              <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap
                ${m.from === 'user'
                  ? 'bg-aviro-orange text-white rounded-br-sm'
                  : 'bg-aviro-card2 text-white rounded-bl-sm border border-aviro-border'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-aviro-orange/20 flex items-center justify-center text-sm mr-2">🤖</div>
              <div className="bg-aviro-card2 border border-aviro-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                <div className="w-2 h-2 bg-aviro-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                <div className="w-2 h-2 bg-aviro-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                <div className="w-2 h-2 bg-aviro-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick questions */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {quickQuestions.map((q, i) => (
            <button key={i} onClick={() => { setInput(q); }}
              className="text-xs text-aviro-orange border border-aviro-orange/30 px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-aviro-orange/10 flex-shrink-0">
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-aviro-border flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type your question..."
            className="input-field flex-1 text-sm"/>
          <button onClick={sendMessage} disabled={!input.trim()}
            className="bg-aviro-orange text-white px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40 hover:opacity-90">
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reset Password Modal ──
function ResetPasswordModal({ onClose }) {
  const [step, setStep]           = useState(1);
  const { user }                  = useSelector(s => s.auth);
  const [otp, setOtp]             = useState('');
  const [newPass, setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading]     = useState(false);

  const sendOtp = async () => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: user?.email });
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch { toast.error('Failed to send OTP'); }
    setLoading(false);
  };

  const resetPassword = async () => {
    if (newPass !== confirmPass) { toast.error('Passwords do not match'); return; }
    if (newPass.length < 6) { toast.error('Min 6 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: user?.email, otp, newPassword: newPass });
      toast.success('Password reset successfully! ✅');
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-aviro-card border border-aviro-border rounded-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">🔐 Reset Password</h3>
          <button onClick={onClose} className="text-aviro-muted hover:text-white">✕</button>
        </div>

        {step === 1 && (
          <>
            <p className="text-sm text-aviro-muted">We'll send a reset OTP to <span className="text-white font-medium">{user?.email}</span></p>
            <button onClick={sendOtp} disabled={loading}
              className="w-full bg-aviro-orange text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : '📧 Send Reset OTP'}
            </button>
          </>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-aviro-muted block mb-1">Enter OTP</label>
              <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit OTP" maxLength={6}
                className="input-field text-center text-xl tracking-[0.4em] font-bold"/>
            </div>
            <div>
              <label className="text-xs text-aviro-muted block mb-1">New Password</label>
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                placeholder="Min 6 characters" className="input-field"/>
            </div>
            <div>
              <label className="text-xs text-aviro-muted block mb-1">Confirm Password</label>
              <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                placeholder="Re-enter password" className="input-field"/>
              {confirmPass && newPass !== confirmPass && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
            <button onClick={resetPassword}
              disabled={loading || otp.length < 6 || !newPass || newPass !== confirmPass}
              className="w-full bg-aviro-green text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : '✅ Reset Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Settings Page ──
export default function SettingsPage() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useSelector(s => s.auth);

  const [showChatbot, setShowChatbot]     = useState(false);
  const [showResetPass, setShowResetPass] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const settingSections = [
    {
      title: '👤 Account',
      items: [
        { icon: '✏️', label: 'Edit Profile',        sub: 'Update your personal information',  action: () => navigate('/profile') },
        { icon: '🔐', label: 'Reset Password',       sub: 'Change your account password',      action: () => setShowResetPass(true) },
        { icon: '🛡️', label: 'Safety Center',        sub: 'Emergency contacts & SOS settings', action: () => navigate('/safety') },
        { icon: '🎓', label: 'College ID Verification', sub: 'Upload or update your college ID', action: () => navigate('/profile') },
      ]
    },
    {
      title: '🏍️ Rides',
      items: [
        { icon: '📋', label: 'My Bookings',      sub: 'View all your ride bookings',        action: () => navigate('/bookings') },
        { icon: '🗺️', label: 'My Rides',         sub: 'Rides you have offered',             action: () => navigate('/my-rides') },
        { icon: '🚗', label: 'My Vehicle',        sub: 'Manage your registered vehicle',     action: () => navigate('/profile') },
      ]
    },
    {
      title: '💬 Support',
      items: [
        { icon: '🤖', label: 'Help Desk',         sub: 'Chat with AVIRO support bot',        action: () => setShowChatbot(true),  highlight: true },
        { icon: '📧', label: 'Email Support',      sub: 'aviro.support@gmail.com',            action: () => window.open('mailto:aviro.support@gmail.com') },
        { icon: '📞', label: 'Emergency Helpline', sub: '112 · Police: 100 · Women: 1091',   action: () => window.open('tel:112') },
      ]
    },
    {
      title: 'ℹ️ About',
      items: [
        { icon: '🚀', label: 'About AVIRO',       sub: 'Pune\'s #1 College Ride Platform',   action: () => {} },
        { icon: '📄', label: 'Terms of Service',  sub: 'Read our terms and conditions',      action: () => {} },
        { icon: '🔒', label: 'Privacy Policy',    sub: 'How we protect your data',           action: () => {} },
      ]
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up pb-10">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-aviro-card2 border border-aviro-border flex items-center justify-center text-aviro-muted hover:text-white hover:border-aviro-orange/50 transition-all">
          ←
        </button>
        <div>
          <h1 className="font-display font-bold text-2xl">Settings ⚙️</h1>
          <p className="text-aviro-muted text-sm">Manage your AVIRO account</p>
        </div>
      </div>

      {/* User card */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-aviro-orange/20 border-2 border-aviro-orange/30 flex items-center justify-center text-3xl">
          {user?.gender === 'FEMALE' ? '👩' : '👨'}
        </div>
        <div>
          <p className="font-bold text-lg">{user?.fullName}</p>
          <p className="text-aviro-muted text-sm">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {user?.isCollegeVerified && <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">✓ Verified</span>}
            <span className="text-xs text-aviro-orange">⭐ {user?.rating?.toFixed(1) || '5.0'}</span>
            <span className="text-xs text-aviro-muted">🪙 {user?.aviroCredits || 0} credits</span>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      {settingSections.map((section, si) => (
        <div key={si} className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-aviro-border">
            <p className="text-xs font-bold text-aviro-muted uppercase tracking-wider">{section.title}</p>
          </div>
          <div className="divide-y divide-aviro-border">
            {section.items.map((item, ii) => (
              <button key={ii} onClick={item.action}
                className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-aviro-card2 transition-colors text-left
                  ${item.highlight ? 'bg-aviro-orange/5' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0
                  ${item.highlight ? 'bg-aviro-orange/20' : 'bg-aviro-card2'}`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${item.highlight ? 'text-aviro-orange' : 'text-white'}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-aviro-muted truncate">{item.sub}</p>
                </div>
                <span className="text-aviro-muted text-sm">›</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full card p-4 flex items-center gap-4 hover:bg-red-500/5 hover:border-red-500/30 transition-all">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-xl">🚪</div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-sm text-red-400">Log Out</p>
          <p className="text-xs text-aviro-muted">Sign out from your account</p>
        </div>
        <span className="text-aviro-muted text-sm">›</span>
      </button>

      {/* Delete Account */}
      <button onClick={() => setShowDeleteConfirm(true)}
        className="w-full text-xs text-red-400/60 hover:text-red-400 text-center py-2 transition-colors">
        Delete Account
      </button>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-aviro-card border border-aviro-border rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <p className="text-4xl mb-3">⚠️</p>
              <h3 className="font-bold text-lg">Delete Account?</h3>
              <p className="text-aviro-muted text-sm mt-2">
                This action cannot be undone. Email us at <span className="text-aviro-orange">aviro.support@gmail.com</span> to request deletion.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-aviro-card2 border border-aviro-border text-aviro-muted py-2.5 rounded-xl text-sm">
                Cancel
              </button>
              <button onClick={() => { window.open('mailto:aviro.support@gmail.com?subject=Delete Account Request'); setShowDeleteConfirm(false); }}
                className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-sm">
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showChatbot    && <HelpChatbot onClose={() => setShowChatbot(false)} />}
      {showResetPass  && <ResetPasswordModal onClose={() => setShowResetPass(false)} />}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SafetyPage() {
  const { user } = useSelector(s => s.auth);
  const navigate = useNavigate();

  const [contacts, setContacts]           = useState(['', '', '']);
  const [saving, setSaving]               = useState(false);
  const [shareEmail, setShareEmail]       = useState('');
  const [bookingId, setBookingId]         = useState('');
  const [sharing, setSharing]             = useState(false);
  const [reportBookingId, setReportBookingId] = useState('');
  const [reportReason, setReportReason]   = useState('');
  const [reporting, setReporting]         = useState(false);
  const [showSavedContacts, setShowSavedContacts] = useState(false); // ← hide/show toggle
  const [editMode, setEditMode]           = useState(false);

  useEffect(() => {
    if (user?.emergencyContacts) {
      const saved = user.emergencyContacts.split(',').map(c => c.trim());
      setContacts([...saved, '', '', ''].slice(0, 3));
    }
  }, [user]);

  const handleSaveContacts = async () => {
    const valid = contacts.filter(c => c.trim() !== '');
    if (valid.length === 0) { toast.error('Add at least 1 emergency contact email'); return; }
    setSaving(true);
    try {
      await api.post('/safety/emergency-contacts', { contacts: valid.join(',') });
      toast.success('Emergency contacts saved! ✅');
      setEditMode(false);
      setShowSavedContacts(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleShareRide = async () => {
    if (!shareEmail || !bookingId) { toast.error('Enter booking ID and email'); return; }
    setSharing(true);
    try {
      await api.post(`/safety/share-ride/${bookingId}`, { email: shareEmail });
      toast.success(`Tracking link sent to ${shareEmail}! 📧`);
      setShareEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share');
    }
    setSharing(false);
  };

  const handleReport = async () => {
    if (!reportBookingId || !reportReason) { toast.error('Fill all fields'); return; }
    setReporting(true);
    try {
      await api.post(`/safety/report/${reportBookingId}`, { reason: reportReason });
      toast.success('Report submitted! Our team will review within 24 hours. 🛡️');
      setReportBookingId('');
      setReportReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report');
    }
    setReporting(false);
  };

  const hasSavedContacts = user?.emergencyContacts && user.emergencyContacts.trim() !== '';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up pb-10">

      {/* ── Header with back button ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-aviro-card2 border border-aviro-border flex items-center justify-center text-aviro-muted hover:text-white hover:border-aviro-orange/50 transition-all">
          ←
        </button>
        <div>
          <h1 className="font-display font-bold text-2xl">Safety Center 🛡️</h1>
          <p className="text-aviro-muted text-sm">Your safety is our top priority</p>
        </div>
      </div>

      {/* ── Emergency Contacts ── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👨‍👩‍👧</span>
            <div>
              <h2 className="font-bold text-base">Emergency Contacts</h2>
              <p className="text-xs text-aviro-muted">Notified when you press SOS</p>
            </div>
          </div>

          {/* ── Toggle saved info ── */}
          {hasSavedContacts && !editMode && (
            <button onClick={() => setShowSavedContacts(!showSavedContacts)}
              className="text-xs text-aviro-orange border border-aviro-orange/30 px-3 py-1.5 rounded-lg hover:bg-aviro-orange/10 transition-colors">
              {showSavedContacts ? '🙈 Hide' : '👁️ View saved'}
            </button>
          )}
        </div>

        {/* Saved contacts — hidden by default */}
        {hasSavedContacts && showSavedContacts && !editMode && (
          <div className="bg-aviro-green/10 border border-aviro-green/20 rounded-xl p-4 space-y-2">
            <p className="text-xs text-aviro-green font-semibold">✅ Saved Emergency Contacts:</p>
            {user.emergencyContacts.split(',').map((c, i) => (
              <p key={i} className="text-sm text-white">📧 {c.trim()}</p>
            ))}
            <button onClick={() => { setEditMode(true); setShowSavedContacts(false); }}
              className="text-xs text-aviro-orange hover:underline mt-1">
              ✏️ Change contacts
            </button>
          </div>
        )}

        {/* Add/Edit contacts form */}
        {(!hasSavedContacts || editMode) && (
          <div className="space-y-3">
            {contacts.map((c, i) => (
              <div key={i}>
                <label className="text-xs text-aviro-muted font-medium block mb-1">
                  Contact {i + 1} {i === 0 && <span className="text-red-400">*</span>}
                </label>
                <input type="email" value={c}
                  onChange={e => { const u = [...contacts]; u[i] = e.target.value; setContacts(u); }}
                  placeholder={`Emergency contact ${i + 1} email`}
                  className="input-field" />
              </div>
            ))}
            <div className="flex gap-2">
              {editMode && (
                <button onClick={() => { setEditMode(false); setShowSavedContacts(false); }}
                  className="flex-1 bg-aviro-card2 border border-aviro-border text-aviro-muted py-2.5 rounded-xl text-sm">
                  Cancel
                </button>
              )}
              <button onClick={handleSaveContacts} disabled={saving}
                className="flex-1 bg-aviro-green text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving...</> : '✅ Save Contacts'}
              </button>
            </div>
          </div>
        )}

        {/* Not yet saved */}
        {!hasSavedContacts && !editMode && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <p className="text-xs text-yellow-400">⚠️ No emergency contacts saved yet. Add them for SOS alerts.</p>
          </div>
        )}
      </div>

      {/* ── Share Live Ride ── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔗</span>
          <div>
            <h2 className="font-bold text-base">Share Live Ride Tracking</h2>
            <p className="text-xs text-aviro-muted">Send tracking link to family/friends</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-aviro-muted font-medium block mb-1">Booking ID</label>
            <input type="number" value={bookingId} onChange={e => setBookingId(e.target.value)}
              placeholder="Enter your booking ID" className="input-field"/>
            <p className="text-xs text-aviro-muted mt-1">Find it in My Bookings page</p>
          </div>
          <div>
            <label className="text-xs text-aviro-muted font-medium block mb-1">Send to Email</label>
            <input type="email" value={shareEmail} onChange={e => setShareEmail(e.target.value)}
              placeholder="family@email.com" className="input-field"/>
          </div>
        </div>
        <button onClick={handleShareRide} disabled={sharing}
          className="w-full bg-aviro-blue text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {sharing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sending...</> : '📧 Send Tracking Link'}
        </button>
      </div>

      {/* ── Safety Tips ── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💡</span>
          <h2 className="font-bold text-base">Safety Tips</h2>
        </div>
        <div className="space-y-3">
          {[
            { icon: '✅', tip: 'Only ride with college-verified drivers on AVIRO' },
            { icon: '📍', tip: 'Share your live tracking link with family before every ride' },
            { icon: '👨‍👩‍👧', tip: 'Always save emergency contacts before riding' },
            { icon: '🆘', tip: 'Press SOS in Live Tracking page if you feel unsafe' },
            { icon: '📱', tip: 'Keep your phone charged before a ride' },
            { icon: '🌙', tip: 'For late night rides, prefer women-only or known drivers' },
            { icon: '📞', tip: 'Emergency: Call 112 · Women helpline: 1091 · Police: 100' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-aviro-card2 rounded-xl p-3">
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <p className="text-sm text-aviro-muted">{item.tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Report Driver ── */}
      <div className="card p-5 space-y-4 border-red-500/20">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚨</span>
          <div>
            <h2 className="font-bold text-base">Report a Driver</h2>
            <p className="text-xs text-aviro-muted">Report unsafe or inappropriate behavior</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-aviro-muted font-medium block mb-1">Booking ID</label>
            <input type="number" value={reportBookingId} onChange={e => setReportBookingId(e.target.value)}
              placeholder="Enter booking ID" className="input-field"/>
          </div>
          <div>
            <label className="text-xs text-aviro-muted font-medium block mb-1">Reason</label>
            <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="input-field">
              <option value="">Select reason...</option>
              <option value="Rash driving / Over speeding">🚗 Rash driving / Over speeding</option>
              <option value="Inappropriate behavior">⚠️ Inappropriate behavior</option>
              <option value="Route deviation">📍 Route deviation</option>
              <option value="Demanded extra payment">💰 Demanded extra payment</option>
              <option value="Driver was not the same person">👤 Driver was not same person</option>
              <option value="Vehicle condition unsafe">🔧 Vehicle condition unsafe</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <button onClick={handleReport} disabled={reporting}
          className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold py-3 rounded-xl text-sm disabled:opacity-50 hover:bg-red-500/20 flex items-center justify-center gap-2">
          {reporting ? <><div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"/>Submitting...</> : '🚨 Submit Report'}
        </button>
        <p className="text-xs text-aviro-muted text-center">
          Reports reviewed within 24 hours. Emergency: <span className="text-red-400 font-bold">112</span>
        </p>
      </div>

      {/* Emergency Numbers */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
        <h3 className="font-bold text-sm text-red-400 mb-3">🆘 Emergency Numbers</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Emergency', number: '112' },
            { label: 'Police', number: '100' },
            { label: 'Women', number: '1091' },
          ].map(e => (
            <a key={e.label} href={`tel:${e.number}`}
              className="flex flex-col items-center bg-aviro-card2 rounded-xl p-3 hover:bg-red-500/20 transition-colors">
              <span className="text-red-400 font-bold text-xl">{e.number}</span>
              <span className="text-xs text-aviro-muted mt-1">{e.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
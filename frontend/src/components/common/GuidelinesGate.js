import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { fetchProfile, logout } from '../../store/authSlice';
import { GUIDELINES_VERSION } from '../../content/guidelines';
import GuidelinesChecklist, { allAccepted } from './GuidelinesChecklist';

const OPEN_PATHS = ['/', '/login', '/register', '/verify-otp', '/terms', '/privacy'];

export default function GuidelinesGate() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { token, user } = useSelector((s) => s.auth);
  const [checked, setChecked] = useState(false);
  const [agreed, setAgreed] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecked(false);
      return;
    }
    dispatch(fetchProfile()).finally(() => setChecked(true));
  }, [token, dispatch]);

  const needsAcceptance =
    token &&
    checked &&
    user &&
    user.guidelinesVersion !== GUIDELINES_VERSION &&
    !OPEN_PATHS.includes(pathname) &&
    !pathname.startsWith('/share/');

  useEffect(() => {
    if (!needsAcceptance) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [needsAcceptance]);

  if (!needsAcceptance) return null;

  const accept = async () => {
    if (!allAccepted(agreed) || saving) return;
    setSaving(true);
    try {
      await api.post('/users/guidelines', {
        acceptedGuidelines: true,
        guidelinesVersion: GUIDELINES_VERSION,
      });
      await dispatch(fetchProfile());
      toast.success('Thanks! You can keep using AVIRO.');
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/60 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guidelines-title"
    >
      <div className="bg-aviro-dark w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="px-5 pt-5 pb-3 border-b border-aviro-border">
          <h2 id="guidelines-title" className="font-bold text-lg">
            New: community guidelines
          </h2>
          <p className="text-aviro-muted text-sm mt-1">
            To keep every ride safe, all members now accept these. Tick each one to continue.
          </p>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          <GuidelinesChecklist agreed={agreed} onChange={setAgreed} />
        </div>
        <div
          className="px-5 pt-3 border-t border-aviro-border flex gap-2"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}
        >
          <button type="button" onClick={() => dispatch(logout())} className="btn-secondary flex-1">
            Log out
          </button>
          <button
            type="button"
            onClick={accept}
            disabled={!allAccepted(agreed) || saving}
            className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Agree & continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

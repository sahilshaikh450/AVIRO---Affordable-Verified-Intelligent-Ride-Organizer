import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { pushSupported, isIos, isInstalledApp, enablePush, syncPushSubscription } from '../../services/push';

const DISMISS_KEY = 'aviro_push_prompt_dismissed_at';
const ASK_AGAIN_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

const recentlyDismissed = () => {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < ASK_AGAIN_AFTER_MS;
  } catch {
    return false;
  }
};

// Asks once to turn on phone notifications, so ride alerts arrive like WhatsApp messages
// Full-screen pages where the banner would take space from the content
const HIDDEN_ON = ['/chat', '/tracking'];

export default function PushPrompt() {
  const { pathname } = useLocation();
  const [mode, setMode] = useState(null); // 'ask' | 'ios-install'
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Already allowed: make sure this device is linked to the logged-in account
        if (pushSupported() && Notification.permission === 'granted') {
          await syncPushSubscription();
          return;
        }
        if (recentlyDismissed()) return;
        const res = await api.get('/push/public-key');
        if (cancelled || !res.data.data?.enabled) return;
        if (isIos() && !isInstalledApp()) setMode('ios-install');
        else if (pushSupported() && Notification.permission === 'default') setMode('ask');
      } catch {
        // Notifications are optional; never block the app
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setMode(null);
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      if (await enablePush()) {
        toast.success('Notifications on 🔔 You\'ll get ride alerts on this device');
        setMode(null);
      } else {
        toast.error('Notifications are blocked. Allow them in your browser settings.');
        dismiss();
      }
    } catch {
      toast.error('Could not turn on notifications');
    }
    setBusy(false);
  };

  if (!mode || HIDDEN_ON.some(p => pathname.startsWith(p))) return null;

  return (
    <div className="card p-4 mb-4 flex items-start gap-3 border-aviro-orange/40 bg-aviro-orange/5" role="region" aria-label="Notifications">
      <span className="text-2xl">{mode === 'ask' ? '🔔' : '📲'}</span>
      <div className="flex-1 min-w-0">
        {mode === 'ask' ? (
          <>
            <p className="font-semibold text-sm">Get ride alerts on your phone</p>
            <p className="text-xs text-aviro-muted mt-0.5">Know instantly when a driver accepts, arrives or messages you, even when AVIRO is closed.</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-sm">Get ride alerts on your iPhone</p>
            <p className="text-xs text-aviro-muted mt-0.5">Tap <b>Share</b> → <b>Add to Home Screen</b>, then open AVIRO from your home screen and turn on notifications.</p>
          </>
        )}
        <div className="flex gap-2 mt-3">
          {mode === 'ask' && (
            <button onClick={turnOn} disabled={busy} className="bg-aviro-orange text-white font-semibold text-xs px-4 py-2 rounded-lg">
              Turn on
            </button>
          )}
          <button onClick={dismiss} className="text-xs text-aviro-muted hover:text-white px-2">
            {mode === 'ask' ? 'Not now' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatWhen } from '../components/common/RideAlerts';
import Icon from '../components/common/Icon';

const MAX_CONTACTS = 3;
const EMAIL = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/;

const EMERGENCY_NUMBERS = [
  { label: 'Emergency', number: '112' },
  { label: 'Police', number: '100' },
  { label: 'Women', number: '1091' },
  { label: 'Ambulance', number: '108' },
];

const TIPS = [
  'Check the driver’s name, photo and number plate before you get on.',
  'Share the trip with family from this page before every ride.',
  'Give the start OTP only when you are next to the vehicle.',
  'Late at night, women can choose women-only rides.',
  'Keep your phone charged and location on during the trip.',
];

const errorText = (err, fallback) => err.response?.data?.message || fallback;

const getLocation = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });

const isCurrent = (t) => {
  const diffH = (new Date(t.departureTime) - Date.now()) / 3600e3;
  return t.canShare && diffH > -6 && diffH < 2;
};

const tripLabel = (t) => `${t.fromLocation} → ${t.toLocation}`;
const withWhom = (t) => (t.role === 'DRIVER' ? `Rider: ${t.otherName}` : `Driver: ${t.otherName}`);

function Section({ icon, title, sub, children, className = '' }) {
  return (
    <section className={`card p-5 space-y-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5" aria-hidden="true">
          <Icon e={icon} />
        </span>
        <div>
          <h2 className="font-bold text-base">{title}</h2>
          {sub && <p className="text-xs text-aviro-muted mt-0.5">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function SosCard({ contacts, currentTrip }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const send = async () => {
    setSending(true);
    const loc = await getLocation();
    try {
      const res = await api.post('/safety/sos', {
        bookingId: currentTrip?.bookingId ?? null,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
      });
      setResult({
        ok: res.data.data?.contactsEmailed > 0 || res.data.data?.otherPersonNotified,
        text: res.data.message,
        noLocation: !loc,
      });
    } catch (err) {
      setResult({ ok: false, text: errorText(err, 'SOS could not be sent. Call 112 now.') });
    }
    setSending(false);
    setOpen(false);
  };

  return (
    <section
      className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 space-y-3"
      data-testid="sos-card"
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">
          🆘
        </span>
        <div className="flex-1">
          <h2 className="font-bold text-red-600">Feel unsafe?</h2>
          <p className="text-xs text-aviro-muted">
            Sends your location to{' '}
            {contacts.length
              ? `your ${contacts.length} emergency contact${contacts.length > 1 ? 's' : ''}`
              : 'your emergency contacts'}
            {currentTrip ? ` and your ${currentTrip.role === 'DRIVER' ? 'rider' : 'driver'}` : ''}.
          </p>
        </div>
      </div>
      {!contacts.length && !currentTrip && (
        <p className="text-xs text-yellow-600">
          <Icon e="⚠️" /> Add an emergency contact below, or SOS will have no one to alert.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            setResult(null);
            setOpen(true);
          }}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl"
        >
          Send SOS
        </button>
        <a
          href="tel:112"
          className="bg-aviro-card2 border border-red-500/40 text-red-600 font-bold py-3 rounded-xl text-center"
        >
          <Icon e="📞" /> Call 112
        </a>
      </div>
      {result && (
        <div
          className={`rounded-xl p-3 text-sm ${result.ok ? 'bg-green-500/10 text-green-700 border border-green-500/30' : 'bg-red-500/15 text-red-700 border border-red-500/40'}`}
          role="status"
        >
          {result.ok ? '✅ ' : '⚠️ '}
          {result.text}
          {result.noLocation && (
            <span className="block text-xs mt-1 opacity-80">
              Your location was not available, so it was sent without it.
            </span>
          )}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-aviro-card border border-red-500/50 rounded-2xl w-full max-w-sm p-6 space-y-3 text-center">
            <p className="text-4xl">🆘</p>
            <h3 className="font-bold text-xl text-red-600">Send SOS now?</h3>
            <p className="text-aviro-muted text-sm">
              We'll send your live location{contacts.length ? ` to ${contacts.join(', ')}` : ''}
              {currentTrip
                ? `${contacts.length ? ' and' : ''} to your ${currentTrip.role === 'DRIVER' ? 'rider' : 'driver'} ${currentTrip.otherName}`
                : ''}
              .
            </p>
            <button
              onClick={send}
              disabled={sending}
              className="w-full bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Yes, send SOS'}
            </button>
            <button
              onClick={() => setOpen(false)}
              disabled={sending}
              className="w-full bg-aviro-card2 text-aviro-muted font-semibold py-3 rounded-xl"
            >
              Cancel
            </button>
            <p className="text-xs text-aviro-muted">
              In danger right now?{' '}
              <a href="tel:112" className="text-red-600 font-bold">
                Call 112
              </a>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ContactsCard({ contacts, onSaved, loading }) {
  const { user } = useSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (next, okText) => {
    setBusy(true);
    try {
      const res = await api.post('/safety/emergency-contacts', { contacts: next });
      onSaved(res.data.data || next);
      toast.success(okText);
      return true;
    } catch (err) {
      toast.error(errorText(err, 'Could not save'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) {
      toast.error('Enter a valid email');
      return;
    }
    if (value === user?.email?.toLowerCase()) {
      toast.error("Add someone else's email, not your own");
      return;
    }
    if (contacts.includes(value)) {
      toast.error('Already added');
      return;
    }
    if (await save([...contacts, value], 'Contact added')) setEmail('');
  };

  return (
    <Section
      icon="👨‍👩‍👧"
      title="Emergency contacts"
      sub={`They get an email with your location when you press SOS. Up to ${MAX_CONTACTS}.`}
    >
      {loading ? (
        <div className="h-12 rounded-xl bg-aviro-card2 animate-pulse" />
      ) : contacts.length === 0 ? (
        <p className="text-xs text-yellow-600 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <Icon e="⚠️" /> No emergency contacts yet. Add a parent, sibling or friend.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="contact-list">
          {contacts.map((c) => (
            <li key={c} className="flex items-center gap-3 bg-aviro-card2 rounded-xl px-3 py-2.5">
              <span aria-hidden="true">
                <Icon e="📧" />
              </span>
              <span className="flex-1 text-sm truncate">{c}</span>
              <button
                onClick={() =>
                  save(
                    contacts.filter((x) => x !== c),
                    'Contact removed'
                  )
                }
                disabled={busy}
                aria-label={`Remove ${c}`}
                className="text-aviro-muted hover:text-red-600 w-8 h-8 rounded-lg flex items-center justify-center"
              >
                <Icon e="✕" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {contacts.length < MAX_CONTACTS && (
        <form onSubmit={add} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="family@email.com"
            className="input-field flex-1"
            aria-label="Emergency contact email"
          />
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="bg-aviro-green text-white font-bold px-4 rounded-xl text-sm disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}
    </Section>
  );
}

function ShareCard({ trips, loading }) {
  const [emailFor, setEmailFor] = useState(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(null);

  const getLink = async (bookingId, body = {}) => {
    const res = await api.post(`/safety/share-ride/${bookingId}`, body);
    return res.data;
  };

  const shareLink = async (t) => {
    setBusy(t.bookingId);
    try {
      const { data } = await getLink(t.bookingId);
      const text = `I'm on an AVIRO ride: ${tripLabel(t)}. Follow my trip live:`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'My AVIRO trip', text, url: data.link });
        } catch (e) {
          if (e.name !== 'AbortError') throw e;
        }
      } else {
        await navigator.clipboard.writeText(`${text} ${data.link}`);
        toast.success('Link copied. Paste it in WhatsApp or SMS.');
      }
    } catch (err) {
      toast.error(errorText(err, 'Could not create the link'));
    }
    setBusy(null);
  };

  const whatsapp = async (t) => {
    const win = window.open('', '_blank');
    setBusy(t.bookingId);
    try {
      const { data } = await getLink(t.bookingId);
      const url = `https://wa.me/?text=${encodeURIComponent(`I'm on an AVIRO ride: ${tripLabel(t)}. Follow my trip live: ${data.link}`)}`;
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch (err) {
      if (win) win.close();
      toast.error(errorText(err, 'Could not create the link'));
    }
    setBusy(null);
  };

  const sendEmail = async (e, t) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      toast.error('Enter a valid email');
      return;
    }
    setBusy(t.bookingId);
    try {
      const res = await getLink(t.bookingId, { email: email.trim() });
      toast.success(res.message);
      setEmail('');
      setEmailFor(null);
    } catch (err) {
      toast.error(errorText(err, 'Could not send'));
    }
    setBusy(null);
  };

  const shareable = trips.filter((t) => t.canShare);

  return (
    <Section
      icon="📍"
      title="Share your trip"
      sub="Family can follow the trip on a map until it ends. They don't need the app."
    >
      {loading ? (
        <div className="h-20 rounded-xl bg-aviro-card2 animate-pulse" />
      ) : shareable.length === 0 ? (
        <p className="text-sm text-aviro-muted bg-aviro-card2 rounded-xl p-4 text-center">
          No upcoming trips to share. Once a driver accepts your booking, it shows up here.
        </p>
      ) : (
        <div className="space-y-3" data-testid="share-trips">
          {shareable.map((t) => (
            <div
              key={t.bookingId}
              className="rounded-xl border border-aviro-border bg-aviro-card2 p-3 space-y-3"
            >
              <div>
                <p className="text-sm font-semibold">{tripLabel(t)}</p>
                <p className="text-xs text-aviro-muted mt-0.5">
                  <Icon e="🕘" /> {formatWhen(t.departureTime)} · {withWhom(t)}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => shareLink(t)}
                  disabled={busy === t.bookingId}
                  className="bg-aviro-orange text-white text-xs font-bold py-2.5 rounded-lg disabled:opacity-50"
                >
                  <Icon e="🔗" /> Share link
                </button>
                <button
                  onClick={() => whatsapp(t)}
                  disabled={busy === t.bookingId}
                  className="bg-[#25D366] text-white text-xs font-bold py-2.5 rounded-lg disabled:opacity-50"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => {
                    setEmailFor(emailFor === t.bookingId ? null : t.bookingId);
                    setEmail('');
                  }}
                  className="bg-aviro-card border border-aviro-border text-xs font-bold py-2.5 rounded-lg"
                >
                  <Icon e="📧" /> Email
                </button>
              </div>
              {emailFor === t.bookingId && (
                <form onSubmit={(e) => sendEmail(e, t)} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="family@email.com"
                    className="input-field flex-1"
                    autoFocus
                    aria-label="Email to send the trip link to"
                  />
                  <button
                    type="submit"
                    disabled={busy === t.bookingId}
                    className="bg-aviro-blue text-white font-bold px-4 rounded-xl text-sm disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function ReportCard({ trips, loading }) {
  const [reasons, setReasons] = useState([]);
  const [bookingId, setBookingId] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .get('/safety/report-reasons')
      .then((r) => setReasons(r.data.data || []))
      .catch(() => {});
  }, []);

  const reportable = trips.filter((t) =>
    ['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(t.status)
  );
  const chosen = reportable.find((t) => String(t.bookingId) === bookingId);
  const needsDetails = reason === 'Other';

  const submit = async (e) => {
    e.preventDefault();
    if (!bookingId) {
      toast.error('Choose the trip');
      return;
    }
    if (!reason) {
      toast.error('Choose what happened');
      return;
    }
    if (needsDetails && details.trim().length < 10) {
      toast.error('Tell us what happened (at least 10 characters)');
      return;
    }
    setSending(true);
    try {
      const res = await api.post(`/safety/report/${bookingId}`, {
        reason,
        details: details.trim(),
      });
      toast.success(res.data.message);
      setBookingId('');
      setReason('');
      setDetails('');
    } catch (err) {
      toast.error(errorText(err, 'Could not submit the report'));
    }
    setSending(false);
  };

  return (
    <Section
      icon="🚩"
      title="Report a problem"
      sub="Tell us about unsafe or wrong behaviour on a trip. Only our team sees it."
      className="border-red-500/20"
    >
      {loading ? (
        <div className="h-20 rounded-xl bg-aviro-card2 animate-pulse" />
      ) : reportable.length === 0 ? (
        <p className="text-sm text-aviro-muted bg-aviro-card2 rounded-xl p-4 text-center">
          No trips from the last 30 days to report.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label
              htmlFor="report-trip"
              className="text-xs text-aviro-muted font-medium block mb-1"
            >
              Trip
            </label>
            <select
              id="report-trip"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="input-field"
            >
              <option value="">Choose a trip…</option>
              {reportable.map((t) => (
                <option key={t.bookingId} value={t.bookingId}>
                  {formatWhen(t.departureTime)} · {t.fromLocation} → {t.toLocation} · {t.otherName}
                </option>
              ))}
            </select>
            {chosen && (
              <p className="text-xs text-aviro-muted mt-1">
                You're reporting the {chosen.role === 'DRIVER' ? 'rider' : 'driver'},{' '}
                {chosen.otherName}.
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-aviro-muted font-medium mb-1.5">What happened?</p>
            <div className="flex flex-wrap gap-2">
              {reasons.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setReason(r)}
                  aria-pressed={reason === r}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    reason === r
                      ? 'bg-red-500/20 border-red-500/60 text-red-700'
                      : 'border-aviro-border text-aviro-muted hover:text-aviro-fg'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              htmlFor="report-details"
              className="text-xs text-aviro-muted font-medium block mb-1"
            >
              Details{' '}
              {needsDetails ? <span className="text-red-600">*</span> : <span>(optional)</span>}
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder="What happened, and when?"
              className="input-field resize-none"
            />
            <p className="text-[11px] text-aviro-muted text-right">{details.length}/1000</p>
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full bg-red-500/10 border border-red-500/30 text-red-600 font-bold py-3 rounded-xl text-sm disabled:opacity-50 hover:bg-red-500/20"
          >
            {sending ? 'Submitting…' : 'Submit report'}
          </button>
        </form>
      )}
    </Section>
  );
}

export default function SafetyPage() {
  const [contacts, setContacts] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [c, t] = await Promise.allSettled([
      api.get('/safety/emergency-contacts'),
      api.get('/safety/trips'),
    ]);
    if (c.status === 'fulfilled') setContacts(c.value.data.data || []);
    if (t.status === 'fulfilled') setTrips(t.value.data.data || []);
    if (c.status === 'rejected' || t.status === 'rejected')
      toast.error('Some safety details could not load. Reload the page to try again.');
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const currentTrip = trips.find(isCurrent) || null;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-up pb-10">
      <div>
        <h1 className="font-display font-bold text-2xl">Safety Center</h1>
        <p className="text-aviro-muted text-sm">SOS, trusted contacts and trip sharing</p>
      </div>

      <SosCard contacts={contacts} currentTrip={currentTrip} />
      <ContactsCard contacts={contacts} onSaved={setContacts} loading={loading} />
      <ShareCard trips={trips} loading={loading} />
      <ReportCard trips={trips} loading={loading} />

      <section className="card p-5">
        <h2 className="font-bold text-base mb-3">Before every ride</h2>
        <ul className="space-y-2">
          {TIPS.map((tip) => (
            <li key={tip} className="flex gap-2 text-sm text-aviro-muted">
              <span className="text-aviro-green">
                <Icon e="✓" />
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
        <h2 className="font-bold text-sm text-red-600 mb-3">Emergency numbers</h2>
        <div className="grid grid-cols-4 gap-2">
          {EMERGENCY_NUMBERS.map((e) => (
            <a
              key={e.number}
              href={`tel:${e.number}`}
              className="flex flex-col items-center bg-aviro-card2 rounded-xl py-3 hover:bg-red-500/20 transition-colors"
            >
              <span className="text-red-600 font-bold text-lg">{e.number}</span>
              <span className="text-[11px] text-aviro-muted mt-0.5">{e.label}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

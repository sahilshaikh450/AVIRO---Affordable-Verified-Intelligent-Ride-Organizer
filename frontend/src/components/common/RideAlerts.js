import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { formatWhen } from '../../utils/when';
import Icon from './Icon';

export { formatWhen };

// Tomorrow 9:00 local time as "YYYY-MM-DDTHH:mm" for a datetime-local input
const tomorrowNine = () => {
  const d = new Date(Date.now() + 24 * 3600e3);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
};

const seatsText = (n) => `${n} seat${n > 1 ? 's' : ''}`;

// From / To stacked with the same dots as the rest of the app
// Start is a round dot, the end a square, as on cab apps; onDark for black cards
export function RouteLines({ from, to, size = 'sm', onDark = false }) {
  const text = size === 'lg' ? 'text-base font-semibold' : 'text-sm font-medium';
  const mark = onDark ? 'bg-white' : 'bg-black';
  return (
    <div className="flex gap-3 min-w-0">
      <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
        <span className={`w-2.5 h-2.5 rounded-full ${mark}`} />
        <span className={`w-px flex-1 my-1 min-h-[12px] ${onDark ? 'bg-white/30' : 'bg-neutral-300'}`} />
        <span className={`w-2.5 h-2.5 ${mark}`} />
      </div>
      <div className="min-w-0 space-y-2">
        <p className={`${text} truncate`}>{from}</p>
        <p className={`${text} truncate ${onDark ? 'text-white/75' : 'text-aviro-muted'}`}>{to}</p>
      </div>
    </div>
  );
}

const STEPS = [
  ['🕘', 'Pick when you want to leave'],
  ['👀', 'We watch every new ride on this route'],
  ['🔔', 'You get a notification the moment one is posted'],
];

// Shown when a search finds nothing: ask to be told when a matching ride is posted
export function RideAlertOffer({ fromLocation, toLocation, seatsNeeded, onCreated }) {
  const [time, setTime] = useState(tomorrowNine());
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const create = async () => {
    setSaving(true);
    try {
      await api.post('/ride-requests', { fromLocation, toLocation, departureTime: `${time}:00`, seatsNeeded });
      setDone(true);
      onCreated && onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not set the alert');
    }
    setSaving(false);
  };

  if (done) {
    return (
      <div className="card p-6 text-center space-y-2 border-aviro-green/30" data-testid="ride-alert-offer">
        <p className="text-4xl"><Icon e="✅" /></p>
        <p className="font-bold text-lg">Alert is on</p>
        <p className="text-sm text-aviro-muted">
          We'll notify you when someone offers this ride around {formatWhen(`${time}:00`)}.
          You can see it under <span className="text-aviro-fg">Your ride alerts</span> at the top.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden" data-testid="ride-alert-offer">
      <div className="p-5 text-center bg-aviro-orange/5 border-b border-aviro-border">
        <p className="text-3xl mb-1"><Icon e="🔍" /></p>
        <p className="font-bold text-lg">No rides on this route yet</p>
        <p className="text-sm text-aviro-muted mt-1">Don't keep checking. Turn on an alert and we'll tell you.</p>
      </div>

      <div className="p-5 space-y-4">
        <div className="bg-aviro-card2 rounded-xl p-3">
          <RouteLines from={fromLocation} to={toLocation} />
        </div>

        <ol className="space-y-2">
          {STEPS.map(([icon, text], i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className="w-7 h-7 rounded-full bg-aviro-card2 flex items-center justify-center flex-shrink-0"><Icon e={icon} /></span>
              <span className="text-aviro-muted">{text}</span>
            </li>
          ))}
        </ol>

        <div>
          <label className="text-xs font-semibold text-aviro-muted uppercase tracking-wider block mb-1.5">Leave around</label>
          <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} className="input-field" />
          <p className="text-[11px] text-aviro-muted mt-1.5">
            Rides up to 1 hour before or after match · {seatsText(seatsNeeded || 1)} · 6 AM – 8 PM
          </p>
        </div>

        <button onClick={create} disabled={saving || !time} className="w-full btn-primary py-3 disabled:opacity-50">
          {saving ? 'Turning on…' : '🔔 Notify me when a ride is posted'}
        </button>
        <Link to="/offer-ride" className="block text-center text-xs text-aviro-muted hover:text-aviro-fg">
          Going this way yourself? <span className="text-aviro-orange font-semibold">Offer this ride</span>
        </Link>
      </div>
    </div>
  );
}

// The rider's alerts: waiting, or matched with a link to the ride
export function MyRideAlerts({ refreshKey }) {
  const [alerts, setAlerts] = useState([]);
  const load = useCallback(() => {
    api.get('/ride-requests/my').then(res => setAlerts(res.data.data || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const remove = async (id) => {
    setAlerts(a => a.filter(x => x.id !== id));
    try {
      await api.delete(`/ride-requests/${id}`);
      toast.success('Alert removed');
    } catch { load(); }
  };

  if (alerts.length === 0) return null;
  return (
    <div className="card p-4" data-testid="my-ride-alerts">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold"><Icon e="🔔" /> Your ride alerts</p>
        <span className="text-xs text-aviro-muted">{alerts.length} active</span>
      </div>
      <div className="space-y-2">
        {alerts.map(a => {
          const found = a.status === 'MATCHED' && a.matchedRideId;
          return (
            <div key={a.id} className={`rounded-xl border p-3 ${found ? 'border-aviro-green/40 bg-aviro-green/5' : 'border-aviro-border bg-aviro-card2'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <RouteLines from={a.fromLocation} to={a.toLocation} />
                </div>
                <button onClick={() => remove(a.id)} aria-label="Remove alert"
                  className="text-aviro-muted hover:text-red-600 w-8 h-8 -mr-1 -mt-1 rounded-lg flex items-center justify-center flex-shrink-0"><Icon e="✕" /></button>
              </div>
              <div className="flex items-center justify-between gap-2 mt-3">
                <span className="text-xs text-aviro-muted"><Icon e="🕘" /> {formatWhen(a.desiredTime)} · {seatsText(a.seatsNeeded)}</span>
                {found ? (
                  <Link to={`/rides/${a.matchedRideId}`}
                    className="text-xs font-bold bg-aviro-green text-white px-3 py-1.5 rounded-lg flex-shrink-0">Ride found · View →</Link>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-yellow-600 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />Waiting for a ride
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Offer Ride: what students are asking for; "Offer" fills in the form
export function StudentsNeedRides({ requests, onOffer }) {
  // A few at first, so the ride form stays near the top
  const [showAll, setShowAll] = useState(false);
  if (!requests?.length) return null;
  const shown = showAll ? requests : requests.slice(0, 3);
  return (
    <div className="card p-4" data-testid="students-need-rides">
      <div className="flex items-center justify-between">
        <p className="font-semibold"><Icon e="🙋" /> Students need rides</p>
        <span className="text-xs bg-aviro-orange/15 text-aviro-orange font-semibold px-2 py-0.5 rounded-full">{requests.length}</span>
      </div>
      <p className="text-xs text-aviro-muted mt-1 mb-3">Tap Offer to fill in the route and time. They're notified as soon as you post.</p>
      <div className="space-y-2">
        {shown.map(r => (
          <div key={r.id} className="rounded-xl border border-aviro-border bg-aviro-card2 p-3">
            <RouteLines from={r.fromLocation} to={r.toLocation} />
            <div className="flex items-center justify-between gap-2 mt-3">
              <div className="text-xs text-aviro-muted min-w-0">
                <p><Icon e="🕘" /> {formatWhen(r.desiredTime)}</p>
                <p className="mt-0.5">{r.riderFirstName} needs {seatsText(r.seatsNeeded)}</p>
              </div>
              <button type="button" onClick={() => onOffer(r)}
                className="text-xs font-bold bg-aviro-orange text-white px-4 py-2 rounded-lg flex-shrink-0">
                Offer
              </button>
            </div>
          </div>
        ))}
      </div>
      {requests.length > 3 && (
        <button type="button" onClick={() => setShowAll(v => !v)} className="w-full text-xs text-aviro-orange font-semibold mt-3">
          {showAll ? 'Show less' : `Show all ${requests.length}`}
        </button>
      )}
    </div>
  );
}

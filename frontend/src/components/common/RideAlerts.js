import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Tomorrow 9:00 local time as "YYYY-MM-DDTHH:mm" for a datetime-local input
const tomorrowNine = () => {
  const d = new Date(Date.now() + 24 * 3600e3);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
};
export const formatWhen = (value) =>
  new Date(value).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Shown when a search finds nothing: ask to be told when a matching ride is posted
export function RideAlertOffer({ fromLocation, toLocation, seatsNeeded, onCreated }) {
  const [time, setTime] = useState(tomorrowNine());
  const [saving, setSaving] = useState(false);

  const create = async () => {
    setSaving(true);
    try {
      const res = await api.post('/ride-requests', { fromLocation, toLocation, departureTime: `${time}:00`, seatsNeeded });
      toast.success(res.data?.message || "We'll notify you 🔔");
      onCreated && onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not set the alert');
    }
    setSaving(false);
  };

  return (
    <div className="card p-5 text-center space-y-3" data-testid="ride-alert-offer">
      <p className="text-4xl">🔔</p>
      <p className="font-bold">No rides yet on this route</p>
      <p className="text-sm text-aviro-muted">
        Get a notification as soon as someone offers <span className="text-white">{fromLocation} → {toLocation}</span> around your time.
      </p>
      <div className="text-left">
        <label className="text-xs text-aviro-muted block mb-1">When do you need to leave?</label>
        <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} className="input-field" />
        <p className="text-[11px] text-aviro-muted mt-1">Rides within an hour of this time will match.</p>
      </div>
      <button onClick={create} disabled={saving || !time} className="w-full btn-primary disabled:opacity-50">
        {saving ? 'Saving…' : '🔔 Notify me'}
      </button>
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
    try { await api.delete(`/ride-requests/${id}`); } catch { load(); }
  };

  if (alerts.length === 0) return null;
  return (
    <div className="card p-4 space-y-2" data-testid="my-ride-alerts">
      <p className="text-sm font-semibold">🔔 My ride alerts</p>
      {alerts.map(a => (
        <div key={a.id} className="flex items-center gap-3 text-sm border-t border-aviro-border pt-2">
          <div className="flex-1 min-w-0">
            <p className="truncate">{a.fromLocation} → {a.toLocation}</p>
            <p className="text-xs text-aviro-muted">{formatWhen(a.desiredTime)} · {a.seatsNeeded} seat{a.seatsNeeded > 1 ? 's' : ''}</p>
          </div>
          {a.status === 'MATCHED' && a.matchedRideId ? (
            <Link to={`/rides/${a.matchedRideId}`} className="text-xs font-semibold text-aviro-green">Ride found →</Link>
          ) : (
            <span className="text-xs text-yellow-400">Waiting</span>
          )}
          <button onClick={() => remove(a.id)} aria-label="Remove alert" className="text-aviro-muted hover:text-red-400 w-7 h-7">✕</button>
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { RouteLines } from './RideAlerts';
import { formatWhen } from '../../utils/when';

const firstName = (p) => p?.fullName?.split(' ')[0] || '';

const TONES = {
  wait:  'bg-yellow-500/10 text-yellow-300 border-yellow-500/25',
  good:  'bg-green-500/10 text-green-300 border-green-500/25',
  live:  'bg-aviro-orange/10 text-aviro-orange border-aviro-orange/30',
  act:   'bg-aviro-blue/10 text-blue-300 border-aviro-blue/30',
  done:  'bg-aviro-card2 text-aviro-muted border-aviro-border',
  bad:   'bg-red-500/10 text-red-300 border-red-500/25',
};

// What is happening with a booking, in words a rider understands
export function riderStatus(b) {
  const d = firstName(b.driver) || 'the driver';
  switch (b.status) {
    case 'REQUESTED': return { icon: '⏳', text: `Waiting for ${d} to accept`, tone: 'wait' };
    case 'CONFIRMED':
      if (b.tripStage === 'ON_THE_WAY') return { icon: '🚗', text: `${d} is on the way to you`, tone: 'live' };
      if (b.tripStage === 'ARRIVED') return { icon: '📍', text: `${d} is at the pickup`, tone: 'live' };
      if (b.tripStage === 'STARTED') return { icon: '🏁', text: 'On the trip now', tone: 'live' };
      return { icon: '✅', text: `Confirmed · ${d} will pick you up`, tone: 'good' };
    case 'COMPLETED':
      if (!b.paymentMethod) return { icon: '💳', text: `Trip done · pay ₹${b.totalAmount}`, tone: 'act', needsAction: true };
      if (b.paymentStatus !== 'COMPLETED') return { icon: '💵', text: `Paid in cash · waiting for ${d} to confirm`, tone: 'wait' };
      return { icon: '🎉', text: 'Completed', tone: 'done' };
    case 'REJECTED': return { icon: '✕', text: `${d} couldn't take this ride`, tone: 'bad' };
    case 'CANCELLED': return { icon: '✕', text: 'Cancelled', tone: 'bad' };
    default: return { icon: '•', text: b.status, tone: 'done' };
  }
}

export function StatusLine({ icon, text, tone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${TONES[tone] || TONES.done}`}>
      {tone === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-aviro-orange animate-pulse" />}
      <span aria-hidden="true">{icon}</span>{text}
    </span>
  );
}

// "My bookings" (as a rider) and "My rides" (as a driver) are two halves of one Trips section
export function TripsSwitch({ requests = 0 }) {
  const tab = ({ isActive }) => `flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-all
    ${isActive ? 'bg-aviro-orange text-white' : 'text-aviro-muted hover:text-white'}`;
  return (
    <nav className="flex bg-aviro-card2 p-1 rounded-2xl border border-aviro-border gap-1" aria-label="Trips">
      <NavLink to="/bookings" className={tab}>🎒 Rides I booked</NavLink>
      <NavLink to="/my-rides" className={tab}>
        🏍️ Rides I offer
        {requests > 0 && <span className="ml-1.5 bg-white text-aviro-orange text-[11px] font-bold px-1.5 py-0.5 rounded-full">{requests}</span>}
      </NavLink>
    </nav>
  );
}

// Upcoming / Past toggle under the switch
export function Segments({ value, onChange, options }) {
  return (
    <div className="flex gap-2" role="tablist">
      {options.map(o => (
        <button key={o.key} role="tab" aria-selected={value === o.key} onClick={() => onChange(o.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all
            ${value === o.key ? 'bg-white text-aviro-dark' : 'bg-aviro-card2 text-aviro-muted border border-aviro-border'}`}>
          {o.label}{o.count > 0 && <span className="ml-1.5 opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// A rider's booking: what's happening, when, where, and the one thing to do next
export function BookingCard({ b, onPay, onRate, onCancel }) {
  const st = riderStatus(b);
  const live = ['REQUESTED', 'CONFIRMED'].includes(b.status);
  const dim = ['CANCELLED', 'REJECTED'].includes(b.status);
  return (
    <div className={`card p-4 space-y-3 ${dim ? 'opacity-60' : ''} ${st.tone === 'live' ? 'border-aviro-orange/40' : ''}`} data-testid="booking-card">
      <StatusLine {...st} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold">{formatWhen(b.departureTime)}</p>
          <div className="mt-2"><RouteLines from={b.fromLocation} to={b.toLocation} /></div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-aviro-green font-bold text-lg">₹{b.totalAmount}</p>
          <p className="text-[11px] text-aviro-muted">{b.seatsBooked} seat{b.seatsBooked > 1 ? 's' : ''}</p>
        </div>
      </div>
      {b.driver && (
        <p className="text-xs text-aviro-muted flex items-center gap-1.5">
          <span>{b.driver.gender === 'FEMALE' ? '👩' : '👨'}</span>
          <span className="text-white">{b.driver.fullName}</span>
          {b.driver.rating != null && <span>· ⭐ {Number(b.driver.rating).toFixed(1)}</span>}
          {b.driver.vehicleModel && <span className="truncate">· {b.driver.vehicleModel}</span>}
        </p>
      )}
      {live && (
        <div className="flex items-center gap-3">
          <Link to={`/tracking/${b.id}`} className="flex-1 btn-primary text-center py-2.5 text-sm">
            {b.status === 'CONFIRMED' ? 'Open trip · OTP & map' : 'View request'}
          </Link>
          <button onClick={() => onCancel(b)} className="text-xs text-red-400 font-medium px-2 py-2">Cancel</button>
        </div>
      )}
      {st.needsAction && (
        <button onClick={() => onPay(b)} className="w-full bg-aviro-green text-white font-bold py-2.5 rounded-xl text-sm">💳 Pay ₹{b.totalAmount}</button>
      )}
      {onRate && (
        <button onClick={() => onRate(b)} className="w-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 font-semibold py-2 rounded-xl text-sm">⭐ Rate {firstName(b.driver) || 'the driver'}</button>
      )}
    </div>
  );
}

export { firstName };

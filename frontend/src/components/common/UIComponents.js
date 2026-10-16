import React from 'react';

// ─── GENDER BADGE ─────────────────────────────────────────────────
export const GenderBadge = ({ gender }) => {
  if (gender === 'MALE') return (
    <span className="gender-male">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z"/>
      </svg>
      Male driver
    </span>
  );
  if (gender === 'FEMALE') return (
    <span className="gender-female">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z"/>
      </svg>
      Female driver
    </span>
  );
  return null;
};

// ─── VEHICLE ICON ─────────────────────────────────────────────────
export const VehicleIcon = ({ type }) => {
  const icons = { BIKE: '🏍️', SCOOTY: '🛵', CAR: '🚗', AUTO: '🛺', VAN: '🚐' };
  return <span>{icons[type] || '🚗'}</span>;
};

// ─── RIDE CARD ────────────────────────────────────────────────────
export const RideCard = ({ ride, onBook, onClick }) => {
  const { driver } = ride;
  return (
    <div
      onClick={onClick}
      className="card p-4 hover:border-aviro-orange/50 hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-aviro-card2 border border-aviro-border flex items-center justify-center text-lg">
            {driver?.gender === 'FEMALE' ? '👩' : '👨'}
          </div>
          <div>
            <p className="font-semibold text-sm text-white">{driver?.fullName}</p>
            <p className="text-xs text-aviro-muted">{driver?.collegeName}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <GenderBadge gender={driver?.gender} />
          <span className="text-aviro-green font-bold text-base">₹{ride.pricePerSeat}</span>
        </div>
      </div>

      {/* Route */}
      <div className="bg-aviro-card2 rounded-xl p-3 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-aviro-orange" />
            <div className="w-px h-4 bg-aviro-border" />
            <div className="w-2 h-2 rounded-full bg-aviro-green" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-white font-medium">{ride.fromLocation}</span>
            <span className="text-aviro-muted">{ride.toLocation}</span>
          </div>
        </div>
      </div>

      {/* Meta + Book Button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Pill icon={<VehicleIcon type={driver?.vehicleType} />} label={driver?.vehicleType} />
          <Pill icon="⭐" label={driver?.rating?.toFixed(1)} />
          <Pill icon="💺" label={`${ride.availableSeats} seats`} />
          {ride.womenOnly && (
            <span className="bg-pink-500/10 text-pink-400 text-xs px-2 py-0.5 rounded-full font-semibold">
              Women-only
            </span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onBook && onBook(ride); }}
          className="btn-primary text-xs px-4 py-2"
        >
          Book →
        </button>
      </div>

      <p className="text-xs text-aviro-muted mt-2">
        🕐 {ride.departureTime
          ? new Date(ride.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : ''}
        {driver?.isCollegeVerified && (
          <span className="ml-2 text-aviro-green">✓ Verified</span>
        )}
      </p>
    </div>
  );
};

// ─── PILL ─────────────────────────────────────────────────────────
export const Pill = ({ icon, label }) => (
  <span className="bg-aviro-card2 border border-aviro-border text-aviro-muted text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
    <span>{icon}</span>{label}
  </span>
);

// ─── LOADING SPINNER ──────────────────────────────────────────────
export const Spinner = ({ size = 'md' }) => {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className={`${s} border-2 border-aviro-border border-t-aviro-orange rounded-full animate-spin`} />
  );
};

// ─── EMPTY STATE ──────────────────────────────────────────────────
export const EmptyState = ({ icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4 animate-float">{icon}</div>
    <h3 className="font-bold text-lg mb-1">{title}</h3>
    <p className="text-aviro-muted text-sm mb-6 max-w-xs">{subtitle}</p>
    {action}
  </div>
);

// ─── STAT CARD ────────────────────────────────────────────────────
export const StatCard = ({ icon, label, value, color = 'orange', trend }) => {
  const colors = {
    orange: 'text-aviro-orange bg-aviro-orange/10',
    green:  'text-aviro-green bg-aviro-green/10',
    blue:   'text-aviro-blue bg-aviro-blue/10',
    purple: 'text-aviro-purple bg-aviro-purple/10',
    yellow: 'text-aviro-yellow bg-aviro-yellow/10',
  };
  return (
    <div className="card p-3 sm:p-5 hover:border-aviro-orange/30 transition-colors">
      {/* Icon — chota mobile pe, thoda bada desktop pe */}
      <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-xl mb-2 sm:mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-aviro-muted text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 leading-tight">{label}</p>
      <p className="text-lg sm:text-2xl font-display font-bold">{value}</p>
      {trend && <p className="text-[10px] sm:text-xs text-aviro-green mt-0.5 sm:mt-1">{trend}</p>}
    </div>
  );
};

// ─── BOOKING STATUS BADGE ─────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const styles = {
    CONFIRMED: 'bg-green-500/10 text-green-400',
    REQUESTED: 'bg-yellow-500/10 text-yellow-400',
    CANCELLED: 'bg-red-500/10 text-red-400',
    COMPLETED: 'bg-blue-500/10 text-blue-400',
    REJECTED:  'bg-red-500/10 text-red-400',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] || 'bg-aviro-card2 text-aviro-muted'}`}>
      {status}
    </span>
  );
};

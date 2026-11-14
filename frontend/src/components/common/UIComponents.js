import React from 'react';
import { useSelector } from 'react-redux';
import { RouteLines } from './RideAlerts';
import { timeOf, dayOf } from '../../utils/when';
import Icon, { initial } from './Icon';

export const GenderBadge = ({ gender, label = 'driver' }) => {
  if (gender === 'MALE')
    return (
      <span className="gender-male">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
        </svg>
        {label ? `Male ${label}` : 'Male'}
      </span>
    );
  if (gender === 'FEMALE')
    return (
      <span className="gender-female">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
        </svg>
        {label ? `Female ${label}` : 'Female'}
      </span>
    );
  return null;
};

export const VehicleIcon = ({ type }) => {
  const icons = { BIKE: '🏍️', SCOOTY: '🛵', CAR: '🚗' };
  return <span>{icons[type] || '🚗'}</span>;
};

export const RideCard = ({ ride, onBook, onClick, booking = false }) => {
  const { driver } = ride;
  const me = useSelector((s) => s.auth.user);
  const own = me && driver?.id === me.id;
  const seats = ride.availableSeats;
  return (
    <div
      onClick={onClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onClick) onClick();
      }}
      className="card p-4 hover:border-aviro-orange/50 transition-colors cursor-pointer"
      data-testid="ride-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-bold text-xl leading-none">
            {ride.departureTime ? timeOf(ride.departureTime) : ''}
          </p>
          <p className="text-xs text-aviro-muted mt-1">
            {ride.departureTime ? dayOf(ride.departureTime) : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-aviro-green font-bold text-xl leading-none">₹{ride.pricePerSeat}</p>
          <p className="text-[11px] text-aviro-muted mt-1">per seat</p>
        </div>
      </div>

      <div className="mt-3">
        <RouteLines from={ride.fromLocation} to={ride.toLocation} />
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {Number.isFinite(ride.pickupDistanceMeters) && (
          <Pill
            icon="📍"
            label={
              ride.pickupDistanceMeters < 1000
                ? `${Math.max(10, Math.round(ride.pickupDistanceMeters / 10) * 10)} m from you`
                : `${(ride.pickupDistanceMeters / 1000).toFixed(1)} km from you`
            }
          />
        )}
        <Pill icon="💺" label={seats === 1 ? '1 seat left' : `${seats} seats left`} />
        {driver?.vehicleType && (
          <Pill
            icon={<VehicleIcon type={driver.vehicleType} />}
            label={driver.vehicleType.charAt(0) + driver.vehicleType.slice(1).toLowerCase()}
          />
        )}
        {ride.womenOnly && (
          <span className="bg-pink-500/10 text-pink-600 text-xs px-2 py-0.5 rounded-full font-semibold">
            <Icon e="🚺" /> Women-only
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-aviro-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-full bg-aviro-card2 border border-aviro-border flex items-center justify-center flex-shrink-0">
            {initial(driver?.fullName)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {driver?.fullName}
              {driver?.isCollegeVerified && (
                <span className="text-aviro-green text-xs ml-1" title="College verified">
                  <Icon e="✓" />
                </span>
              )}
            </p>
            <p className="text-xs text-aviro-muted truncate">
              {driver?.rating != null && `★ ${Number(driver.rating).toFixed(1)} · `}
              {driver?.gender === 'FEMALE' ? 'Female' : 'Male'} driver
            </p>
          </div>
        </div>
        {own ? (
          <span className="text-xs text-aviro-muted flex-shrink-0">Your ride</span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBook && onBook(ride);
            }}
            disabled={booking || seats < 1}
            className="btn-primary text-sm px-5 py-2 flex-shrink-0 disabled:opacity-50"
          >
            {booking ? 'Booking…' : 'Book'}
          </button>
        )}
      </div>
    </div>
  );
};

export const Pill = ({ icon, label }) => (
  <span className="bg-aviro-card2 border border-aviro-border text-aviro-muted text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
    <span>
      <Icon e={icon} />
    </span>
    {label}
  </span>
);

export const Spinner = ({ size = 'md' }) => {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div
      className={`${s} border-2 border-aviro-border border-t-aviro-orange rounded-full animate-spin`}
    />
  );
};

export const EmptyState = ({ icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4 animate-float">
      <Icon e={icon} />
    </div>
    <h3 className="font-bold text-lg mb-1">{title}</h3>
    <p className="text-aviro-muted text-sm mb-6 max-w-xs">{subtitle}</p>
    {action}
  </div>
);

export const StatCard = ({ icon, label, value, color = 'orange', trend }) => {
  const colors = {
    orange: 'text-aviro-orange bg-aviro-orange/10',
    green: 'text-aviro-green bg-aviro-green/10',
    blue: 'text-aviro-blue bg-aviro-blue/10',
    purple: 'text-aviro-purple bg-aviro-purple/10',
    yellow: 'text-aviro-yellow bg-aviro-yellow/10',
  };
  return (
    <div className="card p-3 sm:p-5 hover:border-aviro-orange/30 transition-colors">
      <div
        className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-xl mb-2 sm:mb-3 ${colors[color]}`}
      >
        {icon}
      </div>
      <p className="text-aviro-muted text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 leading-tight">
        {label}
      </p>
      <p className="text-lg sm:text-2xl font-display font-bold">{value}</p>
      {trend && <p className="text-[10px] sm:text-xs text-aviro-green mt-0.5 sm:mt-1">{trend}</p>}
    </div>
  );
};

export const StatusBadge = ({ status }) => {
  const styles = {
    CONFIRMED: 'bg-green-500/10 text-green-600',
    REQUESTED: 'bg-yellow-500/10 text-yellow-600',
    CANCELLED: 'bg-red-500/10 text-red-600',
    COMPLETED: 'bg-blue-500/10 text-blue-600',
    REJECTED: 'bg-red-500/10 text-red-600',
  };
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] || 'bg-aviro-card2 text-aviro-muted'}`}
    >
      {status}
    </span>
  );
};

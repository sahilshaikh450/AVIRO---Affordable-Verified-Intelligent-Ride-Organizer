import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchProfile } from '../store/authSlice';
import { GenderBadge } from '../components/common/UIComponents';
import ReviewsSection from '../components/common/ReviewsSection';
import CollegeIdUpload from '../components/common/CollegeIdUpload';
import UpiIdCard from '../components/common/UpiIdCard';
import VehicleDocs from '../components/common/VehicleDocs';
import api from '../services/api';
import toast from 'react-hot-toast';
import Icon, { initial } from '../components/common/Icon';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="rounded-2xl bg-aviro-card2 p-4">
      <div className="text-aviro-muted"><Icon e={icon} size={20} /></div>
      <div className="font-bold text-2xl mt-2 tracking-tight">{value}</div>
      <div className="text-xs text-aviro-muted mt-0.5">{label}</div>
    </div>
  );
}

function AnalyticsTab() {
  const { user } = useSelector(s => s.auth);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.get('/bookings/my').then(r => setBookings(r.data.data || [])).catch(() => {});
  }, []);

  const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
  const totalRides  = completedBookings.length;
  const totalSpent  = completedBookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalSaved  = totalSpent * 0.4;
  const totalCo2    = totalRides * 1.5;

  const monthlyData = {};
  completedBookings.forEach(b => {
    if (!b.departureTime) return;
    const key = new Date(b.departureTime).toLocaleDateString('en-IN', { month: 'short' });
    monthlyData[key] = (monthlyData[key] || 0) + (b.totalAmount || 0);
  });
  const months   = Object.keys(monthlyData).slice(-6);
  const maxSpend = Math.max(...Object.values(monthlyData), 1);

  const routeCounts = {};
  completedBookings.forEach(b => {
    const route = `${b.fromLocation} → ${b.toLocation}`;
    routeCounts[route] = (routeCounts[route] || 0) + 1;
  });
  const topRoutes = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="💰" label="Total Saved"  value={`₹${totalSaved.toFixed(0)}`}   color="green"  />
        <StatCard icon="🌱" label="CO₂ Saved"    value={`${totalCo2.toFixed(1)} kg`}    color="green"  />
        <StatCard icon="🏍️" label="Total Rides"  value={totalRides}                     color="orange" />
        <StatCard icon="⭐" label="Your Rating"  value={`${user?.rating?.toFixed(1) || '5.0'}★`} color="yellow" />
      </div>

      {/* Spending chart */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider mb-4">
          <Icon e="💸" /> Spending Trend (Last 6 Months)
        </h3>
        {months.length === 0 ? (
          <div className="text-center py-8 text-aviro-muted text-sm">No completed rides yet.</div>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {months.map((m, i) => {
              const value = monthlyData[m];
              const heightPct = (value / maxSpend) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-aviro-green font-semibold">₹{value.toFixed(0)}</span>
                  <div className="w-full bg-aviro-card2 rounded-t-lg relative" style={{ height: '100px' }}>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-aviro-orange to-aviro-orange/60 rounded-t-lg transition-all"
                      style={{ height: `${heightPct}%` }} />
                  </div>
                  <span className="text-xs text-aviro-muted">{m}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top routes */}
      {topRoutes.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider mb-4">
            <Icon e="🗺️" /> Favourite Routes
          </h3>
          <div className="space-y-3">
            {topRoutes.map(([route, count], i) => (
              <div key={i} className="flex items-center justify-between bg-aviro-card2 rounded-xl p-3">
                <span className="text-sm truncate">{route}</span>
                <span className="text-xs text-aviro-orange font-bold ml-2">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Profile is split into tabs; /profile?tab=id or ?tab=vehicle opens one directly
const TABS = [
  { key: 'profile',   icon: '👤', label: 'Profile' },
  { key: 'id',        icon: '🎓', label: 'College ID' },
  { key: 'vehicle',   icon: '🏍️', label: 'Vehicle' },
  { key: 'analytics', icon: '📊', label: 'Stats' },
];

const vehicleIcon = (type) => ({ CAR: '🚗', BIKE: '🏍️', SCOOTY: '🛵' }[type] || '🚗');

// AVIRO supports bikes, scooties and cars
const VEHICLE_TYPES = [
  { value: 'BIKE', label: '🏍️ Bike' },
  { value: 'SCOOTY', label: '🛵 Scooty' },
  { value: 'CAR', label: '🚗 Car' },
];

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { register, handleSubmit, reset } = useForm();
  const [saving, setSaving]           = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const { register: vReg, handleSubmit: vSubmit, watch: vWatch, formState: { errors: vErrors } } = useForm({ defaultValues: { vehicleType: 'BIKE', totalSeats: '1' } });
  const vType = vWatch('vehicleType');
  const [params, setParams] = useSearchParams();
  const activeTab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'profile';
  const setActiveTab = (key) => setParams(key === 'profile' ? {} : { tab: key }, { replace: true });

  // ── Hide/Show toggles ──
  const [showPersonalInfo, setShowPersonalInfo]   = useState(false);
  const [editPersonalInfo, setEditPersonalInfo]   = useState(false);

  const vehicleVerified = !!(user?.vehicle?.isVerified && user.vehicle.platePhotoUrl && user.vehicle.licencePhotoUrl);
  // An orange dot on a tab that still needs something from the user
  const needsAction = { id: user && !user.isCollegeVerified, vehicle: !!user?.vehicle && !vehicleVerified };

  useEffect(() => { dispatch(fetchProfile()); }, [dispatch]);
  useEffect(() => {
    if (user) reset({
      fullName: user.fullName, phone: user.phone,
      locality: user.locality, department: user.department,
      yearOfStudy: user.yearOfStudy, womenOnlyMode: user.womenOnlyMode
    });
  }, [user, reset]);

  const onSave = async (data) => {
    setSaving(true);
    try {
      await api.put('/users/profile', data);
      toast.success('Profile updated!');
      dispatch(fetchProfile());
      setEditPersonalInfo(false);
      setShowPersonalInfo(false);
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const onAddVehicle = async (data) => {
    try {
      const res = await api.post('/users/vehicle', { ...data, totalSeats: data.vehicleType === 'CAR' ? parseInt(data.totalSeats, 10) : 1 });
      toast.success(res.data?.message || 'Vehicle saved!');
      setAddingVehicle(false);
      dispatch(fetchProfile());
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display font-bold text-2xl">My Profile</h1>
        <Link to="/settings" className="flex items-center gap-1.5 text-sm font-semibold bg-aviro-card2 border border-aviro-border rounded-xl px-3 py-2 hover:border-aviro-orange/50">
          <Icon e="⚙️" /> Settings
        </Link>
      </div>

      {/* Profile Header */}
      <div className="card p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-aviro-orange/20 border-4 border-aviro-orange/30 flex items-center justify-center text-4xl mx-auto mb-3">
          {initial(user?.fullName)}
        </div>
        <h2 className="font-bold text-xl">{user?.fullName}</h2>
        <p className="text-aviro-muted text-sm mt-0.5">{user?.collegeName} · {user?.department}</p>
        <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
          <GenderBadge gender={user?.gender} label="" />
          {user?.isCollegeVerified && <span className="text-xs bg-green-500/10 text-green-600 px-2.5 py-1 rounded-full font-semibold"><Icon e="✓" /> College Verified</span>}
          {user?.isVerified && <span className="text-xs bg-blue-500/10 text-blue-600 px-2.5 py-1 rounded-full font-semibold"><Icon e="✓" /> Email Verified</span>}
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="grid grid-cols-4 bg-aviro-card2 p-1.5 rounded-2xl border border-aviro-border gap-1">
        {TABS.map(t => (
          <button key={t.key} role="tab" aria-selected={activeTab === t.key} onClick={() => setActiveTab(t.key)}
            className={`relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-semibold transition-all
              ${activeTab === t.key ? 'bg-aviro-orange text-white' : 'text-aviro-muted hover:text-aviro-fg'}`}>
            <span className="text-base sm:text-sm leading-none"><Icon e={t.icon} /></span>
            <span className="whitespace-nowrap">{t.label}</span>
            {needsAction[t.key] && (
              <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${activeTab === t.key ? 'bg-white' : 'bg-aviro-orange'}`} />
            )}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon="⭐" label="Rating"   value={`${user?.rating?.toFixed(1) || '5.0'}★`} color="yellow" />
            <StatCard icon="🏍️" label="Rides"    value={user?.totalRides || 0}                    color="orange" />
            <StatCard icon="🪙" label="Credits"  value={user?.aviroCredits || 0}                  color="green"  />
            <StatCard icon="🌱" label="CO₂ (kg)" value={user?.co2Saved?.toFixed(1) || '0'}        color="green"  />
          </div>

          {/* ── Personal Info — hide/show toggle ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold"><Icon e="📋" /> Personal Information</h3>
              <div className="flex items-center gap-2">
                {!editPersonalInfo && (
                  <button onClick={() => setShowPersonalInfo(!showPersonalInfo)}
                    className="text-xs text-aviro-orange border border-aviro-orange/30 px-3 py-1.5 rounded-lg hover:bg-aviro-orange/10 transition-colors">
                    {showPersonalInfo ? '🙈 Hide' : '👁️ View info'}
                  </button>
                )}
                {showPersonalInfo && !editPersonalInfo && (
                  <button onClick={() => { setEditPersonalInfo(true); setShowPersonalInfo(false); }}
                    className="text-xs text-aviro-blue border border-aviro-blue/30 px-3 py-1.5 rounded-lg hover:bg-aviro-blue/10 transition-colors">
                    <Icon e="✏️" /> Edit
                  </button>
                )}
              </div>
            </div>

            {/* View mode */}
            {showPersonalInfo && !editPersonalInfo && (
              <div className="space-y-2 bg-aviro-card2 rounded-xl p-4">
                {[
                  { label: 'Full Name',    value: user?.fullName },
                  { label: 'Email',        value: user?.email },
                  { label: 'Phone',        value: user?.phone || '—' },
                  { label: 'Locality',     value: user?.locality || '—' },
                  { label: 'Department',   value: user?.department || '—' },
                  { label: 'Year',         value: user?.yearOfStudy ? `Year ${user.yearOfStudy}` : '—' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-aviro-border last:border-0">
                    <span className="text-xs text-aviro-muted">{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Edit mode */}
            {editPersonalInfo && (
              <form onSubmit={handleSubmit(onSave)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1">Full Name</label>
                    <input {...register('fullName')} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1">Phone</label>
                    <input {...register('phone')} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1">Locality</label>
                    <input {...register('locality')} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1">Department</label>
                    <input {...register('department')} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1">Year of Study</label>
                    <select {...register('yearOfStudy')} className="input-field">
                      {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <input type="checkbox" {...register('womenOnlyMode')} id="womenOnly" />
                    <label htmlFor="womenOnly" className="text-xs text-aviro-muted">Women-only mode</label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditPersonalInfo(false)}
                    className="flex-1 bg-aviro-card2 border border-aviro-border text-aviro-muted py-2.5 rounded-xl text-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving...</> : '✅ Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Hidden state message */}
            {!showPersonalInfo && !editPersonalInfo && (
              <p className="text-xs text-aviro-muted">Click "View info" to see your personal details</p>
            )}
          </div>

          {/* UPI ID for drivers */}
          {user?.role !== 'RIDER' && <UpiIdCard user={user} onSaved={() => dispatch(fetchProfile())} />}

          {/* Reviews */}
          <ReviewsSection userId={user?.id} />
        </>
      )}

      {/* ── COLLEGE ID TAB ── */}
      {activeTab === 'id' && (
        <CollegeIdUpload user={user} onUploaded={() => dispatch(fetchProfile())} />
      )}

      {/* ── VEHICLE TAB ── */}
      {activeTab === 'vehicle' && (
          <div className="card p-5">
            <div className="mb-3">
              <h3 className="font-semibold"><Icon e="🏍️" /> My Vehicle</h3>
              <p className="text-xs text-aviro-muted mt-0.5">Needed only if you want to offer rides.</p>
            </div>

            {user?.vehicle && !addingVehicle && (
              <div className="bg-aviro-card2 rounded-xl p-4 flex items-center gap-4 mb-3">
                <div className="text-3xl">{vehicleIcon(user.vehicle.vehicleType)}</div>
                <div>
                  <p className="font-semibold">{[user.vehicle.make, user.vehicle.model].filter(Boolean).join(' ') || user.vehicle.vehicleType}{user.vehicle.color ? ` · ${user.vehicle.color}` : ''}</p>
                  <p className="text-xs text-aviro-muted">{user.vehicle.registrationNumber} · {user.vehicle.totalSeats} seats</p>
                  {vehicleVerified
                    ? <span className="text-xs text-green-600 font-semibold"><Icon e="✓" /> Verified</span>
                    : <span className="text-xs text-yellow-600">⏳ Not verified yet</span>}
                </div>
              </div>
            )}

            {/* Photos for verification: always visible, since rides can't be offered without them */}
            {user?.vehicle && !addingVehicle && (
              <VehicleDocs vehicle={user.vehicle} onChanged={() => dispatch(fetchProfile())} />
            )}

            {!user?.vehicle && !addingVehicle && (
              <p className="text-aviro-muted text-sm mb-3">No vehicle added. Add one to start offering rides!</p>
            )}


            {addingVehicle ? (
              <form onSubmit={vSubmit(onAddVehicle)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1">Vehicle Type</label>
                    <select {...vReg('vehicleType', { required: true })} className="input-field">
                      {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1">Registration No.</label>
                    <input {...vReg('registrationNumber', { required: true, validate: v => /^([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}|\d{2}BH\d{4}[A-Z]{1,2})$/.test(v.toUpperCase().replace(/[\s-]/g, '')) || 'Like MH12AB1234' })} placeholder="MH12AB1234" autoCapitalize="characters" className="input-field" />
                    {vErrors?.registrationNumber && <p className="text-red-600 text-xs mt-1">{vErrors.registrationNumber.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1">Make</label>
                    <input {...vReg('make')} placeholder="Honda, Bajaj..." className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1">Model</label>
                    <input {...vReg('model')} placeholder="Activa, Pulsar..." className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1">Color</label>
                    <input {...vReg('color')} placeholder="Black, Red..." className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1">Seats for riders</label>
                    {vType === 'CAR' ? (
                      <select {...vReg('totalSeats', { required: true })} className="input-field">
                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    ) : (
                      <p className="input-field text-aviro-muted">1 (pillion)</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAddingVehicle(false)}
                    className="flex-1 bg-aviro-card2 border border-aviro-border text-aviro-muted py-2.5 rounded-xl text-sm">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary">Add Vehicle</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setAddingVehicle(true)}
                className="w-full bg-aviro-card2 border border-dashed border-aviro-border text-aviro-muted py-2.5 rounded-xl text-sm hover:border-aviro-orange/50 hover:text-aviro-fg transition-all">
                {user?.vehicle ? '+ Update Vehicle' : '+ Add Vehicle'}
              </button>
            )}
          </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}
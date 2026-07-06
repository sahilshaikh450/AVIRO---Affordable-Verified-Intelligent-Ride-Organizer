import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile } from '../store/authSlice';
import { GenderBadge, StatCard, Spinner } from '../components/common/UIComponents';
import api from '../services/api';
import toast from 'react-hot-toast';
import ReviewsSection from '../components/common/ReviewsSection';
import CollegeIdUpload from '../components/common/CollegeIdUpload';
import CollegeEmailVerify from '../components/common/CollegeEmailVerify';

// ─────────────────────────────────────────────────────────────
// ANALYTICS TAB CONTENT (merged from AnalyticsPage)
// ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const { user } = useSelector(s => s.auth);
  const [bookings, setBookings] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/bookings/my').catch(() => ({ data: { data: [] } })),
      api.get('/rides/my').catch(() => ({ data: { data: [] } })),
    ]).then(([bRes, rRes]) => {
      setBookings(bRes.data.data || []);
      setMyRides(rRes.data.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
  const totalSpent = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const estimatedSoloCost = totalSpent * 2.2;
  const totalSaved = Math.max(0, estimatedSoloCost - totalSpent);

  const avgKmPerRide = 6;
  const co2PerRideKg = (avgKmPerRide * 0.12);
  const totalCo2Saved = completedBookings.length * co2PerRideKg;

  const totalRidesAsRider  = completedBookings.length;
  const totalRidesAsDriver = myRides.filter(r => r.status === 'COMPLETED' || r.availableSeats < r.totalSeats).length;
  const totalRides = totalRidesAsRider + totalRidesAsDriver;

  const monthlyData = {};
  completedBookings.forEach(b => {
    if (!b.departureTime) return;
    const d = new Date(b.departureTime);
    const key = d.toLocaleDateString('en-IN', { month: 'short' });
    monthlyData[key] = (monthlyData[key] || 0) + (b.totalAmount || 0);
  });
  const months = Object.keys(monthlyData).slice(-6);
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
        <StatCard icon="💰" label="Total Saved" value={`₹${totalSaved.toFixed(0)}`} color="green"
          trend={totalSaved > 0 ? `vs solo travel` : ''} />
        <StatCard icon="🌱" label="CO₂ Saved" value={`${totalCo2Saved.toFixed(1)} kg`} color="green"
          trend={totalCo2Saved > 0 ? `🌳 ${Math.ceil(totalCo2Saved/21)} trees/yr` : ''} />
        <StatCard icon="🏍️" label="Total Rides" value={totalRides} color="orange" />
        <StatCard icon="⭐" label="Your Rating" value={`${user?.rating?.toFixed(1) || '5.0'}★`} color="yellow" />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider mb-4">
          💸 Spending Trend (Last 6 Months)
        </h3>
        {months.length === 0 ? (
          <div className="text-center py-8 text-aviro-muted text-sm">
            No completed rides yet. Start booking to see your trends!
          </div>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {months.map((m, i) => {
              const value = monthlyData[m];
              const heightPct = (value / maxSpend) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-aviro-green font-semibold">₹{value.toFixed(0)}</span>
                  <div className="w-full bg-aviro-card2 rounded-t-lg relative" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-aviro-orange to-aviro-orange/60 rounded-t-lg transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-aviro-muted">{m}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider mb-4">
            💵 Cost Comparison
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-aviro-muted">Solo travel (estimated)</span>
                <span className="font-semibold">₹{estimatedSoloCost.toFixed(0)}</span>
              </div>
              <div className="h-2 bg-aviro-card2 rounded-full overflow-hidden">
                <div className="h-full bg-red-400/60 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-aviro-muted">AVIRO ride-sharing</span>
                <span className="font-semibold text-aviro-green">₹{totalSpent.toFixed(0)}</span>
              </div>
              <div className="h-2 bg-aviro-card2 rounded-full overflow-hidden">
                <div className="h-full bg-aviro-green rounded-full"
                  style={{ width: `${estimatedSoloCost > 0 ? (totalSpent/estimatedSoloCost)*100 : 0}%` }} />
              </div>
            </div>
            <div className="bg-aviro-green/10 border border-aviro-green/20 rounded-xl p-3 text-center">
              <p className="text-aviro-green font-bold text-lg">₹{totalSaved.toFixed(0)} saved!</p>
              <p className="text-xs text-aviro-muted">
                {estimatedSoloCost > 0 ? Math.round((totalSaved/estimatedSoloCost)*100) : 0}% cheaper than solo travel
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider mb-4">
            🗺️ Your Favorite Routes
          </h3>
          {topRoutes.length === 0 ? (
            <div className="text-center py-8 text-aviro-muted text-sm">No ride history yet</div>
          ) : (
            <div className="space-y-3">
              {topRoutes.map(([route, count], i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-white truncate flex-1">{route}</span>
                  <span className="text-xs bg-aviro-card2 text-aviro-orange font-semibold px-2.5 py-1 rounded-full ml-2">
                    {count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 bg-gradient-to-br from-aviro-green/10 to-transparent border-aviro-green/20">
        <div className="flex items-center gap-4">
          <div className="text-5xl">🌍</div>
          <div className="flex-1">
            <h3 className="font-bold text-base mb-1">Environmental Impact</h3>
            <p className="text-sm text-aviro-muted">
              You've saved <span className="text-aviro-green font-bold">{totalCo2Saved.toFixed(1)} kg</span> of CO₂ emissions
              by sharing rides instead of traveling solo — equivalent to planting{' '}
              <span className="text-aviro-green font-bold">{Math.ceil(totalCo2Saved / 21)}</span> trees! 🌳
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PROFILE PAGE
// ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { register, handleSubmit, reset } = useForm();
  const [saving, setSaving] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const { register: vReg, handleSubmit: vSubmit } = useForm();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'analytics'

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (user) reset({ fullName: user.fullName, phone: user.phone, locality: user.locality, department: user.department, yearOfStudy: user.yearOfStudy, womenOnlyMode: user.womenOnlyMode });
  }, [user, reset]);

  const onSave = async (data) => {
    setSaving(true);
    try {
      await api.put('/users/profile', data);
      toast.success('Profile updated!');
      dispatch(fetchProfile());
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const onAddVehicle = async (data) => {
    try {
      await api.post('/users/vehicle', { ...data, totalSeats: parseInt(data.totalSeats) });
      toast.success('Vehicle added!');
      setAddingVehicle(false);
      dispatch(fetchProfile());
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <h1 className="font-display font-bold text-2xl">My Profile 👤</h1>

      {/* Profile Header */}
      <div className="card p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-aviro-orange/20 border-4 border-aviro-orange/30 flex items-center justify-center text-4xl mx-auto mb-3">
          {user?.gender === 'FEMALE' ? '👩' : '👨'}
        </div>
        <h2 className="font-bold text-xl">{user?.fullName}</h2>
        <p className="text-aviro-muted text-sm mt-0.5">{user?.collegeName} · {user?.department}</p>
        <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
          <GenderBadge gender={user?.gender} />
          {user?.isCollegeVerified && <span className="text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full font-semibold">✓ College Verified</span>}
          {user?.isVerified && <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full font-semibold">✓ Email Verified</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="⭐" label="Rating"   value={`${user?.rating?.toFixed(1) || '5.0'}★`} color="yellow" />
        <StatCard icon="🏍️" label="Rides"    value={user?.totalRides || 0}                    color="orange" />
        <StatCard icon="🪙" label="Credits"  value={user?.aviroCredits || 0}                  color="green"  />
        <StatCard icon="🌱" label="CO₂ (kg)" value={user?.co2Saved?.toFixed(1) || '0'}        color="green"  />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-aviro-card2 p-1.5 rounded-xl border border-aviro-border">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all
            ${activeTab === 'profile' ? 'bg-aviro-orange text-white' : 'text-aviro-muted hover:text-white'}`}
        >
          👤 Profile
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all
            ${activeTab === 'analytics' ? 'bg-aviro-orange text-white' : 'text-aviro-muted hover:text-white'}`}
        >
          📊 Analytics
        </button>
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <>
          {/* Edit Profile */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Edit Profile</h3>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Full Name</label>
                  <input {...register('fullName')} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Phone</label>
                  <input {...register('phone')} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Locality</label>
                  <input {...register('locality')} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Year of Study</label>
                  <select {...register('yearOfStudy')} className="input-field">
                    {['1st Year','2nd Year','3rd Year','4th Year','PG'].map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input {...register('womenOnlyMode')} type="checkbox" className="w-4 h-4 accent-pink-500" />
                <span className="text-sm text-pink-400 font-medium">🚺 Women-only mode (only see female drivers)</span>
              </label>
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? 'Saving...' : 'Save Changes ✓'}
              </button>
            </form>
          </div>

          {/* College ID Upload */}
          <CollegeIdUpload user={user} onUploaded={() => dispatch(fetchProfile())} />

          {/* College Email Verification via .edu.in OTP */}
          <CollegeEmailVerify user={user} onVerified={() => dispatch(fetchProfile())} />

          {/* Vehicle Section */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">🏍️ My Vehicle</h3>
              {!user?.vehicle && <button onClick={() => setAddingVehicle(!addingVehicle)} className="btn-primary text-xs">+ Add Vehicle</button>}
            </div>
            {user?.vehicle ? (
              <div className="bg-aviro-card2 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{user.vehicle.vehicleType === 'BIKE' ? '🏍️' : user.vehicle.vehicleType === 'CAR' ? '🚗' : '🛵'}</span>
                  <div>
                    <p className="font-semibold">{user.vehicle.make} {user.vehicle.model} · {user.vehicle.color}</p>
                    <p className="text-xs text-aviro-muted">{user.vehicle.registrationNumber} · {user.vehicle.totalSeats} seats</p>
                    {user.vehicle.isVerified
                      ? <span className="text-xs text-green-400 font-semibold">✓ Verified</span>
                      : <span className="text-xs text-yellow-400">⏳ Pending verification</span>}
                  </div>
                </div>
              </div>
            ) : addingVehicle ? (
              <form onSubmit={vSubmit(onAddVehicle)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1.5">Vehicle Type</label>
                    <select {...vReg('vehicleType', { required: true })} className="input-field">
                      {['BIKE','SCOOTY','CAR','AUTO','VAN'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1.5">Registration No.</label>
                    <input {...vReg('registrationNumber', { required: true })} placeholder="MH12AB1234" className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1.5">Make</label>
                    <input {...vReg('make')} placeholder="Honda, Bajaj..." className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1.5">Model</label>
                    <input {...vReg('model')} placeholder="Activa, Pulsar..." className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1.5">Color</label>
                    <input {...vReg('color')} placeholder="Black, Red..." className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1.5">Total Seats</label>
                    <select {...vReg('totalSeats', { required: true })} className="input-field">
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAddingVehicle(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Add Vehicle</button>
                </div>
              </form>
            ) : (
              <p className="text-aviro-muted text-sm">No vehicle added. Add one to start offering rides!</p>
            )}
          </div>

          {/* Reviews Section */}
          <ReviewsSection userId={user?.id} />

          {/* Emergency Contacts */}
          <div className="card p-5">
            <h3 className="font-semibold mb-2">🆘 Emergency Contacts</h3>
            <p className="text-aviro-muted text-sm mb-3">These contacts get notified when you trigger SOS</p>
            <input className="input-field" placeholder="Add phone numbers (comma separated)" />
            <button className="btn-secondary text-sm mt-2">Save Contacts</button>
          </div>
        </>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}
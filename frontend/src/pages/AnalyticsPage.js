import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { Spinner, StatCard } from '../components/common/UIComponents';

export default function AnalyticsPage() {
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

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  // ── Calculate stats from real data ──────────────────────────
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
  const totalSpent = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  // Assume average solo-ride cost (auto/cab) is ~2.2x shared ride cost -> "savings"
  const estimatedSoloCost = totalSpent * 2.2;
  const totalSaved = Math.max(0, estimatedSoloCost - totalSpent);

  // CO2: ~120g CO2 saved per km when ride-sharing vs solo trip; estimate 6km avg trip
  const avgKmPerRide = 6;
  const co2PerRideKg = (avgKmPerRide * 0.12); // 120g/km shared savings
  const totalCo2Saved = completedBookings.length * co2PerRideKg;

  const totalRidesAsRider  = completedBookings.length;
  const totalRidesAsDriver = myRides.filter(r => r.status === 'COMPLETED' || r.availableSeats < r.totalSeats).length;
  const totalRides = totalRidesAsRider + totalRidesAsDriver;

  // Monthly breakdown (last 6 months)
  const monthlyData = {};
  completedBookings.forEach(b => {
    if (!b.departureTime) return;
    const d = new Date(b.departureTime);
    const key = d.toLocaleDateString('en-IN', { month: 'short' });
    monthlyData[key] = (monthlyData[key] || 0) + (b.totalAmount || 0);
  });
  const months = Object.keys(monthlyData).slice(-6);
  const maxSpend = Math.max(...Object.values(monthlyData), 1);

  // Route frequency
  const routeCounts = {};
  completedBookings.forEach(b => {
    const route = `${b.fromLocation} → ${b.toLocation}`;
    routeCounts[route] = (routeCounts[route] || 0) + 1;
  });
  const topRoutes = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display font-bold text-2xl mb-1">Your Impact 📊</h1>
        <p className="text-aviro-muted text-sm">See how much you've saved with AVIRO</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="💰" label="Total Saved" value={`₹${totalSaved.toFixed(0)}`} color="green"
          trend={totalSaved > 0 ? `vs solo travel` : ''} />
        <StatCard icon="🌱" label="CO₂ Saved" value={`${totalCo2Saved.toFixed(1)} kg`} color="green"
          trend={totalCo2Saved > 0 ? `🌳 like ${Math.ceil(totalCo2Saved/21)} trees/yr` : ''} />
        <StatCard icon="🏍️" label="Total Rides" value={totalRides} color="orange" />
        <StatCard icon="⭐" label="Your Rating" value={`${user?.rating?.toFixed(1) || '5.0'}★`} color="yellow" />
      </div>

      {/* Spending Trend */}
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

      {/* Savings Breakdown */}
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
              <p className="text-xs text-aviro-muted">That's {estimatedSoloCost > 0 ? Math.round((totalSaved/estimatedSoloCost)*100) : 0}% cheaper than solo travel</p>
            </div>
          </div>
        </div>

        {/* Top Routes */}
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider mb-4">
            🗺️ Your Favorite Routes
          </h3>
          {topRoutes.length === 0 ? (
            <div className="text-center py-8 text-aviro-muted text-sm">
              No ride history yet
            </div>
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

      {/* Environmental Impact */}
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
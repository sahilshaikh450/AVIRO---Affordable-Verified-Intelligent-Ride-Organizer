import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Spinner, GenderBadge } from '../components/common/UIComponents';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [pending, setPending]         = useState([]);
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [tab, setTab]                 = useState('college'); // 'college' | 'vehicle'

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, vRes] = await Promise.all([
        api.get('/admin/pending-verifications'),
        api.get('/admin/stats'),
        api.get('/admin/pending-vehicles'),
      ]);
      setPending(pRes.data.data || []);
      setStats(sRes.data.data);
      setPendingVehicles(vRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load admin data');
    }
    setLoading(false);
  };

  const handleApprove = async (userId) => {
    setProcessingId(userId);
    try {
      await api.post(`/admin/verify-college-id/${userId}`);
      toast.success('College ID verified! ✅');
      loadData();
    } catch { toast.error('Failed to approve'); }
    setProcessingId(null);
  };

  const handleReject = async (userId) => {
    setProcessingId(userId);
    try {
      await api.post(`/admin/reject-college-id/${userId}`);
      toast.success('Verification rejected');
      loadData();
    } catch { toast.error('Failed to reject'); }
    setProcessingId(null);
  };

  const handleVehicleApprove = async (vehicleId) => {
    setProcessingId(vehicleId);
    try {
      await api.post(`/admin/verify-vehicle/${vehicleId}`);
      toast.success('Vehicle verified! ✅');
      loadData();
    } catch { toast.error('Failed to approve vehicle'); }
    setProcessingId(null);
  };

  const handleVehicleReject = async (vehicleId) => {
    setProcessingId(vehicleId);
    try {
      await api.post(`/admin/reject-vehicle/${vehicleId}`);
      toast.success('Vehicle rejected');
      loadData();
    } catch { toast.error('Failed to reject vehicle'); }
    setProcessingId(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display font-bold text-2xl mb-1">Admin Panel 🛡️</h1>
        <p className="text-aviro-muted text-sm">Review and verify college ID & vehicle submissions</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
            <p className="text-xs text-aviro-muted">Total Users</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-aviro-green">{stats.verifiedUsers}</p>
            <p className="text-xs text-aviro-muted">ID Verified</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.pendingUsers}</p>
            <p className="text-xs text-aviro-muted">ID Pending</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-aviro-card2 p-1.5 rounded-xl border border-aviro-border">
        <button onClick={() => setTab('college')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all
            ${tab === 'college' ? 'bg-aviro-orange text-white' : 'text-aviro-muted hover:text-white'}`}>
          🎓 College IDs
          {pending.length > 0 && (
            <span className="ml-2 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{pending.length}</span>
          )}
        </button>
        <button onClick={() => setTab('vehicle')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all
            ${tab === 'vehicle' ? 'bg-aviro-orange text-white' : 'text-aviro-muted hover:text-white'}`}>
          🏍️ Vehicles
          {pendingVehicles.length > 0 && (
            <span className="ml-2 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{pendingVehicles.length}</span>
          )}
        </button>
      </div>

      {/* ── COLLEGE ID TAB ── */}
      {tab === 'college' && (
        <div>
          <h2 className="font-bold text-lg mb-3">⏳ Pending College IDs ({pending.length})</h2>
          {pending.length === 0 ? (
            <div className="card p-8 text-center text-aviro-muted text-sm">
              <div className="text-3xl mb-2">✅</div>No pending college ID verifications!
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map(u => (
                <div key={u.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-aviro-card2 border border-aviro-border flex items-center justify-center text-xl">
                        {u.gender === 'FEMALE' ? '👩' : '👨'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{u.fullName}</p>
                        <p className="text-xs text-aviro-muted">{u.email}</p>
                        <p className="text-xs text-aviro-muted">{u.collegeName}</p>
                      </div>
                    </div>
                    <GenderBadge gender={u.gender} />
                  </div>
                  {u.collegeIdPicUrl && (
                    <img src={`http://localhost:8080${u.collegeIdPicUrl}`} alt="College ID"
                      className="w-full max-h-64 object-contain rounded-xl border border-aviro-border bg-aviro-card2 mb-4" />
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(u.id)} disabled={processingId === u.id}
                      className="flex-1 bg-aviro-green text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90 disabled:opacity-50">
                      {processingId === u.id ? 'Processing...' : '✅ Approve'}
                    </button>
                    <button onClick={() => handleReject(u.id)} disabled={processingId === u.id}
                      className="flex-1 bg-red-500/10 text-red-400 border border-red-500/30 font-bold py-2.5 rounded-xl text-sm hover:bg-red-500/20 disabled:opacity-50">
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VEHICLE TAB ── */}
      {tab === 'vehicle' && (
        <div>
          <h2 className="font-bold text-lg mb-3">⏳ Pending Vehicles ({pendingVehicles.length})</h2>
          {pendingVehicles.length === 0 ? (
            <div className="card p-8 text-center text-aviro-muted text-sm">
              <div className="text-3xl mb-2">✅</div>No pending vehicle verifications!
            </div>
          ) : (
            <div className="space-y-4">
              {pendingVehicles.map(v => (
                <div key={v.vehicleId} className="card p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">
                        {v.vehicleType === 'CAR' ? '🚗' : v.vehicleType === 'BIKE' ? '🏍️' : v.vehicleType === 'SCOOTY' ? '🛵' : v.vehicleType === 'AUTO' ? '🛺' : '🚐'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{v.make} {v.model} · {v.color}</p>
                        <p className="text-xs text-aviro-muted">Reg: {v.registrationNumber}</p>
                        <p className="text-xs text-aviro-muted">{v.totalSeats} seats · {v.vehicleType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-aviro-orange font-semibold">⏳ Pending</p>
                    </div>
                  </div>

                  {/* Owner info */}
                  <div className="bg-aviro-card2 rounded-xl p-3 mb-4">
                    <p className="text-xs text-aviro-muted">Owner</p>
                    <p className="text-sm font-semibold">{v.ownerName}</p>
                    <p className="text-xs text-aviro-muted">{v.ownerEmail} · {v.collegeName}</p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => handleVehicleApprove(v.vehicleId)} disabled={processingId === v.vehicleId}
                      className="flex-1 bg-aviro-green text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90 disabled:opacity-50">
                      {processingId === v.vehicleId ? 'Processing...' : '✅ Approve Vehicle'}
                    </button>
                    <button onClick={() => handleVehicleReject(v.vehicleId)} disabled={processingId === v.vehicleId}
                      className="flex-1 bg-red-500/10 text-red-400 border border-red-500/30 font-bold py-2.5 rounded-xl text-sm hover:bg-red-500/20 disabled:opacity-50">
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
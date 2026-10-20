import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Spinner, GenderBadge } from '../components/common/UIComponents';
import toast from 'react-hot-toast';

// The image endpoint needs the JWT, which a plain <img src> or link can't send.
// Fetch it through the api client (adds the token) and show it as a blob URL.
function CollegeIdImage({ url, onExpand }) {
  const [src, setSrc]     = useState(null);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    setSrc(null);
    setError(null);
    // Stored as "/api/users/..."; the api client already has the /api base
    api.get(url.replace(/^\/api/, ''), { responseType: 'blob' })
      .then(res => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.response?.status === 404
          ? 'Image file not found on server. Ask the user to upload again.'
          : 'Image not loading');
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, retry]);

  if (error) {
    return (
      <div className="bg-aviro-card2 rounded-xl border border-aviro-border p-4 flex items-center justify-center gap-2">
        <span className="text-2xl">🖼️</span>
        <div>
          <p className="text-xs text-aviro-muted">{error}</p>
          <button type="button" onClick={() => setRetry(r => r + 1)}
            className="text-xs text-aviro-orange hover:underline">
            Try again →
          </button>
        </div>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="bg-aviro-card2 rounded-xl border border-aviro-border p-6 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt="College ID"
        className="w-full max-h-64 object-contain rounded-xl border border-aviro-border bg-aviro-card2 cursor-zoom-in hover:opacity-90 transition-opacity"
        onClick={() => onExpand(src)}
      />
      <p className="text-xs text-aviro-muted mt-1 text-center">
        Tap image to view full size
      </p>
    </>
  );
}

export default function AdminPage() {
  const [pending, setPending]               = useState([]);
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [stats, setStats]                   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [processingId, setProcessingId]     = useState(null);
  const [tab, setTab]                       = useState('college');
  const [expandedImg, setExpandedImg]       = useState(null); // fullscreen image

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

      {/* Fullscreen image modal */}
      {expandedImg && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImg(null)}
        >
          <div className="relative max-w-2xl w-full">
            <img src={expandedImg} alt="College ID Full"
              className="w-full rounded-2xl object-contain max-h-[80vh]"/>
            <button onClick={() => setExpandedImg(null)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg">
              ✕
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">Tap anywhere to close</p>
          </div>
        </div>
      )}

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

                  {/* College ID image (loaded with the admin's token) */}
                  {u.collegeIdPicUrl ? (
                    <div className="mb-4">
                      <p className="text-xs text-aviro-muted mb-2">📷 Uploaded College ID:</p>
                      <CollegeIdImage url={u.collegeIdPicUrl} onExpand={setExpandedImg} />
                    </div>
                  ) : (
                    <div className="mb-4 bg-aviro-card2 rounded-xl p-4 text-center text-aviro-muted text-sm">
                      <span className="text-2xl block mb-1">📷</span>
                      No image uploaded yet
                    </div>
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
                        {v.vehicleType === 'CAR'    ? '🚗' :
                         v.vehicleType === 'BIKE'   ? '🏍️' :
                         v.vehicleType === 'SCOOTY' ? '🛵' :
                         v.vehicleType === 'AUTO'   ? '🛺' : '🚐'}
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

                  <div className="bg-aviro-card2 rounded-xl p-3 mb-4">
                    <p className="text-xs text-aviro-muted mb-1">Owner</p>
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
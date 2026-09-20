import React, { useState, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8080';

export default function CollegeIdUpload({ user, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult]       = useState(null);
  const fileRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setPreview(URL.createObjectURL(file));
    setResult(null);
    handleUpload(file);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    setVerifying(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      toast('🤖 AI verifying your college ID...', { icon: '⏳', duration: 5000 });

      const res = await api.post('/users/upload-college-id', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 sec for Gemini API
      });

      const msg = res.data?.message || res.data?.data || '';
      setResult(msg);

      if (msg.includes('✅') || msg.toLowerCase().includes('verified')) {
        toast.success('✅ College ID verified automatically!');
      } else if (msg.includes('❌') || msg.toLowerCase().includes('invalid')) {
        toast.error(msg);
        setPreview(null);
      } else {
        toast('⏳ ID uploaded! Pending admin review.', { icon: '📋' });
      }

      onUploaded && onUploaded();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Upload failed. Try again!';
      toast.error(errMsg);
      setPreview(null);
      setResult(null);
    } finally {
      setUploading(false);
      setVerifying(false);
    }
  };

  // ── Already verified ──
  if (user?.isCollegeVerified) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold mb-3">🎓 College ID Verification</h3>
        <div className="flex items-center gap-3 bg-aviro-green/10 border border-aviro-green/20 rounded-xl p-4">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-aviro-green">College ID Verified!</p>
            <p className="text-xs text-aviro-muted">You can book and offer rides on AVIRO</p>
          </div>
        </div>
        {user?.collegeIdPicUrl && (
          <div className="mt-3">
            <button onClick={() => {}} className="text-xs text-aviro-muted">
              <img
                src={`${BASE_URL}${user.collegeIdPicUrl}`}
                alt="College ID"
                className="w-full max-h-40 object-contain rounded-xl border border-aviro-border bg-aviro-card2 mt-2"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-1">🎓 College ID Verification</h3>
      <p className="text-aviro-muted text-sm mb-3">
        Upload your college ID — our AI verifies it instantly!
      </p>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
        <p className="text-yellow-400 text-xs font-semibold">
          ⚠️ College ID verification required to book or offer rides
        </p>
      </div>

      {/* Already uploaded but not verified */}
      {user?.collegeIdPicUrl && !user?.isCollegeVerified && !preview && (
        <div className="space-y-3 mb-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <p className="text-sm font-semibold text-yellow-400">Pending Verification</p>
              <p className="text-xs text-aviro-muted">Admin will review your ID shortly</p>
            </div>
          </div>
          <img
            src={`${BASE_URL}${user.collegeIdPicUrl}`}
            alt="Uploaded College ID"
            className="w-full max-h-48 object-contain rounded-xl border border-aviro-border bg-aviro-card2"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Upload area */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${uploading
            ? 'border-aviro-orange/50 bg-aviro-orange/5'
            : 'border-aviro-border hover:border-aviro-orange/50 hover:bg-aviro-orange/5'}`}
      >
        {verifying ? (
          <div className="space-y-3">
            {preview && (
              <img src={preview} alt="Preview" className="max-h-36 mx-auto rounded-lg opacity-70"/>
            )}
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-aviro-orange/30 border-t-aviro-orange rounded-full animate-spin"/>
              <p className="text-sm text-aviro-orange font-semibold">🤖 AI verifying your ID...</p>
            </div>
            <p className="text-xs text-aviro-muted">This may take 5-10 seconds</p>
          </div>
        ) : preview ? (
          <div className="space-y-2">
            <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg"/>
            <p className="text-xs text-aviro-muted">Click to upload a different photo</p>
          </div>
        ) : (
          <>
            <div className="text-4xl mb-3">📷</div>
            <p className="text-sm text-white font-semibold">Tap to upload College ID</p>
            <p className="text-xs text-aviro-muted mt-1">JPG, PNG up to 10MB</p>
            <div className="mt-3 flex items-center justify-center gap-2 bg-aviro-orange/10 border border-aviro-orange/20 rounded-lg px-3 py-2">
              <span>🤖</span>
              <p className="text-xs text-aviro-orange font-medium">AI auto-verifies instantly</p>
            </div>
          </>
        )}
      </div>

      {/* Result message */}
      {result && !verifying && (
        <div className={`mt-3 rounded-xl p-3 text-sm font-medium
          ${result.includes('✅') ? 'bg-aviro-green/10 border border-aviro-green/20 text-aviro-green'
          : result.includes('❌') ? 'bg-red-500/10 border border-red-500/20 text-red-400'
          : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'}`}>
          {result}
        </div>
      )}

      {user?.collegeIdPicUrl && !preview && (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full mt-3 text-xs text-aviro-orange border border-aviro-orange/30 py-2 rounded-xl hover:bg-aviro-orange/10 transition-colors">
          📷 Upload a different photo
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
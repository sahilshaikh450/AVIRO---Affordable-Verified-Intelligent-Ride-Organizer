import React, { useState, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function CollegeIdUpload({ user, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(null);
  const [verifying, setVerifying] = useState(false);
  const fileRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setPreview(URL.createObjectURL(file));
    handleUpload(file);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    setVerifying(false);
    const formData = new FormData();
    formData.append('file', file);

    try {
      toast('📤 Uploading ID...', { icon: '⏳' });
      setVerifying(true);
      const res = await api.post('/users/upload-college-id', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const msg = res.data.message || '';
      if (msg.includes('✅')) {
        toast.success(msg);
      } else {
        toast(msg, { icon: '⏳' });
      }
      onUploaded && onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
      setPreview(null);
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
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-1">🎓 College ID Verification</h3>
      <p className="text-aviro-muted text-sm mb-1">
        Upload your college ID card — our AI will verify it instantly!
      </p>

      {/* ⚠️ Important warning */}
      {!user?.isCollegeVerified && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
          <p className="text-yellow-400 text-xs font-semibold">
            ⚠️ College ID verification required to book or offer rides
          </p>
        </div>
      )}

      {user?.collegeIdPicUrl && !user?.isCollegeVerified ? (
        <div className="space-y-3">
          {/* AI verifying state */}
          {verifying ? (
            <div className="bg-aviro-card2 border border-aviro-orange/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-aviro-orange/30 border-t-aviro-orange rounded-full animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-aviro-orange">🤖 AI is verifying your ID...</p>
                <p className="text-xs text-aviro-muted">This takes a few seconds</p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="text-sm font-semibold text-yellow-400">Pending Verification</p>
                <p className="text-xs text-aviro-muted">Admin will review your ID</p>
              </div>
            </div>
          )}

          <img
            src={`http://localhost:8080${user.collegeIdPicUrl}`}
            alt="College ID"
            className="w-full max-h-48 object-contain rounded-xl border border-aviro-border bg-aviro-card2"
          />
          <button onClick={() => fileRef.current?.click()}
            className="text-xs text-aviro-orange hover:underline">
            Upload a different photo
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          className="border-2 border-dashed border-aviro-border rounded-xl p-8 text-center cursor-pointer hover:border-aviro-orange/50 transition-colors"
        >
          {preview ? (
            <div className="space-y-2">
              <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
              {verifying && (
                <div className="flex items-center justify-center gap-2 text-aviro-orange text-sm">
                  <div className="w-4 h-4 border-2 border-aviro-orange/30 border-t-aviro-orange rounded-full animate-spin" />
                  🤖 AI verifying...
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm text-white font-medium">Tap to upload College ID</p>
              <p className="text-xs text-aviro-muted mt-1">JPG, PNG up to 10MB</p>
              <p className="text-xs text-aviro-orange mt-2 font-medium">🤖 AI auto-verifies instantly</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {uploading && !verifying && (
        <div className="flex items-center gap-2 mt-3 text-sm text-aviro-orange">
          <div className="w-4 h-4 border-2 border-aviro-orange/30 border-t-aviro-orange rounded-full animate-spin" />
          Uploading...
        </div>
      )}
    </div>
  );
}
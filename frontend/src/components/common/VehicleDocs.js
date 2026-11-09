import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import PrivatePhoto from './PrivatePhoto';
import Icon from './Icon';

const DOCS = [
  {
    kind: 'plate',
    field: 'platePhotoUrl',
    icon: '🔢',
    title: 'Number plate',
    hint: 'Clear photo of the plate on your vehicle',
  },
  {
    kind: 'licence',
    field: 'licencePhotoUrl',
    icon: '🪪',
    title: 'Driving licence',
    hint: 'Front side, name and photo visible',
  },
];

export default function VehicleDocs({ vehicle, onChanged }) {
  const inputs = useRef({});
  const [busy, setBusy] = useState(null);

  const upload = async (kind, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please choose a JPG, PNG or WEBP photo');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5 MB');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    setBusy(kind);
    try {
      const res = await api.post(`/users/vehicle/photo/${kind}`, form);
      toast.success(res.data?.message || 'Photo uploaded');
      onChanged && onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    }
    setBusy(null);
  };

  const both = vehicle.platePhotoUrl && vehicle.licencePhotoUrl;
  const status =
    vehicle.isVerified && both
      ? {
          cls: 'bg-aviro-green/10 border-aviro-green/20 text-aviro-green',
          text: '✓ Verified. You can offer rides.',
        }
      : both
        ? {
            cls: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600',
            text: '⏳ An admin is checking your photos.',
          }
        : {
            cls: 'bg-aviro-orange/10 border-aviro-orange/20 text-aviro-orange',
            text: 'Upload both photos to get verified and start offering rides.',
          };

  return (
    <div className="space-y-3 mb-3" data-testid="vehicle-docs">
      <p className={`text-xs font-semibold border rounded-xl px-3 py-2 ${status.cls}`}>
        {status.text}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {DOCS.map((d) => (
          <button
            key={d.kind}
            type="button"
            disabled={busy === d.kind}
            onClick={() => inputs.current[d.kind]?.click()}
            className="text-left bg-aviro-card2 border border-dashed border-aviro-border rounded-xl p-3 hover:border-aviro-orange/50 transition-colors disabled:opacity-60"
          >
            {vehicle[d.field] ? (
              <PrivatePhoto
                url={vehicle[d.field]}
                alt={d.title}
                className="w-full h-24 object-cover rounded-lg mb-2"
              />
            ) : (
              <div className="w-full h-24 rounded-lg mb-2 bg-aviro-card flex items-center justify-center text-3xl">
                <Icon e={d.icon} />
              </div>
            )}
            <p className="text-sm font-semibold">{d.title}</p>
            <p className="text-[11px] text-aviro-muted leading-snug">
              {busy === d.kind ? 'Uploading…' : vehicle[d.field] ? 'Tap to replace' : d.hint}
            </p>
            <input
              ref={(el) => {
                inputs.current[d.kind] = el;
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                upload(d.kind, e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

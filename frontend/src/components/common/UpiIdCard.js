import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Icon from './Icon';

const UPI_PATTERN = /^[a-z0-9._-]{2,64}@[a-z][a-z0-9]{1,30}$/;

export default function UpiIdCard({ user, onSaved }) {
  const [value, setValue] = useState(user?.upiId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(user?.upiId || '');
  }, [user?.upiId]);

  const cleaned = value.trim().toLowerCase();
  const invalid = cleaned !== '' && !UPI_PATTERN.test(cleaned);
  const unchanged = cleaned === (user?.upiId || '');

  const save = async (e) => {
    e.preventDefault();
    if (invalid) return;
    setSaving(true);
    try {
      await api.put('/users/profile', { upiId: cleaned });
      toast.success(cleaned ? 'UPI ID saved ✅ Riders can now pay you by UPI' : 'UPI ID removed');
      onSaved && onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the UPI ID');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">
          <Icon e="💳" /> Get paid by UPI
        </h3>
        {user?.upiId ? (
          <span className="text-xs bg-aviro-green/10 text-aviro-green px-2 py-0.5 rounded-full font-semibold">
            Added
          </span>
        ) : (
          <span className="text-xs bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full font-semibold">
            Not added
          </span>
        )}
      </div>
      <p className="text-xs text-aviro-muted">
        Riders pay to this UPI ID after the trip. Find it in GPay, PhonePe or Paytm under your
        profile.
      </p>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="yourname@okaxis"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        inputMode="email"
        aria-label="UPI ID"
        className={`input-field ${invalid ? 'border-red-500/60' : ''}`}
      />
      {invalid && (
        <p className="text-xs text-red-600">
          That doesn't look like a UPI ID. It should be like yourname@okaxis
        </p>
      )}
      <button
        type="submit"
        disabled={saving || invalid || unchanged}
        className="w-full btn-primary disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save UPI ID'}
      </button>
    </form>
  );
}

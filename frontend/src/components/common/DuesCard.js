import React, { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const rupees = (n) => `₹${Number(n || 0) % 1 === 0 ? Number(n || 0) : Number(n).toFixed(2)}`;
const STATUS = {
  PENDING:   { text: 'Checking', cls: 'text-yellow-400' },
  CONFIRMED: { text: 'Received', cls: 'text-aviro-green' },
  REJECTED:  { text: 'Not found', cls: 'text-red-400' },
};

// Driver's AVIRO fee balance: what's owed from completed rides, and paying it by UPI
export default function DuesCard() {
  const [dues, setDues]       = useState(null);
  const [paying, setPaying]   = useState(false);
  const [amount, setAmount]   = useState('');
  const [reference, setRef]   = useState('');
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    api.get('/dues/my').then(res => setDues(res.data.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!dues) return null;

  const upiLink = dues.upiId && Number(amount) > 0
    ? `upi://pay?pa=${encodeURIComponent(dues.upiId)}&pn=${encodeURIComponent(dues.upiName)}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent('AVIRO fees')}`
    : null;
  const usedPct = Math.min(100, Math.round((dues.due / dues.limit) * 100));

  const startPaying = () => { setAmount(String(dues.due)); setRef(''); setPaying(true); };

  const submit = async () => {
    setSaving(true);
    try {
      const res = await api.post('/dues/payments', { amount: Number(amount), reference });
      toast.success(res.data?.message || 'Payment submitted');
      setDues(res.data.data);
      setPaying(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit the payment');
    }
    setSaving(false);
  };

  return (
    <div className="card p-5 space-y-3" data-testid="dues-card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">💳 AVIRO fees</h3>
        <span className="text-xs text-aviro-muted">{rupees(dues.feePerSeat)} per seat booked</span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-aviro-muted">To pay</p>
          <p className={`text-2xl font-bold ${dues.blocked ? 'text-red-400' : 'text-white'}`}>{rupees(dues.due)}</p>
        </div>
        <p className="text-xs text-aviro-muted text-right">Limit {rupees(dues.limit)}<br />before new rides are paused</p>
      </div>
      <div className="h-2 rounded-full bg-aviro-card2 overflow-hidden">
        <div className={`h-full ${dues.blocked ? 'bg-red-500' : 'bg-aviro-orange'}`} style={{ width: `${usedPct}%` }} />
      </div>

      {dues.blocked && (
        <p className="text-xs text-red-400">You can't post new rides until you pay your fees.</p>
      )}
      {dues.awaitingConfirmation > 0 && (
        <p className="text-xs text-yellow-400">⏳ {rupees(dues.awaitingConfirmation)} paid, waiting for confirmation.</p>
      )}

      {!paying && dues.due > 0 && (
        <button onClick={startPaying} className="w-full btn-primary">Pay {rupees(dues.due)}</button>
      )}
      {dues.due === 0 && dues.totalFees > 0 && !dues.awaitingConfirmation && (
        <p className="text-xs text-aviro-green">✅ All fees paid. Thank you!</p>
      )}
      {dues.totalFees === 0 && (
        <p className="text-xs text-aviro-muted">Fees are added after each completed ride. Nothing to pay yet.</p>
      )}

      {paying && (
        <div className="space-y-3 border-t border-aviro-border pt-3">
          <div>
            <label className="text-xs text-aviro-muted block mb-1">Amount</label>
            <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="input-field" />
          </div>
          {dues.upiId ? (
            <>
              <p className="text-xs text-aviro-muted">Pay to <span className="font-mono text-white">{dues.upiId}</span></p>
              {upiLink && (
                <div className="flex flex-col items-center gap-2">
                  <a href={upiLink} className="w-full text-center bg-gradient-to-r from-aviro-green to-emerald-500 text-white font-bold py-3 rounded-xl text-sm">
                    📱 Open UPI app & pay {rupees(amount)}
                  </a>
                  <div className="bg-white p-2 rounded-xl"><QRCodeSVG value={upiLink} size={120} /></div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-yellow-400">Payment details aren't set up yet. Please contact AVIRO support.</p>
          )}
          <input value={reference} onChange={e => setRef(e.target.value.replace(/\s/g, ''))}
            placeholder="UPI transaction ID / UTR" className="input-field text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setPaying(false)} className="flex-1 bg-aviro-card2 border border-aviro-border text-aviro-muted py-2.5 rounded-xl text-sm">Cancel</button>
            <button onClick={submit} disabled={saving || !(Number(amount) > 0)} className="flex-1 btn-primary disabled:opacity-50">
              {saving ? 'Submitting…' : "✅ I've paid"}
            </button>
          </div>
        </div>
      )}

      {dues.payments?.length > 0 && (
        <div className="border-t border-aviro-border pt-3 space-y-1">
          <p className="text-xs text-aviro-muted">Recent payments</p>
          {dues.payments.map(p => (
            <div key={p.id} className="flex justify-between text-xs">
              <span>{rupees(p.amount)} · {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              <span className={STATUS[p.status]?.cls}>{STATUS[p.status]?.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

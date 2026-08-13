import React from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createRide } from '../store/rideSlice';
import LocationInput from '../components/common/LocationInput';
import toast from 'react-hot-toast';

export default function OfferRidePage() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { totalSeats: '1', womenOnly: false, isRecurring: false }
  });
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user }  = useSelector(s => s.auth);
  const { loading } = useSelector(s => s.rides);
  const womenOnly   = watch('womenOnly');
  const isRecurring = watch('isRecurring');

  const [fromLocation, setFromLocation] = React.useState('');
  const [toLocation, setToLocation]     = React.useState('');

  const onSubmit = async (data) => {
    if (!fromLocation || !toLocation) {
      toast.error('Please select From and To locations');
      return;
    }
    const payload = {
      ...data,
      fromLocation,
      toLocation,
      fromLat: 18.5204,
      fromLng: 73.8567,
      toLat:   18.5204,
      toLng:   73.8567,
      totalSeats:   parseInt(data.totalSeats),
      pricePerSeat: parseFloat(data.pricePerSeat),
      womenOnly:    !!data.womenOnly,
      isRecurring:  !!data.isRecurring,
      departureTime: new Date(data.departureTime).toISOString(),
    };
    const res = await dispatch(createRide(payload));
    if (!res.error) {
      toast.success('Ride posted successfully! 🏍️');
      navigate('/my-rides');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display font-bold text-2xl mb-1">Offer a Ride 🏍️</h1>
        <p className="text-aviro-muted text-sm">Post your ride and earn while going to college</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Route */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider">📍 Route</h3>

          <LocationInput
            label="From (Pickup)"
            icon="🟠"
            placeholder="Your home / starting point..."
            value={fromLocation}
            onChange={setFromLocation}
            required
          />

          {/* Swap */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => { const t = fromLocation; setFromLocation(toLocation); setToLocation(t); }}
              className="flex items-center gap-2 text-xs text-aviro-muted hover:text-aviro-orange transition-colors bg-aviro-card2 border border-aviro-border px-3 py-1.5 rounded-full"
            >
              ⇅ Swap
            </button>
          </div>

          <LocationInput
            label="To (Destination)"
            icon="🟢"
            placeholder="College / destination..."
            value={toLocation}
            onChange={setToLocation}
            required
          />

          <div>
            <label className="text-xs text-aviro-muted font-medium block mb-1.5 uppercase tracking-wider">🕐 Departure Time</label>
            <input
              {...register('departureTime', { required: 'Required' })}
              type="datetime-local"
              className="input-field"
            />
            {errors.departureTime && <p className="text-red-400 text-xs mt-1">{errors.departureTime.message}</p>}
          </div>
        </div>

        {/* Seats & Price */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider">💺 Seats & Fare</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-aviro-muted font-medium block mb-1.5 uppercase tracking-wider">Available Seats</label>
              <select {...register('totalSeats')} className="input-field">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} seat{n>1?'s':''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-aviro-muted font-medium block mb-1.5 uppercase tracking-wider">Price per Seat (₹)</label>
              <input
                {...register('pricePerSeat', { required: 'Required', min: { value: 5, message: 'Min ₹5' } })}
                type="number"
                step="0.5"
                placeholder="28"
                className="input-field"
              />
              {errors.pricePerSeat && <p className="text-red-400 text-xs mt-1">{errors.pricePerSeat.message}</p>}
            </div>
          </div>

          <div className="bg-aviro-orange/5 border border-aviro-orange/20 rounded-xl p-3 text-xs text-aviro-orange flex gap-2">
            <span>🤖</span>
            <span>AI tip: For Pune college routes, ₹20–₹45 per seat is the typical range.</span>
          </div>
        </div>

        {/* Vehicle */}
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider">🚗 Vehicle Type</h3>
          <div className="grid grid-cols-5 gap-2">
            {[
              { value: 'BIKE',   label: '🏍️', name: 'Bike'   },
              { value: 'SCOOTY', label: '🛵', name: 'Scooty' },
              { value: 'CAR',    label: '🚗', name: 'Car'    },
              { value: 'AUTO',   label: '🛺', name: 'Auto'   },
              { value: 'VAN',    label: '🚐', name: 'Van'    },
            ].map(v => (
              <label key={v.value}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${watch('vehicleType') === v.value ? 'border-aviro-orange bg-aviro-orange/5' : 'border-aviro-border hover:border-aviro-orange/40'}`}>
                <input {...register('vehicleType')} type="radio" value={v.value} className="hidden" />
                <span className="text-2xl">{v.label}</span>
                <span className="text-xs font-medium text-aviro-muted">{v.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider">⚙️ Preferences</h3>

          <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
            ${womenOnly ? 'border-pink-500/40 bg-pink-500/5' : 'border-aviro-border'}`}>
            <input {...register('womenOnly')} type="checkbox" className="hidden" />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-all
              ${womenOnly ? 'bg-pink-500 border-pink-500 text-white' : 'border-aviro-border'}`}>
              {womenOnly && '✓'}
            </div>
            <div>
              <p className="font-medium text-sm text-pink-400">🚺 Women-only ride</p>
              <p className="text-xs text-aviro-muted">Only female riders can book this ride</p>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
            ${isRecurring ? 'border-aviro-blue/40 bg-aviro-blue/5' : 'border-aviro-border'}`}>
            <input {...register('isRecurring')} type="checkbox" className="hidden" />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-all
              ${isRecurring ? 'bg-aviro-blue border-aviro-blue text-white' : 'border-aviro-border'}`}>
              {isRecurring && '✓'}
            </div>
            <div>
              <p className="font-medium text-sm text-aviro-blue">🔁 Recurring ride</p>
              <p className="text-xs text-aviro-muted">Repeat this ride on selected days</p>
            </div>
          </label>

          {isRecurring && (
            <div>
              <label className="text-xs text-aviro-muted font-medium block mb-1.5">Repeat on days</label>
              <input
                {...register('recurringDays')}
                placeholder="e.g. MON,TUE,WED,THU,FRI"
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-aviro-muted font-medium block mb-1.5">Notes (optional)</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="e.g. Will wait 5 min at gate 2..."
              className="input-field resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
        >
          {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? 'Posting...' : '🚀 Post Ride'}
        </button>
      </form>
    </div>
  );
}
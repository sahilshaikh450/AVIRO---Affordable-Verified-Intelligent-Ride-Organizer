import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { searchRides } from '../store/rideSlice';
import { createBooking } from '../store/bookingSlice';
import { RideCard, EmptyState, Spinner } from '../components/common/UIComponents';
import LocationInput from '../components/common/LocationInput';
import toast from 'react-hot-toast';

export default function SearchRidePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, loading } = useSelector(s => s.rides);
  const { user } = useSelector(s => s.auth);

  const [form, setForm] = useState({
    fromLocation: '',
    toLocation: '',
    seatsNeeded: 1,
    womenOnly: false,
    driverGender: '',
  });
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!form.fromLocation || !form.toLocation) {
      toast.error('Please enter From and To locations');
      return;
    }
    setSearched(true);
    dispatch(searchRides({
      fromLocation: form.fromLocation,
      toLocation:   form.toLocation,
      seatsNeeded:  form.seatsNeeded,
      womenOnly:    form.womenOnly,
      driverGender: form.driverGender || null,
      departureTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    }));
  };

  const handleBook = async (ride) => {
    const res = await dispatch(createBooking({ rideId: ride.id, seatsBooked: 1 }));
    if (!res.error) {
      toast.success('Booking request sent! ✅');
      navigate('/bookings');
    } else {
      toast.error(res.payload || 'Booking failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display font-bold text-2xl mb-1">Find a Ride 🔍</h1>
        <p className="text-aviro-muted text-sm">Search rides on your college route</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="card p-5 space-y-4">

        {/* From - To */}
        <div className="grid md:grid-cols-2 gap-4">
          <LocationInput
            label="From"
            icon="🟠"
            placeholder="Kothrud, Shivajinagar..."
            value={form.fromLocation}
            onChange={val => setForm({ ...form, fromLocation: val })}
            required
          />
          <LocationInput
            label="To"
            icon="🟢"
            placeholder="COEP, MIT Pune, FC Road..."
            value={form.toLocation}
            onChange={val => setForm({ ...form, toLocation: val })}
            required
          />
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setForm({ ...form, fromLocation: form.toLocation, toLocation: form.fromLocation })}
            className="flex items-center gap-2 text-xs text-aviro-muted hover:text-aviro-orange transition-colors bg-aviro-card2 border border-aviro-border px-3 py-1.5 rounded-full"
          >
            ⇅ Swap Locations
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-aviro-muted font-medium block mb-1.5 uppercase tracking-wider">💺 Seats</label>
            <select
              value={form.seatsNeeded}
              onChange={e => setForm({ ...form, seatsNeeded: +e.target.value })}
              className="input-field"
            >
              {[1,2,3,4].map(n => <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-aviro-muted font-medium block mb-1.5 uppercase tracking-wider">👤 Driver Gender</label>
            <select
              value={form.driverGender}
              onChange={e => setForm({ ...form, driverGender: e.target.value })}
              className="input-field"
            >
              <option value="">Any</option>
              <option value="MALE">👨 Male</option>
              <option value="FEMALE">👩 Female</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer w-full transition-all
              ${form.womenOnly ? 'border-pink-500/50 bg-pink-500/5' : 'border-aviro-border'}`}>
              <input
                type="checkbox"
                checked={form.womenOnly}
                onChange={e => setForm({ ...form, womenOnly: e.target.checked })}
                className="hidden"
              />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs transition-all
                ${form.womenOnly ? 'bg-pink-500 border-pink-500 text-white' : 'border-aviro-border'}`}>
                {form.womenOnly && '✓'}
              </div>
              <span className="text-xs font-medium text-pink-400">🚺 Women-only</span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : '🔍'}
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      {searched && (
        <div>
          <p className="text-aviro-muted text-sm mb-3">
            {loading ? 'Searching...' : `${list.length} ride${list.length !== 1 ? 's' : ''} found`}
            {form.fromLocation && form.toLocation && !loading &&
              <span className="ml-2 text-white font-medium">
                {form.fromLocation} → {form.toLocation}
              </span>
            }
          </p>

          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : list.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {list.map(ride => (
                <RideCard
                  key={ride.id}
                  ride={ride}
                  onBook={() => handleBook(ride)}
                  onClick={() => navigate(`/rides/${ride.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="🔍"
              title="No rides found"
              subtitle={`No rides from ${form.fromLocation} to ${form.toLocation}. Try different locations or offer the first ride!`}
            />
          )}
        </div>
      )}
    </div>
  );
}
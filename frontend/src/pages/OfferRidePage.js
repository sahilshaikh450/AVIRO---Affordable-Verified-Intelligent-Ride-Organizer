import React from 'react'; 
import { useForm } from 'react-hook-form'; 
import { useDispatch, useSelector } from 'react-redux'; 
import { Link, useNavigate } from 'react-router-dom'; 
import { createRide } from '../store/rideSlice'; 
import LocationInput from '../components/common/LocationInput'; 
import toast from 'react-hot-toast'; 
import { geocodePlace, fetchRoute, PUNE_CENTRE } from '../utils/geo';
import api from '../services/api';
import { StudentsNeedRides } from '../components/common/RideAlerts';
import Icon from '../components/common/Icon';
 
// Rough petrol cost per km, one way
const PER_KM = { BIKE: 2.5, SCOOTY: 2.5, CAR: 7 };

// College hours, same as the server: departures from 06:00 up to 20:00
const inCollegeHours = (value) => {
  const time = (value || '').split('T')[1] || '';
  return time >= '06:00' && time <= '20:00';
};

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
  // Exact spots when picked with GPS; otherwise looked up from the name on submit
  const [fromPoint, setFromPoint] = React.useState(null);
  const [toPoint, setToPoint]     = React.useState(null);
  const pickFrom = (name, point = null) => { setFromLocation(name); setFromPoint(point); };
  const pickTo   = (name, point = null) => { setToLocation(name); setToPoint(point); };

  // Students waiting for rides (ride alerts), so drivers can offer what's needed
  const [requests, setRequests] = React.useState([]);
  React.useEffect(() => {
    api.get('/ride-requests/open').then(res => setRequests(res.data.data || [])).catch(() => {});
  }, []);
  const offerFor = (r) => {
    pickFrom(r.fromLocation);
    pickTo(r.toLocation);
    setValue('departureTime', String(r.desiredTime).slice(0, 16), { shouldValidate: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Route and time filled in. Add the trip cost and post!');
  };
  const [locating, setLocating]         = React.useState(false); 

  // Seats a vehicle can take: one pillion on a bike or scooty, up to four in a car
  const vehicleType = user?.vehicle?.vehicleType;
  const maxSeats = { BIKE: 1, SCOOTY: 1, CAR: 4 }[vehicleType] || 4;
  const seats = Math.min(maxSeats, parseInt(watch('totalSeats'), 10) || 1);

  // Cost split: the trip cost is shared equally by the driver and the riders
  const [tripCost, setTripCost] = React.useState('');
  const cost = Math.max(0, Math.round(Number(tripCost) || 0));
  const perSeat = cost > 0 ? Math.ceil(cost / (seats + 1)) : 0;
  React.useEffect(() => {
    setValue('pricePerSeat', perSeat || '', { shouldValidate: perSeat > 0 });
  }, [perSeat, setValue]);
  React.useEffect(() => {
    if (parseInt(watch('totalSeats'), 10) > maxSeats) setValue('totalSeats', String(maxSeats));
  }, [maxSeats, setValue, watch]);

  // Rough petrol cost from the road distance (₹ per km, one way)
  const [estimating, setEstimating] = React.useState(false);
  const [estimateNote, setEstimateNote] = React.useState('');
  const estimateCost = async () => {
    if (!fromLocation || !toLocation) { toast.error('Pick From and To first'); return; }
    setEstimating(true);
    const [from, to] = await Promise.all([fromPoint || geocodePlace(fromLocation), toPoint || geocodePlace(toLocation)]);
    const route = from && to ? await fetchRoute(from, to) : null;
    setEstimating(false);
    if (!route) { toast.error("Couldn't measure the route. Enter the cost yourself."); return; }
    const rate = PER_KM[vehicleType] || PER_KM.CAR;
    const estimate = Math.max(10, Math.round((route.distanceKm * rate) / 5) * 5);
    setTripCost(String(estimate));
    setEstimateNote(`About ${route.distanceKm.toFixed(1)} km × ₹${rate}/km. Change it if your cost is different.`);
  };
 
  const onSubmit = async (data) => { 
    if (!fromLocation || !toLocation) { 
      toast.error('Please select From and To locations'); 
      return; 
    } 

    if (new Date(data.departureTime) < new Date(Date.now() + 15 * 60 * 1000)) { 
      toast.error('Departure time must be at least 15 minutes from now.'); 
      return; 
    } 

    if (!inCollegeHours(data.departureTime)) {
      toast.error('Rides can leave only between 6:00 AM and 8:00 PM.');
      return;
    }
 
    // Real coordinates so maps and routes point to the right places (Pune centre if not found)
    setLocating(true);
    const [from, to] = await Promise.all([fromPoint || geocodePlace(fromLocation), toPoint || geocodePlace(toLocation)]);
    setLocating(false);
    const missing = [!from && fromLocation, !to && toLocation].filter(Boolean);
    if (missing.length) {
      toast(`Couldn't find ${missing.join(' and ')} on the map, so its pin may be off. Pick from the list for an exact spot.`, { icon: '📍', duration: 6000 });
    }

    const payload = { 
      ...data, 
      fromLocation, 
      toLocation, 
      fromLat: (from || PUNE_CENTRE).lat, 
      fromLng: (from || PUNE_CENTRE).lng, 
      toLat:   (to || PUNE_CENTRE).lat, 
      toLng:   (to || PUNE_CENTRE).lng, 
      totalSeats:   parseInt(data.totalSeats), 
      pricePerSeat: parseFloat(data.pricePerSeat), 
      womenOnly:    !!data.womenOnly, 
      isRecurring:  !!data.isRecurring, 
      // Send local (IST) time as typed; toISOString() converted it to UTC 
      departureTime: `${data.departureTime}:00`, 
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
        <h1 className="font-display font-bold text-2xl mb-1">Offer a Ride</h1> 
        <p className="text-aviro-muted text-sm">
          Going to college anyway? Share your empty seats and split the petrol cost.
        </p> 
      </div> 
 
      <StudentsNeedRides requests={requests} onOffer={offerFor} />

      {/* The ride goes out with the driver's own vehicle; it must be verified first */}
      {user && (() => {
        const v = user.vehicle;
        const verified = v && v.isVerified && v.platePhotoUrl && v.licencePhotoUrl;
        // While testing, the server lets unverified vehicles post rides
        const mustVerify = user.vehicleVerificationRequired !== false;
        const ready = v && (verified || !mustVerify);
        const icon = { BIKE: '🏍️', SCOOTY: '🛵', CAR: '🚗' }[v?.vehicleType] || '🚗';
        return ready ? (
          <div className="card p-4 flex items-center gap-3" data-testid="offer-vehicle">
            <span className="text-2xl"><Icon e={icon} /></span>
            <span className="flex-1 min-w-0">
              <span className="text-xs text-aviro-muted block">You're driving</span>
              <span className="font-semibold text-sm block truncate">{[v.make, v.model].filter(Boolean).join(' ') || v.vehicleType} · {v.registrationNumber}</span>
              {!verified && <span className="text-[11px] text-yellow-600 block">Not verified yet · allowed during testing</span>}
            </span>
            <Link to="/profile?tab=vehicle" className="text-xs text-aviro-orange font-semibold">Change</Link>
          </div>
        ) : (
          <Link to="/profile?tab=vehicle" className="card p-4 flex items-center gap-3 border-yellow-500/40 bg-yellow-500/5" data-testid="offer-vehicle">
            <span className="text-2xl"><Icon e={icon} /></span>
            <span className="flex-1 text-sm">
              <span className="font-semibold block text-yellow-700">{v ? 'Your vehicle is not verified yet' : 'Add your vehicle first'}</span>
              <span className="text-xs text-aviro-muted">{v ? 'Upload the number plate and licence photos. You can post rides once an admin approves them.' : 'Add your bike or car with number plate and licence photos to offer rides.'}</span>
            </span>
            <span className="text-aviro-orange text-sm">→</span>
          </Link>
        );
      })()}

      {/* Without a UPI ID riders can only pay cash */}
      {user && !user.upiId && (
        <Link to="/profile" className="card p-4 flex items-center gap-3 border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/60">
          <span className="text-2xl"><Icon e="💳" /></span>
          <span className="flex-1 text-sm">
            <span className="font-semibold block">Add your UPI ID to get paid</span>
            <span className="text-xs text-aviro-muted">Riders can only pay you cash until you add it in Profile.</span>
          </span>
          <span className="text-aviro-orange text-sm">→</span>
        </Link>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5"> 
 
        {/* Route */} 
        <div className="card p-5 space-y-4"> 
          <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider">
            <Icon e="📍" /> Route
          </h3> 
 
          <LocationInput 
            label="From (Pickup)" 
            icon="🟠" 
            placeholder="Your home / starting point..." 
            value={fromLocation} 
            onChange={pickFrom} 
            allowCurrentLocation
            required 
          /> 
 
          {/* Swap */} 
          <div className="flex justify-center -my-2"> 
            <button 
              type="button" 
              onClick={() => { 
 
                const [name, point] = [fromLocation, fromPoint];
                pickFrom(toLocation, toPoint);
                pickTo(name, point);
              }} 
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
            onChange={pickTo} 
            allowCurrentLocation
            required 
          /> 
 
          <div> 
            <label className="text-xs text-aviro-muted font-medium block mb-1.5 uppercase tracking-wider">
              <Icon e="🕐" /> Departure Time
            </label> 
 
            <input 
              {...register('departureTime', { required: 'Required', validate: v => inCollegeHours(v) || 'Pick a time between 6:00 AM and 8:00 PM' })} 
              type="datetime-local" 
              className="input-field" 
            /> 
            {!errors.departureTime && (
              <p className="text-aviro-muted text-xs mt-1"><Icon e="🌙" /> Rides run from 6:00 AM to 8:00 PM (college hours)</p>
            )}
 
            {errors.departureTime && (
              <p className="text-red-600 text-xs mt-1">
                {errors.departureTime.message}
              </p>
            )} 
          </div> 
        </div> 
 
        {/* Seats & cost split */}
        <div className="card p-5 space-y-4" data-testid="cost-split">
          <div>
            <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider"><Icon e="💺" /> Seats & cost split</h3>
            <p className="text-xs text-aviro-muted mt-1">Enter what the trip costs you (petrol). It is split equally between you and your riders.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="seats" className="text-xs text-aviro-muted font-medium block mb-1.5 uppercase tracking-wider">Seats for riders</label>
              {maxSeats === 1 ? (
                <>
                  <input type="hidden" {...register('totalSeats')} value="1" />
                  <p className="input-field text-aviro-muted">1 seat (pillion)</p>
                </>
              ) : (
                <select id="seats" {...register('totalSeats')} className="input-field">
                  {Array.from({ length: maxSeats }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="trip-cost" className="text-xs text-aviro-muted font-medium block mb-1.5 uppercase tracking-wider">Trip cost (₹)</label>
              <input id="trip-cost" type="number" inputMode="numeric" min="0" step="1" placeholder="45"
                value={tripCost} onChange={e => setTripCost(e.target.value)} className="input-field" />
            </div>
          </div>
          <button type="button" onClick={estimateCost} disabled={estimating}
            className="text-xs font-semibold text-aviro-orange disabled:opacity-50">
            {estimating ? 'Measuring the route…' : '⛽ Estimate from the route distance'}
          </button>
          {estimateNote && <p className="text-[11px] text-aviro-muted -mt-2">{estimateNote}</p>}

          {/* The per-seat price the server stores; worked out from the cost */}
          <input type="hidden" {...register('pricePerSeat', {
            required: 'Enter the trip cost',
            min: { value: 5, message: 'Each share must be at least ₹5. Enter a higher trip cost.' },
          })} />

          {perSeat > 0 ? (
            <div className="rounded-xl bg-aviro-green/10 border border-aviro-green/25 p-4 space-y-1.5" data-testid="split-result">
              <p className="text-sm">
                ₹{cost} ÷ {seats + 1} people (you + {seats} rider{seats > 1 ? 's' : ''}) ={' '}
                <span className="text-aviro-green font-bold text-lg">₹{perSeat}</span> <span className="text-aviro-muted">per rider</span>
              </p>
              <p className="text-xs text-aviro-muted">
                You pay your own share (₹{Math.max(0, cost - perSeat * seats)}).
                {seats > 1 && ` If fewer riders book, each still pays ₹${perSeat}.`}
              </p>
            </div>
          ) : (
            <p className="text-xs text-aviro-muted bg-aviro-card2 rounded-xl p-3">Typical one-way college trip: ₹30–₹60 on a bike, ₹100–₹200 in a car.</p>
          )}
          {errors.pricePerSeat && <p className="text-red-600 text-xs">{errors.pricePerSeat.message}</p>}
        </div>

        {/* Preferences */} 
        <div className="card p-5 space-y-4"> 
          <h3 className="font-semibold text-sm text-aviro-muted uppercase tracking-wider">
            <Icon e="⚙️" /> Preferences
          </h3> 
 
          <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all 
            ${womenOnly 
              ? 'border-pink-500/40 bg-pink-500/5' 
              : 'border-aviro-border'}`}
          > 
            <input 
              {...register('womenOnly')} 
              type="checkbox" 
              className="hidden" 
            /> 
 
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-all 
              ${womenOnly 
                ? 'bg-pink-500 border-pink-500 text-white' 
                : 'border-aviro-border'}`}
            > 
              {womenOnly && '✓'} 
            </div> 
 
            <div> 
              <p className="font-medium text-sm text-pink-600">
                <Icon e="🚺" /> Women-only ride
              </p> 
              <p className="text-xs text-aviro-muted">
                Only female riders can book this ride
              </p> 
            </div> 
          </label> 
 
          <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all 
            ${isRecurring 
              ? 'border-aviro-blue/40 bg-aviro-blue/5' 
              : 'border-aviro-border'}`}
          > 
            <input 
              {...register('isRecurring')} 
              type="checkbox" 
              className="hidden" 
            /> 
 
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-all 
              ${isRecurring 
                ? 'bg-aviro-blue border-aviro-blue text-white' 
                : 'border-aviro-border'}`}
            > 
              {isRecurring && '✓'} 
            </div> 
 
            <div> 
              <p className="font-medium text-sm text-aviro-blue">
                <Icon e="🔁" /> Recurring ride
              </p> 
              <p className="text-xs text-aviro-muted">
                Repeat this ride on selected days
              </p> 
            </div> 
          </label> 
 
          {isRecurring && ( 
            <div> 
              <label className="text-xs text-aviro-muted font-medium block mb-1.5">
                Repeat on days
              </label> 
 
              <input 
                {...register('recurringDays')} 
                placeholder="e.g. MON,TUE,WED,THU,FRI" 
                className="input-field" 
              /> 
            </div> 
          )} 
 
          <div> 
            <label className="text-xs text-aviro-muted font-medium block mb-1.5">
              Notes (optional)
            </label> 
 
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
          disabled={loading || locating} 
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base" 
        > 
          {(loading || locating) && (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )} 
 
          {locating ? 'Finding places...' : loading ? 'Posting...' : '🚀 Post Ride'} 
        </button> 
      </form> 
    </div> 
  ); 
}
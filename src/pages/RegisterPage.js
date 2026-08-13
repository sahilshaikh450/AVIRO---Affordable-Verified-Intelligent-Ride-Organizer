import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../store/authSlice';

const COLLEGES = ['COEP Pune','VIT Pune','MIT Pune','Symbiosis Institute','PICT Pune','Fergusson College','Pune University','DYPIU','Bharati Vidyapeeth','NIBM','SCIT','Other'];

export default function RegisterPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { role: 'RIDER', gender: 'MALE' } });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector(s => s.auth);
  const [step, setStep] = useState(1);
  const role = watch('role');

  const onSubmit = async (data) => {
    const res = await dispatch(registerUser(data));
    if (!res.error) navigate('/verify-otp');
  };

  return (
    <div className="min-h-screen bg-aviro-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6 animate-fade-up">
          <h1 className="font-display font-bold text-3xl text-aviro-orange">Join AVIRO 🚀</h1>
          <p className="text-aviro-muted text-sm mt-1">Pune's College Ride Platform</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 px-2">
          {[1,2,3].map(s => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step >= s ? 'bg-aviro-orange text-white' : 'bg-aviro-card2 text-aviro-muted border border-aviro-border'}`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 transition-all ${step > s ? 'bg-aviro-orange' : 'bg-aviro-border'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="card p-6 animate-fade-up">
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* STEP 1 - Role & Personal */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">I am a...</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['RIDER','DRIVER','BOTH'].map(r => (
                    <label key={r} className={`relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${role === r ? 'border-aviro-orange bg-aviro-orange/5' : 'border-aviro-border hover:border-aviro-border/80'}`}>
                      <input {...register('role')} type="radio" value={r} className="absolute opacity-0" />
                      <span className="text-2xl mb-1">{r === 'RIDER' ? '🎒' : r === 'DRIVER' ? '🏍️' : '🤝'}</span>
                      <span className="text-sm font-semibold">{r === 'BOTH' ? 'Both' : r.charAt(0) + r.slice(1).toLowerCase()}</span>
                      <span className="text-xs text-aviro-muted text-center mt-0.5">
                        {r === 'RIDER' ? 'Find rides' : r === 'DRIVER' ? 'Offer rides' : 'Find & Offer'}
                      </span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['MALE','FEMALE','OTHER'].map(g => (
                      <label key={g} className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all
                        ${watch('gender') === g ? 'border-aviro-orange bg-aviro-orange/5 text-aviro-orange' : 'border-aviro-border text-aviro-muted'}`}>
                        <input {...register('gender')} type="radio" value={g} className="hidden" />
                        {g === 'MALE' ? '👨' : g === 'FEMALE' ? '👩' : '🧑'} {g.charAt(0) + g.slice(1).toLowerCase()}
                      </label>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={() => setStep(2)} className="btn-primary w-full">Next →</button>
              </div>
            )}

            {/* STEP 2 - Personal & College */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Your Details</h3>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Full Name</label>
                  <input {...register('fullName', { required: 'Name is required' })} placeholder="Rahul Patil" className="input-field" />
                  {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">College Email</label>
                  <input {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid' } })} type="email" placeholder="rahul@coep.ac.in" className="input-field" />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">College</label>
                  <select {...register('collegeName', { required: 'College required' })} className="input-field">
                    <option value="">Select your college</option>
                    {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.collegeName && <p className="text-red-400 text-xs mt-1">{errors.collegeName.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1.5">Department</label>
                    <input {...register('department')} placeholder="CSE" className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1.5">Year</label>
                    <select {...register('yearOfStudy')} className="input-field">
                      <option value="">Select</option>
                      {['1st Year','2nd Year','3rd Year','4th Year','PG'].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
                  <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">Next →</button>
                </div>
              </div>
            )}

            {/* STEP 3 - Location & Password */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Almost Done! 🎉</h3>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Your Area / Locality</label>
                  <input {...register('locality', { required: 'Locality required' })} placeholder="Shivajinagar, Kothrud..." className="input-field" />
                  {errors.locality && <p className="text-red-400 text-xs mt-1">{errors.locality.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Phone Number</label>
                  <input {...register('phone')} type="tel" placeholder="9876543210" className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">Password</label>
                  <input {...register('password', { required: 'Password required', minLength: { value: 6, message: 'Min 6 chars' } })} type="password" placeholder="••••••••" className="input-field" />
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div className="bg-aviro-orange/5 border border-aviro-orange/20 rounded-xl p-3 text-xs text-aviro-muted">
                  🎓 You'll receive an OTP on your email to verify your college identity
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">← Back</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {loading ? 'Creating...' : 'Create Account 🚀'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-aviro-muted text-sm mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-aviro-orange font-semibold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

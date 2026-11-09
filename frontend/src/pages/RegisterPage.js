import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../store/authSlice';

import { PUNE_COLLEGES } from '../utils/colleges';
import Icon from '../components/common/Icon';
import { GUIDELINES, GUIDELINES_VERSION, RISK_AGREEMENT } from '../content/guidelines';

const AGREEMENTS = [...GUIDELINES, RISK_AGREEMENT];

const NAME_RULE = { value: /^[\p{L} .'-]+$/u, message: 'Use letters only' };
const PHONE_RULE = {
  value: /^(\+91)?[6-9]\d{9}$/,
  message: 'Enter a valid 10-digit mobile number',
};
const PASSWORD_RULE = {
  value: /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/,
  message: 'At least 8 characters, with a letter and a number',
};

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm({ defaultValues: { role: 'RIDER', gender: 'MALE' } });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((s) => s.auth);
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState({});
  const allAgreed = AGREEMENTS.every((g) => agreed[g.id]);
  const role = watch('role');

  const STEP_FIELDS = {
    1: ['role', 'gender'],
    2: ['fullName', 'email', 'collegeName'],
    3: ['locality', 'phone', 'password'],
  };

  const goNext = async () => {
    if (await trigger(STEP_FIELDS[step])) setStep(step + 1);
  };

  const onSubmit = async (data) => {
    if (step < 4) {
      goNext();
      return;
    }
    if (!allAgreed) return;
    const res = await dispatch(
      registerUser({
        ...data,
        email: data.email.trim().toLowerCase(),
        acceptedGuidelines: true,
        guidelinesVersion: GUIDELINES_VERSION,
      })
    );
    if (!res.error) navigate(res.payload?.accessToken ? '/welcome' : '/verify-otp');
  };

  return (
    <div className="min-h-screen bg-aviro-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6 animate-fade-up">
          <h1 className="font-display font-bold text-3xl text-aviro-orange">Join AVIRO</h1>
          <p className="text-aviro-muted text-sm mt-1">Pune's College Ride Platform</p>
        </div>

        <div className="flex items-center gap-2 mb-6 px-2">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step >= s ? 'bg-aviro-orange text-white' : 'bg-aviro-card2 text-aviro-muted border border-aviro-border'}`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 4 && (
                <div
                  className={`flex-1 h-0.5 transition-all ${step > s ? 'bg-aviro-orange' : 'bg-aviro-border'}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="card p-6 animate-fade-up">
          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">I am a...</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['RIDER', 'DRIVER', 'BOTH'].map((r) => (
                    <label
                      key={r}
                      className={`relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${role === r ? 'border-aviro-orange bg-aviro-orange/5' : 'border-aviro-border hover:border-aviro-border/80'}`}
                    >
                      <input
                        {...register('role')}
                        type="radio"
                        value={r}
                        className="absolute opacity-0"
                      />
                      <span className="text-2xl mb-1">
                        <Icon e={r === 'RIDER' ? '🎒' : r === 'DRIVER' ? '🏍️' : '🤝'} />
                      </span>
                      <span className="text-sm font-semibold">
                        {r === 'BOTH' ? 'Both' : r.charAt(0) + r.slice(1).toLowerCase()}
                      </span>
                      <span className="text-xs text-aviro-muted text-center mt-0.5">
                        {r === 'RIDER'
                          ? 'Find rides'
                          : r === 'DRIVER'
                            ? 'Offer rides'
                            : 'Find & Offer'}
                      </span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">
                    Gender
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                      <label
                        key={g}
                        className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all
                        ${watch('gender') === g ? 'border-aviro-orange bg-aviro-orange/5 text-aviro-orange' : 'border-aviro-border text-aviro-muted'}`}
                      >
                        <input {...register('gender')} type="radio" value={g} className="hidden" />
                        {g.charAt(0) + g.slice(1).toLowerCase()}
                      </label>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={goNext} className="btn-primary w-full">
                  Next →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Your Details</h3>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">
                    Full Name
                  </label>
                  <input
                    {...register('fullName', {
                      required: 'Name is required',
                      minLength: { value: 2, message: 'Name is too short' },
                      maxLength: { value: 60, message: 'Name is too long' },
                      pattern: NAME_RULE,
                    })}
                    placeholder="Rahul Patil"
                    autoComplete="name"
                    className="input-field"
                  />
                  {errors.fullName && (
                    <p className="text-red-600 text-xs mt-1">{errors.fullName.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">
                    College Email
                  </label>
                  <input
                    {...register('email', {
                      required: 'Email required',
                      pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid' },
                    })}
                    type="email"
                    placeholder="rahul@college.edu.in"
                    className="input-field"
                  />
                  {errors.email && (
                    <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">
                    College
                  </label>
                  <input
                    {...register('collegeName', {
                      required: 'College required',
                      setValueAs: (v) => (v || '').trim(),
                      minLength: { value: 3, message: 'Enter your college name' },
                      maxLength: { value: 150, message: 'College name is too long' },
                    })}
                    list="pune-colleges"
                    placeholder="Start typing, e.g. MIT-WPU, PICT, COEP"
                    autoComplete="off"
                    className="input-field"
                  />
                  <datalist id="pune-colleges">
                    {PUNE_COLLEGES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {errors.collegeName && (
                    <p className="text-red-600 text-xs mt-1">{errors.collegeName.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1.5">
                      Department
                    </label>
                    <input {...register('department')} placeholder="CSE" className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-aviro-muted font-medium block mb-1.5">
                      Year
                    </label>
                    <select {...register('yearOfStudy')} className="input-field">
                      <option value="">Select</option>
                      {['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG'].map((y) => (
                        <option key={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                    ← Back
                  </button>
                  <button type="button" onClick={goNext} className="btn-primary flex-1">
                    Next →
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">
                  Almost Done! <Icon e="🎉" />
                </h3>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">
                    Your Area / Locality
                  </label>
                  <input
                    {...register('locality', { required: 'Locality required' })}
                    placeholder="Shivajinagar, Kothrud..."
                    className="input-field"
                  />
                  {errors.locality && (
                    <p className="text-red-600 text-xs mt-1">{errors.locality.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">
                    Phone Number
                  </label>
                  <input
                    {...register('phone', {
                      setValueAs: (v) => (v || '').replace(/[\s-]/g, ''),
                      validate: (v) => !v || PHONE_RULE.value.test(v) || PHONE_RULE.message,
                    })}
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    autoComplete="tel"
                    className="input-field"
                  />
                  {errors.phone && (
                    <p className="text-red-600 text-xs mt-1">{errors.phone.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-aviro-muted font-medium block mb-1.5">
                    Password
                  </label>
                  <input
                    {...register('password', {
                      required: 'Password required',
                      pattern: PASSWORD_RULE,
                    })}
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="input-field"
                  />
                  {!errors.password && (
                    <p className="text-aviro-muted text-xs mt-1">
                      At least 8 characters, with a letter and a number
                    </p>
                  )}
                  {errors.password && (
                    <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div className="bg-aviro-orange/5 border border-aviro-orange/20 rounded-xl p-3 text-xs text-aviro-muted">
                  <Icon e="🎓" /> Using your college email (.edu.in, .ac.in or .edu) verifies your
                  college automatically. You can also verify it later from your profile.
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                    ← Back
                  </button>
                  <button type="button" onClick={goNext} className="btn-primary flex-1">
                    Next →
                  </button>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg">Community guidelines</h3>
                  <p className="text-aviro-muted text-sm mt-1">
                    AVIRO works because everyone keeps these promises. Tick each one to continue.
                  </p>
                </div>

                <ul className="space-y-2">
                  {AGREEMENTS.map((g) => (
                    <li key={g.id}>
                      <label
                        htmlFor={`agree-${g.id}`}
                        className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer transition-colors ${
                          agreed[g.id]
                            ? 'border-aviro-orange bg-aviro-orange/5'
                            : 'border-aviro-border bg-aviro-card2'
                        }`}
                      >
                        <input
                          id={`agree-${g.id}`}
                          type="checkbox"
                          checked={!!agreed[g.id]}
                          onChange={(e) => setAgreed({ ...agreed, [g.id]: e.target.checked })}
                          className="mt-0.5 w-5 h-5 flex-shrink-0 accent-black"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{g.title}</span>
                          <span className="block text-xs text-aviro-muted mt-0.5">{g.detail}</span>
                          {g.id === RISK_AGREEMENT.id && (
                            <span className="block text-xs text-aviro-muted mt-1">
                              I also agree to the{' '}
                              <Link to="/terms" target="_blank" className="underline font-medium">
                                Terms of Service
                              </Link>{' '}
                              and{' '}
                              <Link to="/privacy" target="_blank" className="underline font-medium">
                                Privacy Policy
                              </Link>
                              .
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-aviro-muted text-center" aria-live="polite">
                  {AGREEMENTS.filter((g) => agreed[g.id]).length} of {AGREEMENTS.length} accepted
                </p>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(3)} className="btn-secondary flex-1">
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !allAgreed}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {loading ? 'Creating...' : 'Agree & sign up'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-aviro-muted text-sm mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-aviro-orange font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Onboarding shown once after signup (route: /welcome)
export const onboardingKey = (userId) => `aviro_onboarded_${userId}`;

const STEPS = [
  {
    icon: '🎓',
    title: 'Verify your college ID',
    text: 'Upload your college ID card in Profile. Our AI checks it, and an admin approves it. Only verified students can book or offer rides.',
    cta: { label: 'Go to Profile', to: '/profile' },
  },
  {
    icon: '🔍',
    title: 'Find a ride',
    text: 'Search rides on your route, see the driver’s rating and gender, and book a seat. Women-only rides are available too.',
    cta: { label: 'Search rides', to: '/search' },
  },
  {
    icon: '🏍️',
    title: 'Offer a ride',
    text: 'Going to college anyway? Add your vehicle in Profile, post a ride, and split the fuel cost with students on the same route.',
    cta: { label: 'Offer a ride', to: '/offer-ride' },
  },
  {
    icon: '🛡️',
    title: 'Stay safe',
    text: 'Share your live ride with family, use the SOS button in an emergency, and verify the ride OTP before you start.',
    cta: { label: 'Safety settings', to: '/safety' },
  },
];

export default function IntroPage() {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = (to = '/dashboard') => {
    try {
      if (user?.id) localStorage.setItem(onboardingKey(user.id), '1');
    } catch {
      // Storage blocked: onboarding may show again, which is fine
    }
    navigate(to, { replace: true });
  };

  return (
    <div className="min-h-screen bg-aviro-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-aviro-muted">
            Welcome{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''} 👋
          </p>
          <button onClick={() => finish()} className="text-sm text-aviro-muted hover:text-white">
            Skip
          </button>
        </div>

        <div className="card p-6 text-center space-y-4">
          <div className="text-5xl">{current.icon}</div>
          <h1 className="font-display font-bold text-2xl text-white">{current.title}</h1>
          <p className="text-aviro-muted text-sm leading-relaxed">{current.text}</p>
          <button
            onClick={() => finish(current.cta.to)}
            className="text-sm text-aviro-orange font-semibold hover:underline"
          >
            {current.cta.label} →
          </button>
        </div>

        <div className="flex justify-center gap-2 my-6" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-aviro-orange' : 'w-2 bg-aviro-border'}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="btn-secondary flex-1">
              ← Back
            </button>
          )}
          <button
            onClick={() => (isLast ? finish() : setStep(step + 1))}
            className="btn-primary flex-1"
          >
            {isLast ? 'Go to Dashboard 🚀' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLockup, Wordmark } from '../components/common/Logo';

const STEPS = [
  { n: '1', title: 'Verify your college', desc: 'Sign up with your college email or ID card. Only verified students can ride.' },
  { n: '2', title: 'Find or offer a ride', desc: 'Search rides on your route, or post your own trip and fill the empty seats.' },
  { n: '3', title: 'Ride and split the cost', desc: 'Meet at the pickup, start with an OTP and pay the driver by UPI or cash.' },
];

const SAFETY = [
  { icon: '🎓', title: 'Students only', desc: 'Every rider and driver is a verified college student.' },
  { icon: '🔑', title: 'OTP to start', desc: 'The trip starts only when the driver enters your code.' },
  { icon: '📍', title: 'Live trip tracking', desc: 'Follow the ride on the map and share it with family.' },
  { icon: '🚺', title: 'Women-only rides', desc: 'Female students can choose rides with women only.' },
  { icon: '🆘', title: 'SOS button', desc: 'Alert your emergency contacts with your location in one tap.' },
];

const COLLEGES = ['MIT-WPU', 'COEP', 'PICT', 'VIT', 'Cummins', 'PCCOE', 'Symbiosis', 'Fergusson', 'SPPU', 'DY Patil'];

// Built for phones: on a wide screen the page stays a centred phone-width column
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-aviro-dark text-white">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">

        <header className="sticky top-0 z-20 bg-aviro-dark/90 backdrop-blur px-5 h-14 flex items-center justify-between border-b border-aviro-border">
          <Wordmark height={26} />
          <Link to="/login" className="flex items-center text-sm font-semibold text-aviro-orange">Sign in</Link>
        </header>

        <main className="flex-1 px-5">
          {/* Hero */}
          <section className="pt-10 pb-8 text-center">
            <BrandLockup height={44} className="mb-8" />
            <h1 className="font-display font-bold text-[2rem] leading-tight">
              Share rides with students from <span className="text-aviro-orange">your college</span>
            </h1>
            <p className="text-aviro-muted text-[15px] mt-4 leading-relaxed">
              AVIRO connects verified Pune college students going the same way, so the daily commute costs less and feels safer.
            </p>
            <div className="mt-7 space-y-3">
              <Link to="/register" className="btn-primary block w-full text-center py-3.5 text-base">Create free account</Link>
              <Link to="/login" className="block w-full text-center py-3.5 text-base rounded-xl border border-aviro-border text-white font-semibold">
                I already have an account
              </Link>
            </div>
          </section>

          {/* How it works */}
          <section className="py-8 border-t border-aviro-border">
            <h2 className="font-display font-bold text-xl mb-5">How it works</h2>
            <ol className="space-y-4">
              {STEPS.map(s => (
                <li key={s.n} className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-aviro-orange/15 text-aviro-orange font-bold text-sm flex items-center justify-center flex-shrink-0">{s.n}</span>
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-sm text-aviro-muted mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Safety */}
          <section className="py-8 border-t border-aviro-border">
            <h2 className="font-display font-bold text-xl mb-1">Safe by design</h2>
            <p className="text-sm text-aviro-muted mb-5">Built for students who ride with people they haven't met yet.</p>
            <div className="card divide-y divide-aviro-border">
              {SAFETY.map(f => (
                <div key={f.title} className="flex gap-3 p-4">
                  <span className="text-xl flex-shrink-0" aria-hidden="true">{f.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{f.title}</p>
                    <p className="text-xs text-aviro-muted mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Colleges */}
          <section className="py-8 border-t border-aviro-border">
            <h2 className="font-display font-bold text-xl mb-1">For Pune colleges</h2>
            <p className="text-sm text-aviro-muted mb-4">Students from any Pune college can join.</p>
            <div className="flex flex-wrap gap-2">
              {COLLEGES.map(c => (
                <span key={c} className="bg-aviro-card2 border border-aviro-border rounded-full px-3 py-1 text-xs text-aviro-muted">{c}</span>
              ))}
              <span className="bg-aviro-card2 border border-aviro-border rounded-full px-3 py-1 text-xs text-aviro-muted">and more</span>
            </div>
          </section>

          {/* Closing call to action */}
          <section className="py-8 border-t border-aviro-border text-center">
            <h2 className="font-display font-bold text-xl">Ready for your next ride?</h2>
            <p className="text-sm text-aviro-muted mt-2 mb-5">It's free to join. You only pay your share of the trip.</p>
            <Link to="/register" className="btn-primary block w-full text-center py-3.5 text-base">Get started</Link>
          </section>
        </main>

        <footer className="px-5 py-6 border-t border-aviro-border text-center text-xs text-aviro-muted space-y-2">
          <p>
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            {' · '}
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
          </p>
          <p>© 2026 AVIRO · Affordable Verified Intelligent Ride Organizer</p>
        </footer>
      </div>
    </div>
  );
}

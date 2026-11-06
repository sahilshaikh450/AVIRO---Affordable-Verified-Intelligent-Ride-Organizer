import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLockup, Wordmark } from '../components/common/Logo';
import Icon from '../components/common/Icon';

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

// What a ride looks like in the app; shown beside the hero on wide screens
function ExampleRide() {
  return (
    <div className="relative" aria-hidden="true">
      <div className="absolute -inset-10 rounded-full bg-aviro-orange/10 blur-3xl" />
      <div className="relative card p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="section-tag">Example ride</span>
          <span className="text-xs text-green-600 font-semibold"><Icon e="✓" /> Verified student</span>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-center pt-1.5">
            <span className="w-3 h-3 rounded-full bg-aviro-orange" />
            <span className="w-px flex-1 bg-aviro-border my-1.5 min-h-[28px]" />
            <span className="w-3 h-3 rounded-full bg-aviro-green" />
          </div>
          <div className="space-y-5">
            <div><p className="font-semibold">Katraj Chowk</p><p className="text-xs text-aviro-muted">Pickup · Tomorrow, 8:30 am</p></div>
            <div><p className="font-semibold">MIT World Peace University</p><p className="text-xs text-aviro-muted">Drop</p></div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-aviro-card2 p-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-aviro-orange/15 flex items-center justify-center"><Icon e="🏍️" /></span>
            <div><p className="text-sm font-semibold">Bike · 1 seat left</p><p className="text-xs text-aviro-muted">Starts with an OTP</p></div>
          </div>
          <p className="text-xs text-aviro-muted text-right">Pay by<br /><span className="text-aviro-fg font-semibold">UPI or cash</span></p>
        </div>
      </div>
    </div>
  );
}

// Phone first; on a laptop the same sections spread into columns
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-aviro-dark text-aviro-fg">
      <div className="max-w-md md:max-w-6xl mx-auto min-h-screen flex flex-col">

        <header className="sticky top-0 z-20 bg-aviro-dark/90 backdrop-blur px-5 md:px-8 h-14 md:h-16 flex items-center justify-between border-b border-aviro-border">
          <Wordmark height={26} />
          <div className="flex items-center gap-5">
            <Link to="/login" className="flex items-center text-sm font-semibold text-aviro-orange">Sign in</Link>
            <Link to="/register" className="hidden md:inline-block btn-primary text-sm py-2">Create account</Link>
          </div>
        </header>

        <main className="flex-1 px-5 md:px-8">
          {/* Hero */}
          <section className="pt-10 pb-8 text-center lg:text-left lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center lg:py-20">
            <div>
            <BrandLockup height={44} className="mb-8 lg:hidden" />
            <h1 className="font-display font-bold text-[2rem] md:text-5xl lg:text-[3.4rem] leading-tight">
              Share rides with students from <span className="text-aviro-orange">your college</span>
            </h1>
            <p className="text-aviro-muted text-[15px] md:text-lg mt-4 md:mt-6 leading-relaxed md:max-w-xl md:mx-auto lg:mx-0">
              AVIRO connects verified Pune college students going the same way, so the daily commute costs less and feels safer.
            </p>
            <div className="mt-7 md:mt-9 space-y-3 md:space-y-0 md:flex md:gap-4 md:justify-center lg:justify-start">
              <Link to="/register" className="btn-primary block w-full md:w-auto md:px-8 text-center py-3.5 text-base">Create free account</Link>
              <Link to="/login" className="block w-full md:w-auto md:px-8 text-center py-3.5 text-base rounded-xl border border-aviro-border text-aviro-fg font-semibold hover:border-aviro-orange">
                I already have an account
              </Link>
            </div>
            </div>
            <div className="hidden lg:block"><ExampleRide /></div>
          </section>

          {/* How it works */}
          <section className="py-8 md:py-14 border-t border-aviro-border">
            <h2 className="font-display font-bold text-xl md:text-3xl mb-5 md:mb-8">How it works</h2>
            <ol className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
              {STEPS.map(s => (
                <li key={s.n} className="flex gap-4 md:card md:p-6">
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
          <section className="py-8 md:py-14 border-t border-aviro-border">
            <h2 className="font-display font-bold text-xl md:text-3xl mb-1 md:mb-2">Safe by design</h2>
            <p className="text-sm md:text-base text-aviro-muted mb-5 md:mb-8">Built for students who ride with people they haven't met yet.</p>
            <div className="card divide-y divide-aviro-border md:divide-y-0 md:bg-transparent md:border-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
              {SAFETY.map(f => (
                <div key={f.title} className="flex gap-3 p-4 md:card md:p-5">
                  <span className="text-xl flex-shrink-0" aria-hidden="true"><Icon e={f.icon} /></span>
                  <div>
                    <p className="font-semibold text-sm">{f.title}</p>
                    <p className="text-xs text-aviro-muted mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Colleges */}
          <section className="py-8 md:py-14 border-t border-aviro-border">
            <h2 className="font-display font-bold text-xl md:text-3xl mb-1 md:mb-2">For Pune colleges</h2>
            <p className="text-sm md:text-base text-aviro-muted mb-4 md:mb-6">Students from any Pune college can join.</p>
            <div className="flex flex-wrap gap-2">
              {COLLEGES.map(c => (
                <span key={c} className="bg-aviro-card2 border border-aviro-border rounded-full px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm text-aviro-muted">{c}</span>
              ))}
              <span className="bg-aviro-card2 border border-aviro-border rounded-full px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm text-aviro-muted">and more</span>
            </div>
          </section>

          {/* Closing call to action */}
          <section className="py-8 md:py-16 border-t border-aviro-border text-center">
            <h2 className="font-display font-bold text-xl md:text-3xl">Ready for your next ride?</h2>
            <p className="text-sm md:text-base text-aviro-muted mt-2 mb-5 md:mb-7">It's free to join. You only pay your share of the trip.</p>
            <Link to="/register" className="btn-primary block w-full md:inline-block md:w-auto md:px-10 text-center py-3.5 text-base">Get started</Link>
          </section>
        </main>

        <footer className="px-5 md:px-8 py-6 border-t border-aviro-border text-center text-xs text-aviro-muted space-y-2">
          <p>
            <Link to="/privacy" className="hover:text-aviro-fg">Privacy Policy</Link>
            {' · '}
            <Link to="/terms" className="hover:text-aviro-fg">Terms of Service</Link>
          </p>
          <p>© 2026 AVIRO · Affordable Verified Intelligent Ride Organizer</p>
        </footer>
      </div>
    </div>
  );
}

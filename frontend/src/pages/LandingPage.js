import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const features = [
  { icon:'🧠', title:'AI Route Matching',      desc:'Smart matching for students on the same Pune college routes.' },
  { icon:'👫', title:'Gender Badge on Rides',   desc:'See clearly if the driver is Male or Female before booking.' },
  { icon:'🚺', title:'Women-Only Mode',         desc:'Female students can filter to only female drivers anytime.' },
  { icon:'📡', title:'Live GPS Tracking',       desc:'Real-time location shared with family for full safety.' },
  { icon:'💰', title:'Auto Fare Split',         desc:'Split fare equally via UPI — zero booking fees.' },
  { icon:'🔁', title:'Recurring Rides',         desc:'Schedule your weekly college commute just once.' },
  { icon:'🆘', title:'SOS Emergency Button',    desc:'One tap alerts 3 emergency contacts with your live location.' },
  { icon:'🏆', title:'College Leaderboards',    desc:'Compete with other colleges on rides shared & CO₂ saved.' },
];

const colleges = ['COEP','VIT Pune','MIT Pune','Symbiosis','PICT','Fergusson','DYPIU','Bharati Vidyapeeth','NIBM','Pune University'];

export default function LandingPage() {
  const navigate = useNavigate();

  // Any action that requires login → redirect to register/login
  const handleProtectedAction = (destination = '/register') => {
    navigate(destination);
  };

  return (
    <div className="min-h-screen bg-aviro-dark text-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-aviro-dark/80 backdrop-blur border-b border-aviro-border px-6 py-4 flex items-center justify-between">
        <span className="font-display font-bold text-2xl text-aviro-orange">AVIRO</span>
        <div className="flex gap-3">
          <Link to="/login"    className="btn-secondary text-sm py-2">Sign In</Link>
          <Link to="/register" className="btn-primary  text-sm py-2">Join Free 🚀</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-aviro-orange/10 border border-aviro-orange/30 rounded-full px-4 py-1.5 text-aviro-orange text-xs font-bold mb-6 animate-fade-up">
          <span className="w-1.5 h-1.5 bg-aviro-orange rounded-full animate-pulse-dot" />
          Pune's #1 College Ride Platform · Only for .edu.in students
        </div>
        <h1 className="font-display font-bold text-5xl md:text-7xl leading-none tracking-tight mb-6 animate-fade-up">
          Ride Smart.<br />
          <span className="text-aviro-orange">Save More.</span><br />
          Go Together.
        </h1>
        <p className="text-aviro-muted text-lg max-w-xl mx-auto mb-8 animate-fade-up">
          AVIRO connects Pune college students on the same routes. Share rides, split costs, stay safe — together.
        </p>

        {/* ⚠️ NOTE: these buttons go to register/login, NOT directly to rides */}
        <div className="flex gap-3 justify-center flex-wrap animate-fade-up">
          <Link to="/register" className="btn-primary text-base px-8 py-3">🚀 Join as Student</Link>
          <Link to="/login"    className="btn-secondary text-base px-8 py-3">Sign In →</Link>
        </div>

        {/* Preview cards — clicking them prompts to sign up */}
        <div className="mt-14 grid grid-cols-4 gap-4 max-w-2xl mx-auto animate-fade-up">
          {[
            {e:'🏍️',l:'Bike',s:'1 seat',r:'FC Road'},
            {e:'🚗',l:'Car Pool',s:'3 seats',r:'Hinjewadi'},
            {e:'🛵',l:'Scooty',s:'1 seat',r:'Kothrud'},
            {e:'🚐',l:'Van',s:'5 seats',r:'Wakad'}
          ].map((v,i) => (
            <div
              key={i}
              onClick={() => handleProtectedAction('/register')}
              className="card p-4 text-center hover:border-aviro-orange/50 hover:-translate-y-1 transition-all cursor-pointer group relative"
            >
              <div className="text-3xl mb-2">{v.e}</div>
              <p className="text-xs font-bold text-white">{v.l}</p>
              <p className="text-xs text-aviro-green font-semibold mt-1">{v.s}</p>
              <p className="text-xs text-aviro-orange mt-0.5">{v.r}</p>
              {/* Hover tooltip */}
              <div className="absolute inset-0 bg-aviro-dark/90 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-aviro-orange font-bold">Sign up to view →</span>
              </div>
            </div>
          ))}
        </div>

        {/* College-only badge */}
        <div className="mt-8 inline-flex items-center gap-2 bg-aviro-card border border-aviro-border rounded-full px-4 py-2 text-sm text-aviro-muted">
          🎓 <span>Exclusively for students with <span className="text-aviro-orange font-semibold">.edu.in</span> college emails</span>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-aviro-border">
        <div className="max-w-3xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[{n:'12K+',l:'Students'},{n:'40+',l:'Colleges'},{n:'₹85',l:'Avg Savings/Ride'},{n:'4.8★',l:'Safety Rating'}].map(s => (
            <div key={s.l}>
              <p className="font-display font-bold text-3xl text-aviro-orange">{s.n}</p>
              <p className="text-aviro-muted text-sm mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="section-tag mb-3 block w-fit mx-auto">⚡ Features</span>
          <h2 className="font-display font-bold text-4xl">Built for College Life</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(f => (
            <div
              key={f.title}
              onClick={() => handleProtectedAction('/register')}
              className="card p-5 hover:border-aviro-orange/40 hover:-translate-y-1 transition-all cursor-pointer"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <p className="font-bold text-sm mb-1">{f.title}</p>
              <p className="text-aviro-muted text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Colleges */}
      <section className="py-16 px-6 text-center bg-aviro-card border-y border-aviro-border">
        <h2 className="font-display font-bold text-3xl mb-2">Serving Pune's Best Colleges 🎓</h2>
        <p className="text-aviro-muted text-sm mb-8">Sign up with your college <span className="text-aviro-orange">.edu.in</span> email to get started</p>
        <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
          {colleges.map(c => (
            <span key={c} className="bg-aviro-card2 border border-aviro-border rounded-full px-4 py-1.5 text-sm text-aviro-muted">{c}</span>
          ))}
          <span className="bg-aviro-card2 border border-aviro-border rounded-full px-4 py-1.5 text-sm text-aviro-muted">+ 30 more</span>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <h2 className="font-display font-bold text-4xl mb-4">Start Riding Smarter Today</h2>
        <p className="text-aviro-muted mb-2">Join 12,000+ Pune students already saving money on their daily commute.</p>
        <p className="text-aviro-orange text-sm font-semibold mb-8">🔒 Only accessible with a valid .edu.in college email</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/register" className="btn-primary text-base px-10 py-3">🚀 Join AVIRO Free</Link>
          <Link to="/login"    className="btn-secondary text-base px-8 py-3">Already a member? Sign In</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-aviro-border py-8 text-center text-aviro-muted text-sm">
        <p className="font-display font-bold text-aviro-orange text-xl mb-2">AVIRO</p>
        <p>Affordable · Verified · Intelligent · Ride Organizer</p>
        <p className="mt-2 text-xs">
          <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
          {' · '}
          <Link to="/terms" className="hover:text-white">Terms of Service</Link>
        </p>
        <p className="mt-2 text-xs">© 2026 AVIRO · Made for Pune's College Students 🏍️</p>
      </footer>
    </div>
  );
}
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PRIVACY_SECTIONS, TERMS_SECTIONS, LEGAL_LAST_UPDATED } from '../content/legal';

const PAGES = {
  privacy: { title: 'Privacy Policy 🔒', sections: PRIVACY_SECTIONS, other: { to: '/terms', label: 'Terms of Service' } },
  terms:   { title: 'Terms of Service 📄', sections: TERMS_SECTIONS, other: { to: '/privacy', label: 'Privacy Policy' } },
};

// Public page: /privacy and /terms
export default function LegalPage({ type }) {
  const navigate = useNavigate();
  const page = PAGES[type];

  useEffect(() => {
    document.title = `${page.title.replace(/[^\w\s]/g, '').trim()} · AVIRO`;
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="min-h-screen bg-aviro-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="w-9 h-9 rounded-xl bg-aviro-card border border-aviro-border flex items-center justify-center text-aviro-muted hover:text-white"
            aria-label="Go back"
          >
            ←
          </button>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">{page.title}</h1>
            <p className="text-xs text-aviro-muted">Last updated: {LEGAL_LAST_UPDATED}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-aviro-muted">
          {page.sections.map((s, i) => (
            <div key={i} className="card p-4 space-y-1">
              <h2 className="font-semibold text-white">{s.title}</h2>
              <p>{s.content}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-aviro-muted">
          See also our{' '}
          <Link to={page.other.to} className="text-aviro-orange hover:underline">{page.other.label}</Link>
          {' '}· Questions? <a href="mailto:aviro.support@gmail.com" className="text-aviro-orange hover:underline">aviro.support@gmail.com</a>
        </p>
      </div>
    </div>
  );
}

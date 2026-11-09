import React from 'react';
import { Link } from 'react-router-dom';
import { GUIDELINES, RISK_AGREEMENT } from '../../content/guidelines';

export const AGREEMENTS = [...GUIDELINES, RISK_AGREEMENT];

export const allAccepted = (agreed) => AGREEMENTS.every((g) => agreed[g.id]);

export default function GuidelinesChecklist({ agreed, onChange }) {
  return (
    <div className="space-y-2">
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
                onChange={(e) => onChange({ ...agreed, [g.id]: e.target.checked })}
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
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { searchLocations, getPopularLocations } from '../../utils/puneLocations';

export default function LocationInput({
  label, placeholder, value, onChange, icon = '📍', required = false,
}) {
  const [query, setQuery]     = useState(value || '');
  const [results, setResults] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [focused, setFocused]   = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowDrop(false); setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (val.length >= 1) {
      setResults(searchLocations(val));
      setShowDrop(true);
    } else {
      setResults(getPopularLocations());
      setShowDrop(true);
    }
  };

  const handleSelect = (loc) => {
    setQuery(loc.name);
    onChange(loc.name);
    setResults([]);
    setShowDrop(false);
  };

  const handleFocus = () => {
    setFocused(true);
    if (query.length >= 1) {
      setResults(searchLocations(query));
    } else {
      setResults(getPopularLocations());
    }
    setShowDrop(true);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      {label && (
        <label className="text-xs text-aviro-muted font-medium block mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className={`flex items-center gap-2 bg-aviro-card2 border rounded-xl px-4 py-3 transition-all
        ${focused ? 'border-aviro-orange ring-1 ring-aviro-orange/20' : 'border-aviro-border'}`}>
        <span className="text-base flex-shrink-0">{icon}</span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={placeholder || 'Search college or area...'}
          required={required}
          autoComplete="off"
          className="flex-1 bg-transparent text-sm text-white placeholder-aviro-muted outline-none"
        />
        {query && (
          <button type="button"
            onClick={() => { setQuery(''); onChange(''); setResults(getPopularLocations()); setShowDrop(true); }}
            className="text-aviro-muted hover:text-white transition-colors flex-shrink-0 text-xs">
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDrop && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-aviro-card border border-aviro-border rounded-xl shadow-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-aviro-border flex items-center justify-between">
            <p className="text-xs text-aviro-muted font-medium">
              {query.length < 1 ? '⭐ Popular' : `🔍 ${results.length} results`}
            </p>
            <div className="flex gap-2 text-xs text-aviro-muted">
              <span>🎓 College</span>
              <span>📍 Area</span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {results.map((loc, i) => (
              <button key={i} type="button" onClick={() => handleSelect(loc)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-aviro-card2 transition-colors text-left border-b border-aviro-border/40 last:border-0">
                <span className="text-lg flex-shrink-0">{loc.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium truncate">{loc.name}</p>
                  <p className="text-xs text-aviro-muted">{loc.area} • Pune</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0
                  ${loc.type === 'college' ? 'bg-aviro-orange/10 text-aviro-orange' :
                    loc.type === 'transport' ? 'bg-aviro-blue/10 text-aviro-blue' :
                    'bg-aviro-card2 text-aviro-muted'}`}>
                  {loc.type === 'college' ? 'College' : loc.type === 'transport' ? 'Hub' : 'Area'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
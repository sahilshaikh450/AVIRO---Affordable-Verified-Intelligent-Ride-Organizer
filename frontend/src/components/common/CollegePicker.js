import React, { useId, useMemo, useRef, useState } from 'react';
import { PUNE_COLLEGES } from '../../utils/colleges';

const MAX_RESULTS = 200;

const simplify = (text) => (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function filterColleges(query, colleges = PUNE_COLLEGES) {
  const q = simplify(query);
  if (!q) {
    return colleges.slice(0, MAX_RESULTS);
  }
  const words = (query || '').toLowerCase().split(/\s+/).map(simplify).filter(Boolean);
  const starts = [];
  const contains = [];
  colleges.forEach((name) => {
    const flat = simplify(name);
    if (!words.every((w) => flat.includes(w))) {
      return;
    }
    (flat.startsWith(q) ? starts : contains).push(name);
  });
  return [...starts, ...contains].slice(0, MAX_RESULTS);
}

export default function CollegePicker({ value, onChange, onBlur, invalid, placeholder }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputRef = useRef(null);
  const typed = (value || '').trim();

  const matches = useMemo(() => filterColleges(value), [value]);
  const exact = matches.some((c) => c.toLowerCase() === typed.toLowerCase());
  const options = typed.length >= 3 && !exact ? [...matches, { custom: typed }] : matches;

  const choose = (option) => {
    onChange(typeof option === 'string' ? option : option.custom);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          if (onBlur) {
            onBlur();
          }
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid ? 'true' : 'false'}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="input-field"
      />
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-aviro-border rounded-xl shadow-lg py-1"
        >
          {options.map((option, i) => {
            const label = typeof option === 'string' ? option : `Use “${option.custom}”`;
            return (
              <li
                key={typeof option === 'string' ? option : 'custom'}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
                className={`px-4 py-2.5 text-sm cursor-pointer ${
                  i === active ? 'bg-aviro-card2' : 'hover:bg-aviro-card2'
                } ${typeof option === 'string' ? 'text-aviro-fg' : 'text-aviro-muted italic border-t border-aviro-border'}`}
              >
                {label}
              </li>
            );
          })}
        </ul>
      )}
      {open && options.length === 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-aviro-border rounded-xl shadow-lg px-4 py-3 text-sm text-aviro-muted">
          Keep typing your college name
        </div>
      )}
    </div>
  );
}

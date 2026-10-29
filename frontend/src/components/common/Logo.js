import React, { useId } from 'react';

// AVIRO mark: a location pin on top of an "A" drawn as a road (same art as the app icon)
export default function Logo({ size = 32, className = '' }) {
  // Unique gradient ids, so several logos on one page don't clash
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={`flex-shrink-0 ${className}`}
      role="img" aria-label="AVIRO logo">
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#262B3B" /><stop offset="1" stopColor="#0D0F14" />
        </linearGradient>
        <linearGradient id={`${id}or`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFA24C" /><stop offset="1" stopColor="#FF5A1F" />
        </linearGradient>
        <radialGradient id={`${id}glow`} cx="0.5" cy="0.3" r="0.65">
          <stop offset="0" stopColor="#FF6B2B" stopOpacity="0.32" /><stop offset="1" stopColor="#FF6B2B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#${id}bg)`} />
      <rect width="512" height="512" rx="112" fill={`url(#${id}glow)`} />
      <rect x="4" y="4" width="504" height="504" rx="108" fill="none" stroke="#FF6B2B" strokeOpacity="0.25" strokeWidth="8" />
      <path d="M256 196 L156 408 M256 196 L356 408" stroke={`url(#${id}or)`} strokeWidth="60" strokeLinecap="round" fill="none" />
      <path d="M214 334 H298" stroke="#fff" strokeWidth="18" strokeLinecap="round" strokeDasharray="20 22" fill="none" />
      <path d="M256 74c-37 0-66 29-66 66 0 48 66 108 66 108s66-60 66-108c0-37-29-66-66-66z" fill="#fff" />
      <circle cx="256" cy="140" r="25" fill="#FF6B2B" />
    </svg>
  );
}

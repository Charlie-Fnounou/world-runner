export default function SpeedDuelArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Two gunslinger silhouettes facing off at sundown">
      <defs>
        <linearGradient id="sd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b1408" />
          <stop offset="0.45" stopColor="#6a250c" />
          <stop offset="0.8" stopColor="#ff3b1f" />
          <stop offset="1" stopColor="#ffb23e" />
        </linearGradient>
        <radialGradient id="sd-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff2df" />
          <stop offset="0.55" stopColor="#ffb23e" />
          <stop offset="1" stopColor="#ffb23e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <style>{`
        .sd-art-sun { transform-origin: 200px 215px; animation: sdArtPulse 3.2s ease-in-out infinite; }
        @keyframes sdArtPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @media (prefers-reduced-motion: reduce) { .sd-art-sun { animation: none; } }
      `}</style>
      <rect width="400" height="300" fill="url(#sd-sky)" />
      {/* sun rays */}
      <g opacity="0.18" fill="#fff2df">
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d="M200 215 L190 -40 L210 -40 Z" transform={`rotate(${-78 + i * 12} 200 215)`} />
        ))}
      </g>
      <circle className="sd-art-sun" cx="200" cy="215" r="92" fill="url(#sd-sun)" />
      <circle cx="200" cy="215" r="46" fill="#fff2df" />
      {/* mesas */}
      <path d="M0 230 L0 200 L40 200 L52 182 L110 182 L120 205 L160 210 L280 212 L292 178 L350 178 L362 204 L400 204 L400 230 Z" fill="#3d1407" />
      <path d="M0 300 L0 236 Q200 214 400 236 L400 300 Z" fill="#1d0a03" />
      {/* poster title */}
      <text x="200" y="58" textAnchor="middle" fontFamily="var(--font-bricolage), system-ui, sans-serif" fontWeight="900" fontSize="58" letterSpacing="-1" fill="#ffb23e" stroke="#2b1408" strokeWidth="2" paintOrder="stroke">
        DRAW!
      </text>
      <text x="200" y="80" textAnchor="middle" fontFamily="var(--font-jetbrains), monospace" fontSize="10" letterSpacing="5" fill="#fff2df" opacity="0.85">
        ★ HIGH NOON · 243 MS ★
      </text>
      {/* left gunslinger */}
      <g transform="translate(58 150)" fill="#140602">
        <path d="M14 0 Q28 -14 42 0 Z" />
        <path d="M-4 4 Q28 -6 60 4 Q28 10 -4 4 Z" />
        <circle cx="28" cy="16" r="10" />
        <path d="M8 30 Q28 22 50 30 L54 82 L4 82 Z" />
        <path d="M48 36 L104 32 L104 40 L50 44 Z" />
        <rect x="100" y="27" width="14" height="6" />
        <path d="M12 82 L6 128 L18 128 L28 88 L34 128 L46 128 L42 82 Z" />
        <rect x="8" y="42" width="44" height="7" fill="#ff3b1f" />
      </g>
      <circle cx="176" cy="180" r="8" fill="#fff2df" />
      <circle cx="176" cy="180" r="15" fill="#ffb23e" opacity="0.6" />
      {/* right gunslinger (holstered, too slow) */}
      <g transform="translate(342 150) scale(-1 1)" fill="#140602">
        <path d="M14 0 Q28 -14 42 0 Z" />
        <path d="M-4 4 Q28 -6 60 4 Q28 10 -4 4 Z" />
        <circle cx="28" cy="16" r="10" />
        <path d="M8 30 Q28 22 50 30 L54 82 L4 82 Z" />
        <path d="M50 32 L58 34 L62 66 L54 67 Z" />
        <path d="M12 82 L6 128 L18 128 L28 88 L34 128 L46 128 L42 82 Z" />
        <rect x="8" y="42" width="44" height="7" fill="#ffb23e" />
      </g>
      {/* tumbleweed */}
      <g stroke="#3d1407" strokeWidth="2" fill="none" opacity="0.9">
        <circle cx="300" cy="268" r="12" />
        <path d="M290 262 Q300 276 312 262 M292 274 Q300 258 310 274" />
      </g>
      {/* poster frame */}
      <rect x="6" y="6" width="388" height="288" fill="none" stroke="#fff2df" strokeWidth="2" opacity="0.35" />
    </svg>
  );
}

export default function PerfectTimingArt({ className }: { className?: string }) {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Perfect Timing cover">
      <style>{`
        .ptA-hand { transform-origin: 268px 150px; animation: ptA-spin 6s linear infinite; }
        .ptA-blink { animation: ptA-blink 1.2s steps(2, jump-none) infinite; }
        @keyframes ptA-spin { to { transform: rotate(360deg); } }
        @keyframes ptA-blink { 50% { opacity: 0.15; } }
        @media (prefers-reduced-motion: reduce) { .ptA-hand, .ptA-blink { animation: none; } }
      `}</style>
      <rect width="400" height="300" fill="#fff3d6" />
      {/* Poster rays */}
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M268 150 L 700 130 L 700 170 Z" fill="#1a1300" opacity="0.05" transform={`rotate(${i * 30} 268 150)`} />
      ))}
      {/* Stopwatch */}
      <rect x="254" y="22" width="28" height="22" rx="5" fill="#1a1300" />
      <rect x="246" y="14" width="44" height="12" rx="6" fill="#ff3d7f" stroke="#1a1300" strokeWidth="5" />
      <circle cx="268" cy="150" r="112" fill="#1a1300" />
      <circle cx="262" cy="144" r="112" fill="#ff3d7f" stroke="#1a1300" strokeWidth="7" />
      <circle cx="262" cy="144" r="88" fill="#fff3d6" stroke="#1a1300" strokeWidth="5" />
      <g transform="translate(-6 -6)">
        {ticks.map((i) => (
          <line
            key={i}
            x1="268"
            y1={i % 5 === 0 ? 70 : 74}
            x2="268"
            y2="80"
            stroke="#1a1300"
            strokeWidth={i % 5 === 0 ? 4 : 1.5}
            transform={`rotate(${i * 6} 268 150)`}
          />
        ))}
        <path d="M268 150 L 268 62 A 88 88 0 0 1 344 106 Z" fill="#ff3d7f" opacity="0.35" />
        <g className="ptA-hand">
          <line x1="268" y1="150" x2="268" y2="76" stroke="#1a1300" strokeWidth="6" strokeLinecap="round" />
          <circle cx="268" cy="150" r="10" fill="#1a1300" />
          <circle cx="268" cy="150" r="4" fill="#ff3d7f" />
        </g>
      </g>
      {/* Giant numerals */}
      <text
        x="18"
        y="214"
        fontFamily="var(--font-display), system-ui, sans-serif"
        fontWeight="900"
        fontSize="132"
        letterSpacing="-9"
        fill="#1a1300"
        stroke="#fff3d6"
        strokeWidth="8"
        paintOrder="stroke"
      >
        4.37
      </text>
      <text x="26" y="78" fontFamily="var(--font-mono), monospace" fontSize="13" fontWeight="700" letterSpacing="4" fill="#1a1300">
        TARGET
      </text>
      <rect x="26" y="86" width="64" height="5" fill="#ff3d7f" />
      <text x="324" y="228" fontFamily="var(--font-serif), Georgia, serif" fontStyle="italic" fontSize="44" fill="#1a1300">
        s
      </text>
      {/* Bottom band */}
      <rect x="0" y="252" width="400" height="48" fill="#1a1300" />
      <text x="20" y="286" fontFamily="var(--font-display), system-ui, sans-serif" fontWeight="900" fontSize="28" fill="#fff3d6" letterSpacing="1">
        STOP.
      </text>
      <text x="112" y="286" fontFamily="var(--font-serif), Georgia, serif" fontStyle="italic" fontSize="24" fill="#ff3d7f">
        right… now.
      </text>
      <circle className="ptA-blink" cx="372" cy="276" r="8" fill="#ff3d7f" />
    </svg>
  );
}

export default function ImpossibleScaleArt({ className }: { className?: string }) {
  // a row of ever-bigger objects, each ~3.2× the last, marching off to the right
  const ring = [4, 8, 16, 32, 64, 128];
  const ticks = Array.from({ length: 13 }, (_, i) => i);
  const sup = ["⁻⁹", "⁻⁶", "⁻³", "⁰", "³", "⁶", "⁹", "¹²", "¹⁵", "¹⁸", "²¹", "²⁴", "²⁷"];
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Impossible Scale cover">
      <defs>
        <radialGradient id="is-bg" cx="35%" cy="55%" r="80%">
          <stop offset="0" stopColor="#2a1c5c" />
          <stop offset="1" stopColor="#0b0d1f" />
        </radialGradient>
        <radialGradient id="is-sun" cx="40%" cy="40%" r="60%">
          <stop offset="0" stopColor="#fff6c2" />
          <stop offset="0.6" stopColor="#ffc247" />
          <stop offset="1" stopColor="#ff6a2b" />
        </radialGradient>
        <radialGradient id="is-glow">
          <stop offset="0" stopColor="#9b7bff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#9b7bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <style>{`
        .is-zoom { transform-origin: 70px 170px; animation: is-art-zoom 7s ease-in-out infinite alternate; }
        .is-twinkle { animation: is-art-tw 2.4s ease-in-out infinite; }
        @keyframes is-art-zoom { from { transform: scale(1) } to { transform: scale(1.12) } }
        @keyframes is-art-tw { 0%,100% { opacity: .9 } 50% { opacity: .2 } }
        @media (prefers-reduced-motion: reduce) { .is-zoom, .is-twinkle { animation: none; } }
      `}</style>
      <rect width="400" height="300" fill="url(#is-bg)" />
      {[
        [30, 40],
        [120, 22],
        [210, 60],
        [300, 30],
        [250, 270],
        [40, 250],
        [150, 280],
        [330, 250],
      ].map(([x, y], i) => (
        <circle key={i} className="is-twinkle" style={{ animationDelay: `${i * 0.3}s` }} cx={x} cy={y} r={i % 3 === 0 ? 1.8 : 1.1} fill="#eef0ff" />
      ))}
      {/* power-of-ten rings */}
      <g className="is-zoom">
        {ring.map((r, i) => (
          <circle key={r} cx="70" cy="170" r={r * 1.6} fill="none" stroke="#5ef2d6" strokeOpacity={0.12 + i * 0.05} strokeDasharray="3 6" />
        ))}
        {/* tiny: thought particle */}
        <circle cx="70" cy="170" r="10" fill="url(#is-glow)" />
        <circle cx="70" cy="170" r="2.6" fill="#e9e3ff" />
        {/* ant */}
        <g transform="translate(84 170)">
          <ellipse cx="0" cy="0" rx="4" ry="2.6" fill="#d0523a" />
          <ellipse cx="5" cy="-0.6" rx="2" ry="1.6" fill="#d0523a" />
        </g>
        {/* cat loaf */}
        <g transform="translate(104 170)">
          <rect x="-9" y="-5" width="18" height="10" rx="5" fill="#ff9f43" />
          <path d="M-7 -3 L-5.5 -9 L-3 -4 M-1 -4 L1 -9 L2.5 -3" fill="#ff9f43" />
        </g>
        {/* everest */}
        <path d="M118 182 L134 154 L141 164 L148 152 L166 182 Z" fill="#5a6488" />
        <path d="M134 154 L130 162 L134 161 L137 164 L141 164 Z" fill="#f3f5ff" />
        {/* earth */}
        <circle cx="196" cy="168" r="26" fill="#2f6bff" />
        <path d="M180 158 q8 -10 18 -4 q4 8 -6 10 q-8 2 -12 -6z M200 176 q10 -4 14 4 q-4 10 -14 6z" fill="#3fcf8e" />
        {/* sun */}
        <circle cx="300" cy="164" r="74" fill="#ffb347" fillOpacity="0.18" />
        <circle cx="300" cy="164" r="58" fill="url(#is-sun)" />
      </g>
      {/* ruler */}
      <rect x="356" y="0" width="44" height="300" fill="#0b0d1f" fillOpacity="0.85" />
      <line x1="364" y1="0" x2="364" y2="300" stroke="#eef0ff" strokeOpacity="0.35" />
      {ticks.map((i) => (
        <g key={i}>
          <line x1="359" x2="369" y1={290 - i * 24} y2={290 - i * 24} stroke="#eef0ff" strokeOpacity="0.8" />
          <text x="372" y={293 - i * 24} fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="8" fill="#eef0ff" fillOpacity="0.85">
            10{sup[i]}
          </text>
        </g>
      ))}
      <path d="M352 140 L362 146 L352 152 Z" fill="#5ef2d6" />
      <rect x="360" y="145" width="40" height="2" fill="#5ef2d6" />
      {/* title-ish type */}
      <text x="18" y="54" fontFamily="Bricolage Grotesque, ui-sans-serif, sans-serif" fontWeight="900" fontSize="40" fill="#eef0ff">
        10<tspan fontSize="22" dy="-16">−18</tspan>
      </text>
      <text x="18" y="78" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="11" fill="#9b7bff" letterSpacing="2">
        → 10²⁷ METRES
      </text>
      <rect x="18" y="262" width="96" height="3" fill="#eef0ff" />
      <text x="18" y="256" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="10" fill="#eef0ff">
        1 light-year
      </text>
    </svg>
  );
}

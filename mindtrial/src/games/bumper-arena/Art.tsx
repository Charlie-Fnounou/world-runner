export default function BumperArenaArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Bumper Arena cover">
      <defs>
        <radialGradient id="ba-void" cx="0.5" cy="0.6" r="0.75">
          <stop offset="0" stopColor="#3a1660" />
          <stop offset="0.55" stopColor="#1b0f2e" />
          <stop offset="1" stopColor="#08040f" />
        </radialGradient>
        <radialGradient id="ba-top" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#4b2a7a" />
          <stop offset="1" stopColor="#22103e" />
        </radialGradient>
        <linearGradient id="ba-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a1f6e" />
          <stop offset="1" stopColor="#1c0b2c" />
        </linearGradient>
        <radialGradient id="ba-pink" cx="0.32" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" stopColor="#ff4fa3" />
          <stop offset="1" stopColor="#ff4fa3" />
        </radialGradient>
        <radialGradient id="ba-cyan" cx="0.32" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" stopColor="#5af0ff" />
          <stop offset="1" stopColor="#5af0ff" />
        </radialGradient>
        <filter id="ba-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="ba-plat">
          <ellipse cx="200" cy="170" rx="150" ry="96" />
        </clipPath>
      </defs>
      <style>{`
        .ba-spark { animation: ba-pop 1.1s ease-out infinite; transform-origin: 206px 160px; }
        .ba-fall { animation: ba-fall 2.2s ease-in infinite; transform-origin: 352px 74px; }
        .ba-rim { animation: ba-rim 1.6s ease-in-out infinite alternate; }
        @keyframes ba-pop { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(1.35); opacity: 0; } }
        @keyframes ba-fall { 0% { transform: translate(0,0) scale(1) rotate(0deg); opacity: 1; } 100% { transform: translate(26px,-30px) scale(0.2) rotate(220deg); opacity: 0; } }
        @keyframes ba-rim { from { stroke-opacity: 0.65; } to { stroke-opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .ba-spark, .ba-fall, .ba-rim { animation: none; } }
      `}</style>
      <rect width="400" height="300" fill="url(#ba-void)" />
      {/* tunnel rings */}
      <g fill="none" stroke="#ff4fa3">
        <ellipse cx="200" cy="186" rx="250" ry="170" strokeOpacity="0.16" strokeWidth="2" />
        <ellipse cx="200" cy="182" rx="320" ry="220" strokeOpacity="0.1" strokeWidth="2" />
        <ellipse cx="200" cy="190" rx="196" ry="132" strokeOpacity="0.2" strokeWidth="1.5" />
      </g>
      <g stroke="#5af0ff" strokeOpacity="0.12" strokeWidth="1.5">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const r = (v: number) => Math.round(v * 10) / 10;
          return <line key={i} x1={r(200 + Math.cos(a) * 160)} y1={r(176 + Math.sin(a) * 104)} x2={r(200 + Math.cos(a) * 420)} y2={r(176 + Math.sin(a) * 300)} />;
        })}
      </g>
      {/* stars */}
      <g fill="#fff1f8">
        {[
          [30, 40, 1.6],
          [72, 22, 1],
          [120, 60, 1.2],
          [300, 30, 1.4],
          [360, 130, 1],
          [24, 200, 1.3],
          [380, 250, 1.6],
          [60, 280, 1],
          [250, 18, 1],
          [340, 290, 1.2],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} opacity="0.8" />
        ))}
      </g>
      {/* platform */}
      <path d="M50 170 A150 96 0 0 0 350 170 L350 190 A150 96 0 0 1 50 190 Z" fill="url(#ba-side)" />
      <ellipse cx="200" cy="170" rx="150" ry="96" fill="url(#ba-top)" />
      <g clipPath="url(#ba-plat)" stroke="#5af0ff" strokeOpacity="0.16" strokeWidth="1">
        {Array.from({ length: 15 }, (_, i) => (
          <line key={`x${i}`} x1={50 + i * 22} y1="60" x2={50 + i * 22} y2="280" />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`y${i}`} x1="40" y1={78 + i * 20} x2="360" y2={78 + i * 20} />
        ))}
      </g>
      <ellipse cx="200" cy="170" rx="44" ry="28" fill="none" stroke="#ff4fa3" strokeOpacity="0.3" strokeWidth="3" />
      <ellipse className="ba-rim" cx="200" cy="170" rx="150" ry="96" fill="none" stroke="#ff4fa3" strokeWidth="5" filter="url(#ba-glow)" />
      {/* falling bumper */}
      <g className="ba-fall">
        <circle cx="352" cy="74" r="16" fill="#b07f00" />
        <circle cx="352" cy="74" r="12" fill="#ffbf1f" />
      </g>
      {/* collision */}
      <ellipse cx="152" cy="186" rx="40" ry="14" fill="#000" opacity="0.35" />
      <ellipse cx="258" cy="180" rx="36" ry="12" fill="#000" opacity="0.35" />
      <path d="M70 150 C 100 160, 120 166, 140 168" stroke="#ff4fa3" strokeOpacity="0.5" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M78 176 C 104 176, 122 176, 136 176" stroke="#ff4fa3" strokeOpacity="0.3" strokeWidth="6" strokeLinecap="round" fill="none" />
      <g transform="translate(160 162) scale(1.1 0.9)">
        <circle r="38" fill="#a8155c" />
        <circle r="30" fill="url(#ba-pink)" />
        <circle r="38" fill="none" stroke="#fff1f8" strokeWidth="2" />
        <circle cx="20" cy="-10" r="5" fill="#fff7c2" />
        <circle cx="20" cy="10" r="5" fill="#fff7c2" />
        <circle cx="-4" r="11" fill="#14081f" opacity="0.5" />
      </g>
      <g transform="translate(252 158) rotate(-12) scale(0.92 1.06)">
        <circle r="34" fill="#178a9b" />
        <circle r="27" fill="url(#ba-cyan)" />
        <circle r="34" fill="none" stroke="#fff1f8" strokeWidth="2" />
        <circle cx="-18" cy="-9" r="4.5" fill="#fff7c2" />
        <circle cx="-18" cy="9" r="4.5" fill="#fff7c2" />
        <circle cx="4" r="10" fill="#14081f" opacity="0.5" />
      </g>
      <g className="ba-spark" filter="url(#ba-glow)">
        <g stroke="#fff1f8" strokeWidth="4" strokeLinecap="round">
          <line x1="206" y1="130" x2="206" y2="112" />
          <line x1="206" y1="190" x2="206" y2="208" />
          <line x1="222" y1="140" x2="236" y2="126" />
          <line x1="190" y1="140" x2="178" y2="128" />
          <line x1="222" y1="180" x2="234" y2="194" />
        </g>
        <circle cx="206" cy="160" r="9" fill="#5af0ff" />
      </g>
      {/* round pips */}
      <g transform="translate(20 20)">
        <rect width="96" height="30" rx="15" fill="#0a0414" opacity="0.8" stroke="#ff4fa3" strokeWidth="2" />
        <circle cx="18" cy="15" r="7" fill="#ff4fa3" />
        <circle cx="40" cy="15" r="7" fill="#ff4fa3" />
        <circle cx="62" cy="15" r="7" fill="none" stroke="#fff1f8" strokeOpacity="0.5" strokeWidth="2" />
        <circle cx="80" cy="15" r="3" fill="#5af0ff" />
      </g>
    </svg>
  );
}

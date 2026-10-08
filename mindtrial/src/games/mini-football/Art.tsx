export default function MiniFootballArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Mini Football cover">
      <defs>
        <radialGradient id="mf-ball" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe9e2" />
        </radialGradient>
        <linearGradient id="mf-shot" x1="0" x2="1">
          <stop offset="0" stopColor="#e9ff57" stopOpacity="0" />
          <stop offset="1" stopColor="#e9ff57" stopOpacity="0.95" />
        </linearGradient>
        <clipPath id="mf-pitch">
          <rect x="0" y="0" width="400" height="300" />
        </clipPath>
      </defs>
      <style>{`
        .mf-ball { animation: mf-roll 2.4s cubic-bezier(.5,0,.3,1) infinite alternate; transform-origin: 262px 150px; }
        .mf-net { animation: mf-shake 2.4s ease-in-out infinite alternate; transform-origin: 380px 150px; }
        @keyframes mf-roll { 0% { transform: translateX(-26px) rotate(-40deg); } 100% { transform: translateX(10px) rotate(30deg); } }
        @keyframes mf-shake { 0%, 80% { transform: scaleX(1); } 100% { transform: scaleX(1.12); } }
        @media (prefers-reduced-motion: reduce) { .mf-ball, .mf-net { animation: none; } }
      `}</style>
      <rect width="400" height="300" fill="#0e3b22" />
      <g clipPath="url(#mf-pitch)">
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={i * 48 - 16} y="0" width="24" height="300" fill="#17603a" opacity="0.75" />
        ))}
        {/* pitch markings */}
        <g fill="none" stroke="#f2fff4" strokeOpacity="0.75" strokeWidth="4">
          <line x1="120" y1="-10" x2="120" y2="310" />
          <circle cx="120" cy="150" r="58" />
          <rect x="300" y="70" width="110" height="160" />
          <rect x="350" y="112" width="60" height="76" />
          <path d="M300 118 A 48 48 0 0 0 300 182" />
        </g>
        <circle cx="120" cy="150" r="6" fill="#f2fff4" />
        {/* goal */}
        <g className="mf-net">
          <rect x="372" y="104" width="34" height="92" fill="#000" opacity="0.3" />
          <g stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.5">
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`h${i}`} x1="372" x2="406" y1={108 + i * 10} y2={108 + i * 10} />
            ))}
            {Array.from({ length: 4 }, (_, i) => (
              <line key={`v${i}`} y1="104" y2="196" x1={378 + i * 9} x2={378 + i * 9} />
            ))}
          </g>
          <path d="M372 104 H406 V196 H372" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinejoin="round" />
        </g>
        {/* defender (azure) diving */}
        <ellipse cx="318" cy="204" rx="26" ry="10" fill="#000" opacity="0.3" />
        <circle cx="314" cy="192" r="24" fill="#2f7bff" stroke="#1446a8" strokeWidth="5" />
        <path d="M296 182 l-14 -6 l4 14 z" fill="#ffffff" stroke="#1446a8" strokeWidth="2.5" strokeLinejoin="round" />
        {/* shot streak */}
        <path d="M70 214 C 150 196, 210 168, 262 150" stroke="url(#mf-shot)" strokeWidth="18" strokeLinecap="round" fill="none" />
        <path d="M96 236 C 170 214, 220 184, 258 166" stroke="#e9ff57" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" fill="none" />
        {/* striker (coral) */}
        <ellipse cx="82" cy="244" rx="40" ry="14" fill="#000" opacity="0.3" />
        <circle cx="76" cy="226" r="36" fill="#ff5a3c" stroke="#b52c14" strokeWidth="6" />
        <circle cx="64" cy="212" r="10" fill="#ffffff" opacity="0.45" />
        <path d="M110 214 l20 -8 l-6 22 z" fill="#ffffff" stroke="#b52c14" strokeWidth="3" strokeLinejoin="round" />
        {/* kick burst */}
        <g stroke="#e9ff57" strokeWidth="5" strokeLinecap="round">
          <line x1="136" y1="190" x2="146" y2="176" />
          <line x1="146" y1="206" x2="164" y2="202" />
          <line x1="130" y1="182" x2="128" y2="166" />
        </g>
        {/* ball */}
        <g className="mf-ball">
          <ellipse cx="266" cy="170" rx="20" ry="7" fill="#000" opacity="0.28" />
          <circle cx="262" cy="150" r="20" fill="url(#mf-ball)" stroke="#0b1f12" strokeWidth="3" />
          <path d="M262 141 l8 6 -3 9 h-10 l-3 -9 z" fill="#1b2a20" />
          <path d="M243 146 l6 -2 M281 146 l-6 -2 M256 168 l2 -6 M268 168 l-2 -6 M262 131 v6" stroke="#1b2a20" strokeWidth="3" strokeLinecap="round" />
        </g>
        {/* scoreline chip */}
        <g transform="translate(18 18)">
          <rect width="118" height="40" rx="20" fill="#04160c" opacity="0.8" />
          <circle cx="22" cy="20" r="8" fill="#ff5a3c" />
          <circle cx="96" cy="20" r="8" fill="#2f7bff" />
          <text x="59" y="27" textAnchor="middle" fill="#e9ff57" fontFamily="ui-monospace, monospace" fontWeight="800" fontSize="20">
            2–2
          </text>
        </g>
      </g>
    </svg>
  );
}

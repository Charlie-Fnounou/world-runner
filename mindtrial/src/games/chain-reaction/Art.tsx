/**
 * Cover art: a blueprint-on-paper Rube Goldberg machine — a ball rolling
 * down a ramp into a toppling row of dominoes, a bomb mid-blast and a star.
 */

const PAPER = "#f4ecdf";
const INK = "#1b1b1b";
const RED = "#ff4f2e";
const BLUE = "#2e6bff";

function star(cx: number, cy: number, r: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : inner;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return pts.join(" ");
}

const DOMINOES = [
  { x: 150, a: 62 },
  { x: 172, a: 58 },
  { x: 194, a: 50 },
  { x: 216, a: 36 },
  { x: 238, a: 16 },
  { x: 260, a: 0 },
  { x: 282, a: 0 },
];

export default function ChainReactionArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Chain Reaction cover art">
      <style>{`
        .cr-blast { animation: cr-pulse 1.6s ease-out infinite; transform-origin: 330px 214px; }
        .cr-star { animation: cr-spin 6s linear infinite; transform-origin: 340px 90px; }
        @keyframes cr-pulse { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(1.25); opacity: 0; } }
        @keyframes cr-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .cr-blast, .cr-star { animation: none; } }
      `}</style>
      <defs>
        <pattern id="cr-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0H0V10" fill="none" stroke={BLUE} strokeOpacity="0.1" strokeWidth="0.6" />
        </pattern>
        <pattern id="cr-grid-big" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M50 0H0V50" fill="none" stroke={BLUE} strokeOpacity="0.22" strokeWidth="0.8" />
        </pattern>
        <pattern id="cr-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill={INK} />
          <line x1="0" y1="0" x2="0" y2="6" stroke={PAPER} strokeOpacity="0.3" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill={PAPER} />
      <rect width="400" height="300" fill="url(#cr-grid)" />
      <rect width="400" height="300" fill="url(#cr-grid-big)" />

      {/* Dropper */}
      <path d="M22 12 L36 34 L36 42 M70 12 L56 34 L56 42" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="76" y="20" fontFamily="ui-monospace, monospace" fontSize="8" fontWeight="700" fill={INK}>
        DROP
      </text>
      <line x1="46" y1="52" x2="46" y2="88" stroke={BLUE} strokeOpacity="0.5" strokeWidth="1.2" strokeDasharray="3 4" />

      {/* Ramp */}
      <line x1="24" y1="98" x2="138" y2="150" stroke="rgba(27,27,27,0.15)" strokeWidth="8" strokeLinecap="round" transform="translate(3 4)" />
      <line x1="24" y1="98" x2="138" y2="150" stroke={BLUE} strokeWidth="8" strokeLinecap="round" />
      <circle cx="81" cy="124" r="2" fill={PAPER} />
      {/* dimension annotation */}
      <g stroke={BLUE} strokeWidth="0.8" fill="none" opacity="0.8">
        <path d="M30 86 L142 137" strokeDasharray="2 3" />
        <path d="M96 128 A 26 26 0 0 0 100 112" />
      </g>
      <text x="104" y="112" fontFamily="ui-monospace, monospace" fontSize="8" fill={BLUE}>
        24°
      </text>

      {/* Ball trail and ball */}
      <path d="M46 60 C 50 80, 60 98, 90 118 S 130 150, 132 170" stroke={RED} strokeOpacity="0.35" strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx="135" cy="181" r="12" fill="rgba(27,27,27,0.15)" />
      <circle cx="132" cy="177" r="12" fill={RED} stroke={INK} strokeWidth="2.5" />
      <circle cx="128" cy="173" r="3.4" fill="#fff" fillOpacity="0.75" />

      {/* Floor */}
      <line x1="10" y1="252" x2="390" y2="252" stroke="url(#cr-hatch)" strokeWidth="14" strokeLinecap="round" />

      {/* Dominoes */}
      {DOMINOES.map((d, i) => (
        <g key={i} transform={`translate(${d.x} 245) rotate(${d.a})`}>
          <rect x="-5" y="-58" width="10" height="58" rx="2.5" fill="rgba(27,27,27,0.15)" transform="translate(3 3)" />
          <rect x="-5" y="-58" width="10" height="58" rx="2.5" fill={i < 3 ? INK : BLUE} />
          <rect x="-3" y="-30" width="6" height="2" fill={PAPER} />
          <circle cx="0" cy="-46" r="1.8" fill={PAPER} />
          <circle cx="0" cy="-14" r="1.8" fill={PAPER} />
        </g>
      ))}
      {/* motion ticks */}
      <g stroke={INK} strokeWidth="2" strokeLinecap="round">
        <path d="M244 176 l8 -6" />
        <path d="M250 186 l9 -3" />
        <path d="M228 170 l6 -8" />
      </g>

      {/* Bomb blast */}
      <circle className="cr-blast" cx="330" cy="214" r="46" fill="none" stroke={RED} strokeWidth="5" />
      <circle cx="330" cy="214" r="30" fill="#ffb02e" fillOpacity="0.85" />
      <polygon points={star(330, 214, 30, 14)} fill={RED} />
      <circle cx="330" cy="214" r="10" fill={INK} />
      <g fill={INK}>
        <rect x="292" y="176" width="6" height="6" transform="rotate(20 295 179)" />
        <rect x="368" y="186" width="5" height="5" />
        <rect x="356" y="160" width="4" height="4" />
        <rect x="300" y="240" width="4" height="4" />
      </g>
      <g fill={RED}>
        <rect x="372" y="222" width="5" height="5" />
        <rect x="312" y="164" width="4" height="4" />
      </g>

      {/* Star target */}
      <g className="cr-star">
        <polygon points={star(340, 90, 26, 11)} fill={RED} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      </g>
      <circle cx="340" cy="90" r="40" fill="none" stroke={RED} strokeWidth="2" strokeDasharray="4 5" />
      <polygon points={star(250, 60, 14, 6)} fill="rgba(255,79,46,0.14)" stroke={RED} strokeWidth="2" strokeDasharray="4 3" />

      {/* Title block, like an engineering drawing */}
      <g fontFamily="ui-monospace, monospace" fill={INK}>
        <rect x="236" y="268" width="150" height="24" fill={PAPER} stroke={INK} strokeWidth="1.5" />
        <line x1="296" y1="268" x2="296" y2="292" stroke={INK} strokeWidth="1" />
        <text x="242" y="283" fontSize="7" fontWeight="700">
          FIG. 01
        </text>
        <text x="302" y="283" fontSize="7">
          CHAIN REACTION
        </text>
      </g>
    </svg>
  );
}

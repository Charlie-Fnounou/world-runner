const INK = "#2a0a14";
const PINK = "#e8175d";
const TEAL = "#00a88f";
const BG = "#fdf0f3";

function Critter({ x, y, odd = false }: { x: number; y: number; odd?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.34)`}>
      <g transform={`scale(${odd ? -1 : 1} 1)`}>
        <path d="M12 -26 Q 20 -40 30 -44" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <circle cx="31" cy="-44" r="7" fill="#ffd23f" stroke={INK} strokeWidth="3.5" />
        <circle cx="0" cy="6" r="36" fill={PINK} stroke={INK} strokeWidth="4.5" />
        {[-13, 13].map((ex) => (
          <g key={ex}>
            <circle cx={ex} cy="0" r="8.5" fill="#fff8fa" stroke={INK} strokeWidth="2.5" />
            <circle cx={ex + 3} cy="1" r="3.8" fill={INK} />
          </g>
        ))}
        <path d="M-11 17 Q 0 27 11 17" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      </g>
    </g>
  );
}

export default function VisualHuntArt({ className }: { className?: string }) {
  const cols = 9;
  const rows = 6;
  const odd = { c: 6, r: 2 };
  const items: { x: number; y: number; odd: boolean }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const jx = ((c * 7 + r * 13) % 9) - 4;
      const jy = ((c * 11 + r * 5) % 7) - 3;
      items.push({ x: 26 + c * 44 + jx, y: 34 + r * 46 + jy, odd: c === odd.c && r === odd.r });
    }
  const o = items.find((i) => i.odd)!;
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Visual Hunt cover">
      <style>{`
        .vhA-lens { animation: vhA-hover 4s ease-in-out infinite; }
        .vhA-ring { animation: vhA-ring 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes vhA-hover { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-4px,3px); } }
        @keyframes vhA-ring { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
        @media (prefers-reduced-motion: reduce) { .vhA-lens, .vhA-ring { animation: none; } }
      `}</style>
      <rect width="400" height="300" fill={BG} />
      {items.map((it, i) => (
        <g key={i} opacity={it.odd ? 1 : 0.92}>
          <Critter x={it.x} y={it.y} odd={it.odd} />
        </g>
      ))}
      {/* Spotlight ring on the odd one */}
      <circle className="vhA-ring" cx={o.x} cy={o.y + 1} r="22" fill="none" stroke={TEAL} strokeWidth="5" />
      {/* Magnifying glass */}
      <g className="vhA-lens">
        <line x1={o.x + 34} y1={o.y + 36} x2={o.x + 92} y2={o.y + 100} stroke={INK} strokeWidth="16" strokeLinecap="round" />
        <line x1={o.x + 34} y1={o.y + 36} x2={o.x + 92} y2={o.y + 100} stroke={PINK} strokeWidth="8" strokeLinecap="round" />
        <circle cx={o.x} cy={o.y} r="40" fill="#ffffff" fillOpacity="0.28" stroke={INK} strokeWidth="9" />
        <path d={`M${o.x - 26} ${o.y - 14} A 30 30 0 0 1 ${o.x - 8} ${o.y - 30}`} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      </g>
      {/* Label */}
      <g transform="translate(18 262)">
        <rect x="0" y="0" width="150" height="28" rx="14" fill={INK} />
        <text x="75" y="19" textAnchor="middle" fontFamily="var(--font-mono), monospace" fontWeight="700" fontSize="12" letterSpacing="2" fill={BG}>
          1 OF 54 IS ODD
        </text>
      </g>
    </svg>
  );
}

const BODY = "M18 90 V48 a32 32 0 0 1 64 0 V90 l-10.7 -9 l-10.7 9 l-10.6 -9 l-10.7 9 l-10.6 -9 Z";

function Ghost({ x, y, s, color, cls }: { x: number; y: number; s: number; color: string; cls?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={cls} filter="url(#gmA-glow)">
        <path d={BODY} fill={color} stroke="#120d24" strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="35" cy="34" rx="7" ry="4" fill="#fff" opacity="0.45" transform="rotate(-25 35 34)" />
        <ellipse cx="39" cy="51" rx="6" ry="8" fill="#120d24" />
        <ellipse cx="61" cy="51" rx="6" ry="8" fill="#120d24" />
        <circle cx="41" cy="48" r="2.2" fill="#fff" />
        <circle cx="63" cy="48" r="2.2" fill="#fff" />
        <circle cx="29" cy="63" r="5" fill="#ff6bd6" opacity="0.55" />
        <circle cx="71" cy="63" r="5" fill="#ff6bd6" opacity="0.55" />
        <ellipse cx="50" cy="67" rx="5" ry="6" fill="#120d24" />
      </g>
    </g>
  );
}

function Sleeper({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity="0.22">
      <path d={BODY} fill="none" stroke="#efe8ff" strokeWidth="3" strokeLinejoin="round" />
      <path d="M34 52 q6 5 12 0 M54 52 q6 5 12 0" stroke="#efe8ff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  );
}

export default function GhostMemoryArt({ className }: { className?: string }) {
  const cell = 66;
  const gap = 10;
  const ox = 112;
  const oy = 52;
  const tiles = Array.from({ length: 9 }, (_, i) => ({ i, x: ox + (i % 3) * (cell + gap), y: oy + Math.floor(i / 3) * (cell + gap) }));
  const lit: Record<number, string> = { 1: "#7cf7c9", 5: "#ffd36b", 6: "#8fb8ff" };
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Ghost Memory cover">
      <defs>
        <radialGradient id="gmA-sky" cx="50%" cy="45%" r="75%">
          <stop offset="0" stopColor="#2c1e5a" />
          <stop offset="0.65" stopColor="#120d24" />
        </radialGradient>
        <filter id="gmA-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{`
        .gmA-bob { animation: gmA-bob 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .gmA-bob2 { animation: gmA-bob 3.4s ease-in-out -1.2s infinite; transform-box: fill-box; transform-origin: center; }
        .gmA-tw { animation: gmA-tw 2.4s ease-in-out infinite; }
        @keyframes gmA-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes gmA-tw { 0%,100% { opacity: .2; } 50% { opacity: .9; } }
        @media (prefers-reduced-motion: reduce) { .gmA-bob, .gmA-bob2, .gmA-tw { animation: none; } }
      `}</style>
      <rect width="400" height="300" fill="url(#gmA-sky)" />
      {[
        [24, 30], [60, 70], [40, 140], [20, 230], [70, 270], [350, 120], [372, 200], [330, 260], [300, 24], [88, 18], [380, 60],
      ].map(([x, y], i) => (
        <circle key={i} className="gmA-tw" style={{ animationDelay: `${i * 0.31}s` }} cx={x} cy={y} r={i % 3 ? 1.4 : 2.2} fill="#efe8ff" />
      ))}
      {/* Moon */}
      <circle cx="350" cy="52" r="30" fill="#fff7d6" opacity="0.9" />
      <circle cx="338" cy="44" r="27" fill="#241a4c" />
      {/* Grid */}
      {tiles.map((t) => {
        const c = lit[t.i];
        return (
          <g key={t.i}>
            <rect
              x={t.x}
              y={t.y}
              width={cell}
              height={cell}
              rx="15"
              fill={c ? c : t.i === 3 ? "#ff6bd6" : "#efe8ff"}
              fillOpacity={c || t.i === 3 ? 0.18 : 0.06}
              stroke={c ?? (t.i === 3 ? "#ff6bd6" : "#efe8ff")}
              strokeOpacity={c || t.i === 3 ? 0.9 : 0.15}
              strokeWidth="2"
            />
            {!c && t.i !== 3 && <Sleeper x={t.x + 9} y={t.y + 9} s={0.48} />}
          </g>
        );
      })}
      {Object.entries(lit).map(([k, c], j) => {
        const t = tiles[Number(k)];
        return <Ghost key={k} x={t.x + 7} y={t.y + 5} s={0.52} color={c} cls={j % 2 ? "gmA-bob2" : "gmA-bob"} />;
      })}
      {/* Decoy imp */}
      <g transform={`translate(${tiles[3].x + 7} ${tiles[3].y + 5}) scale(0.52)`}>
        <g className="gmA-bob2" filter="url(#gmA-glow)">
          <path d="M24 30 L18 6 L38 22 Z M76 30 L82 6 L62 22 Z" fill="#ff6bd6" stroke="#120d24" strokeWidth="3" strokeLinejoin="round" />
          <path d="M18 92 V50 a32 32 0 0 1 64 0 V92 l-8 -12 l-8 12 l-8 -12 l-8 12 l-8 -12 l-8 12 l-8 -12 Z" fill="#ff6bd6" stroke="#120d24" strokeWidth="3" strokeLinejoin="round" />
          <path d="M30 40 L45 47 M70 40 L55 47" stroke="#120d24" strokeWidth="5" strokeLinecap="round" />
          <circle cx="39" cy="54" r="5" fill="#120d24" />
          <circle cx="61" cy="54" r="5" fill="#120d24" />
          <path d="M38 70 L44 65 L50 70 L56 65 L62 70" stroke="#120d24" strokeWidth="4" fill="none" strokeLinejoin="round" />
        </g>
      </g>
      {/* Sequence badges */}
      {[
        [1, "1"],
        [5, "2"],
        [6, "3"],
      ].map(([k, n]) => {
        const t = tiles[Number(k)];
        return (
          <g key={String(k)}>
            <circle cx={t.x + cell - 2} cy={t.y + 2} r="11" fill="#7cf7c9" />
            <text x={t.x + cell - 2} y={t.y + 7} textAnchor="middle" fontSize="14" fontWeight="900" fill="#120d24" fontFamily="var(--font-display), system-ui">
              {n}
            </text>
          </g>
        );
      })}
      {/* Big floating ghost */}
      <Ghost x={4} y={176} s={0.95} color="#efe8ff" cls="gmA-bob" />
      <text x="22" y="120" fontFamily="var(--font-serif), Georgia, serif" fontStyle="italic" fontSize="30" fill="#7cf7c9" transform="rotate(-8 22 120)">
        boo!
      </text>
    </svg>
  );
}

export default function FortuneFactoryArt({ className }: { className?: string }) {
  const bars = [38, 52, 46, 70, 64, 96, 88, 128, 150];
  const coins = [
    [64, 62, 15],
    [96, 40, 11],
    [330, 52, 13],
    [356, 92, 9],
    [298, 28, 8],
  ];
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Fortune Factory cover">
      <style>{`
        .ff-coin { animation: ff-art-bob 3.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .ff-smoke { animation: ff-art-smoke 4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes ff-art-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
        @keyframes ff-art-smoke { 0% { transform: translateY(0) scale(.9); opacity:.8 } 100% { transform: translateY(-16px) scale(1.25); opacity:0 } }
        @media (prefers-reduced-motion: reduce) { .ff-coin, .ff-smoke { animation: none; } }
      `}</style>
      <rect width="400" height="300" fill="#0f1a14" />
      {/* faint ledger grid */}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1="0" x2="400" y1={40 + i * 30} y2={40 + i * 30} stroke="#c8f55a" strokeOpacity="0.07" />
      ))}
      {/* rising bars */}
      {bars.map((h, i) => (
        <rect key={i} x={150 + i * 24} y={262 - h} width="16" height={h} rx="3" fill={i === bars.length - 1 ? "#ffcf4a" : "#c8f55a"} fillOpacity={0.25 + i * 0.08} />
      ))}
      <path d="M150 240 L174 222 L198 230 L222 200 L246 208 L270 170 L294 180 L318 140 L342 112" fill="none" stroke="#ffcf4a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M330 108 L344 110 L340 124" fill="none" stroke="#ffcf4a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* factory */}
      <g>
        <rect x="18" y="168" width="140" height="94" fill="#c8f55a" />
        <path d="M18 168 L48 146 L48 168 L78 146 L78 168 L108 146 L108 168 Z" fill="#c8f55a" />
        <rect x="118" y="100" width="22" height="68" fill="#c8f55a" />
        <rect x="114" y="94" width="30" height="10" fill="#0f1a14" stroke="#c8f55a" strokeWidth="3" />
        <circle className="ff-smoke" cx="131" cy="80" r="11" fill="#f2f7e9" fillOpacity="0.35" />
        <circle className="ff-smoke" cx="142" cy="64" r="8" fill="#f2f7e9" fillOpacity="0.25" style={{ animationDelay: "1.3s" }} />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={32 + i * 40} y="190" width="24" height="24" rx="3" fill="#0f1a14" />
        ))}
        <rect x="62" y="226" width="44" height="36" fill="#0f1a14" />
        <text x="84" y="252" textAnchor="middle" fontFamily="Bricolage Grotesque, ui-sans-serif, sans-serif" fontWeight="900" fontSize="24" fill="#ffcf4a">
          ¢
        </text>
      </g>
      {/* coins */}
      {coins.map(([x, y, r], i) => (
        <g key={i} className="ff-coin" style={{ animationDelay: `${i * 0.45}s` }}>
          <circle cx={x} cy={y} r={r} fill="#ffcf4a" />
          <circle cx={x} cy={y} r={r * 0.68} fill="none" stroke="#0f1a14" strokeOpacity="0.35" strokeWidth="2" />
        </g>
      ))}
      <rect x="0" y="262" width="400" height="38" fill="#c8f55a" />
      <text x="16" y="288" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="13" fontWeight="700" fill="#0f1a14" letterSpacing="1">
        100,000,000,000 ¢
      </text>
      <text x="384" y="288" textAnchor="end" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="11" fill="#0f1a14">
        YEAR 01 → 20
      </text>
    </svg>
  );
}

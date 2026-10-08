export default function PatternBreakerArt({ className }: { className?: string }) {
  const arrow = "-0.95,-0.28 0.15,-0.28 0.15,-0.7 0.98,0 0.15,0.7 0.15,0.28 -0.95,0.28";
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Pattern Breaker cover">
      <style>{`
        .pb-spin { transform-box: fill-box; transform-origin: center; animation: pb-art-spin 6s steps(4) infinite; }
        .pb-blink { animation: pb-art-blink 1.4s ease-in-out infinite; }
        @keyframes pb-art-spin { to { transform: rotate(360deg); } }
        @keyframes pb-art-blink { 0%,100% { opacity: 1 } 50% { opacity: .25 } }
        @media (prefers-reduced-motion: reduce) { .pb-spin, .pb-blink { animation: none; } }
      `}</style>
      <rect width="400" height="300" fill="#eaf2ff" />
      {/* Swiss grid */}
      {[50, 100, 150, 200, 250, 300, 350].map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="300" stroke="#0a1a3a" strokeOpacity="0.07" />
      ))}
      {[50, 100, 150, 200, 250].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#0a1a3a" strokeOpacity="0.07" />
      ))}
      {/* big blue disc + orange quarter */}
      <circle cx="300" cy="96" r="118" fill="#2457ff" />
      <path d="M0 300 L0 196 A104 104 0 0 1 104 300 Z" fill="#ff8a00" />
      {/* giant question mark */}
      <text x="292" y="166" textAnchor="middle" fontFamily="Bricolage Grotesque, ui-sans-serif, sans-serif" fontWeight="900" fontSize="190" fill="#eaf2ff">
        ?
      </text>
      {/* number sequence strip */}
      <g fontFamily="Bricolage Grotesque, ui-sans-serif, sans-serif" fontWeight="900" fill="#0a1a3a">
        <text x="24" y="58" fontSize="44">2</text>
        <text x="64" y="58" fontSize="44">4</text>
        <text x="104" y="58" fontSize="44">8</text>
        <text x="146" y="58" fontSize="44">16</text>
      </g>
      <rect x="24" y="72" width="168" height="6" fill="#0a1a3a" />
      {/* rotating arrow sequence */}
      {[0, 90, 180].map((r, i) => (
        <g key={r} transform={`translate(${46 + i * 56} 122) rotate(${r}) scale(20)`}>
          <polygon points={arrow} fill="#0a1a3a" />
        </g>
      ))}
      <g transform="translate(214 122)">
        <rect x="-24" y="-24" width="48" height="48" fill="none" stroke="#ff8a00" strokeWidth="4" strokeDasharray="8 5" className="pb-blink" />
        <g className="pb-spin">
          <polygon points={arrow} transform="scale(16) rotate(270)" fill="#ff8a00" />
        </g>
      </g>
      {/* mini matrix */}
      <g transform="translate(150 178)">
        <rect width="114" height="114" fill="#0a1a3a" />
        {[0, 1, 2].flatMap((row) =>
          [0, 1, 2].map((c) => {
            const x = 3 + c * 37;
            const y = 3 + row * 37;
            const last = row === 2 && c === 2;
            const shape = (c + row) % 3;
            const color = ["#2457ff", "#ff8a00", "#0a1a3a"][row];
            return (
              <g key={`${row}${c}`}>
                <rect x={x} y={y} width="34" height="34" fill={last ? "#ff8a00" : "#ffffff"} />
                {!last && shape === 0 && <circle cx={x + 17} cy={y + 17} r="10" fill={color} />}
                {!last && shape === 1 && <rect x={x + 8} y={y + 8} width="18" height="18" fill={color} />}
                {!last && shape === 2 && <polygon points={`${x + 17},${y + 6} ${x + 29},${y + 27} ${x + 5},${y + 27}`} fill={color} />}
                {last && (
                  <text x={x + 17} y={y + 28} textAnchor="middle" fontFamily="Bricolage Grotesque, ui-sans-serif, sans-serif" fontWeight="900" fontSize="28" fill="#ffffff">
                    ?
                  </text>
                )}
              </g>
            );
          }),
        )}
      </g>
      {/* poster type */}
      <text x="386" y="284" textAnchor="end" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="11" letterSpacing="3" fill="#0a1a3a">
        RULE Nº 25
      </text>
      <rect x="288" y="232" width="98" height="4" fill="#2457ff" />
    </svg>
  );
}

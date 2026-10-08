function Car({ x, y, r, color, shade }: { x: number; y: number; r: number; color: string; shade: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x="-19" y="-7" width="40" height="22" rx="7" fill="#16161a" opacity="0.25" />
      <rect x="-14" y="-13" width="9" height="5" fill="#16161a" />
      <rect x="8" y="-13" width="9" height="5" fill="#16161a" />
      <rect x="-14" y="8" width="9" height="5" fill="#16161a" />
      <rect x="8" y="8" width="9" height="5" fill="#16161a" />
      <rect x="-20" y="-10" width="40" height="20" rx="6" fill={color} stroke={shade} strokeWidth="2" />
      <rect x="-19" y="-2.5" width="38" height="5" fill="#fff" opacity="0.75" />
      <rect x="-8" y="-7" width="16" height="14" rx="3" fill="#16161a" />
      <rect x="4" y="-6" width="3" height="12" fill="#aad2ff" opacity="0.7" />
    </g>
  );
}

export default function MicroRacersArt({ className }: { className?: string }) {
  const track = "M-20 250 C 60 250, 90 170, 170 170 S 260 250, 320 210 S 360 90, 290 70 S 140 110, 90 60 S 40 -10, -20 20";
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Toy race cars drifting on a tabletop track">
      <defs>
        <pattern id="mr-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0 H0 V20" fill="none" stroke="#16161a" strokeOpacity="0.07" strokeWidth="1" />
        </pattern>
        <pattern id="mr-check" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#fbfaf6" />
          <rect width="4" height="4" fill="#16161a" />
          <rect x="4" y="4" width="4" height="4" fill="#16161a" />
        </pattern>
      </defs>
      <style>{`
        .mr-art-dash { animation: mrArtDash 1.2s linear infinite; }
        @keyframes mrArtDash { to { stroke-dashoffset: -40; } }
        @media (prefers-reduced-motion: reduce) { .mr-art-dash { animation: none; } }
      `}</style>
      <rect width="400" height="300" fill="#e9e4d8" />
      <rect width="400" height="300" fill="url(#mr-grid)" />
      {/* coffee ring */}
      <circle cx="235" cy="135" r="38" fill="#8c5626" opacity="0.07" />
      <path d="M200 140 A38 38 0 1 1 260 165" fill="none" stroke="#784619" strokeOpacity="0.28" strokeWidth="4" />
      <path d="M205 120 A34 34 0 0 1 266 128" fill="none" stroke="#784619" strokeOpacity="0.16" strokeWidth="2" />
      {/* pencil */}
      <g transform="translate(36 128) rotate(-18)">
        <rect x="0" y="0" width="120" height="13" fill="#f6c431" />
        <rect x="0" y="8" width="120" height="5" fill="#000" opacity="0.1" />
        <rect x="120" y="0" width="12" height="13" fill="#c9ccd2" />
        <rect x="132" y="0" width="12" height="13" rx="3" fill="#f28fa0" />
        <path d="M0 0 L-24 6.5 L0 13 Z" fill="#ecc9a0" />
        <path d="M-15 4 L-24 6.5 L-15 9 Z" fill="#2b2b30" />
      </g>
      {/* track: shadow, tape, road */}
      <path d={track} fill="none" stroke="#16161a" strokeOpacity="0.15" strokeWidth="74" transform="translate(3 5)" strokeLinecap="round" />
      <path d={track} fill="none" stroke="#ecd28f" strokeWidth="72" strokeLinecap="round" />
      <path d={track} fill="none" stroke="#3b3b44" strokeWidth="58" strokeLinecap="round" />
      <path className="mr-art-dash" d={track} fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="3" strokeDasharray="14 26" />
      {/* checkered start */}
      <rect x="150" y="141" width="16" height="58" fill="url(#mr-check)" transform="rotate(8 158 170)" />
      {/* boost chevrons */}
      <g fill="none" stroke="#ff2f4f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" transform="translate(268 222) rotate(-38)">
        <path d="M-14 -10 L-5 0 L-14 10" opacity="0.5" />
        <path d="M-2 -10 L7 0 L-2 10" opacity="0.75" />
        <path d="M10 -10 L19 0 L10 10" />
      </g>
      {/* skid marks */}
      <path d="M300 140 Q 320 110 300 88" fill="none" stroke="#16161a" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M312 146 Q 334 112 312 90" fill="none" stroke="#16161a" strokeOpacity="0.3" strokeWidth="3" />
      <Car x={306} y={150} r={-100} color="#ff2f4f" shade="#a3001b" />
      <Car x={210} y={205} r={-25} color="#2f7bff" shade="#1446a8" />
      <Car x={95} y={185} r={-12} color="#3fcf5a" shade="#1f8a33" />
      {/* title tape */}
      <g transform="translate(18 266) rotate(-3)">
        <rect x="0" y="-22" width="190" height="34" fill="#ecd28f" opacity="0.95" />
        <text x="12" y="3" fontFamily="var(--font-bricolage), system-ui, sans-serif" fontWeight="900" fontSize="24" fill="#16161a" letterSpacing="-0.5">
          MICRO RACERS
        </text>
      </g>
      <g transform="translate(352 30)">
        <rect x="-26" y="-14" width="52" height="28" rx="14" fill="#16161a" />
        <circle cx="-12" cy="0" r="7" fill="#ff2f4f" />
        <circle cx="12" cy="0" r="7" fill="#3fdc6a" />
      </g>
    </svg>
  );
}

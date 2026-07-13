export function ElevationChart({ profile, color, h = 110 }: { profile: number[]; color: string; h?: number }) {
  if (profile.length < 2) return null;

  const min = Math.min(...profile);
  const max = Math.max(...profile);
  const rng = Math.max(max - min, 10);
  const w = 400;
  const pts = profile.map((v, i) => `${(i / (profile.length - 1)) * w},${h - 8 - ((v - min) / rng) * (h - 22)}`);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={color} opacity="0.15" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="4" y="12" fontSize="10" fill="var(--wr-mut)" fontFamily="monospace">
        {max} m
      </text>
      <text x="4" y={h - 2} fontSize="10" fill="var(--wr-mut)" fontFamily="monospace">
        {min} m
      </text>
    </svg>
  );
}

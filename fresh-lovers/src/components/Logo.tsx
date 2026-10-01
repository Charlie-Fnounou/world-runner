import { cartouchePath } from "@/lib/cartouche";

type Props = {
  className?: string;
  /** frame colour */
  fill?: string;
  /** letter colour */
  ink?: string;
  title?: string;
};

/**
 * Fresh Lovers wordmark in its scalloped cartouche, redrawn as SVG from the
 * label artwork. Replace with the official vector when available.
 */
export function Logo({ className, fill = "var(--ink)", ink = "var(--paper)", title = "Fresh Lovers" }: Props) {
  const W = 200;
  const H = 120;
  const outer = cartouchePath(W, H, 26, 7);
  const inner = cartouchePath(W - 16, H - 16, 20, 5);
  return (
    <svg viewBox={`0 0 ${W + 14} ${H + 14}`} className={className} role="img" aria-label={title}>
      <path d={outer} fill={fill} />
      <path d={inner} transform="translate(8 8)" fill="none" stroke={ink} strokeWidth="1.4" opacity="0.9" />
      {/* sprout */}
      <g transform="translate(107 24) scale(1.15)" fill={ink}>
        <path d="M0 9 C-1 3 -6 -1 -11 0 C-10 6 -5 9 0 9 Z" />
        <path d="M0 9 C1 3 6 -1 11 0 C10 6 5 9 0 9 Z" />
      </g>
      <text
        x="107"
        y="80"
        textAnchor="middle"
        fill={ink}
        style={{ fontFamily: "var(--font-logo)", fontSize: 40, letterSpacing: 2, fontWeight: 400 }}
      >
        FRESH
      </text>
      <rect x="62" y="86" width="90" height="1.6" fill={ink} />
      <text
        x="108"
        y="106"
        textAnchor="middle"
        fill={ink}
        style={{ fontFamily: "var(--font-sans)", fontSize: 15, letterSpacing: 5.5, fontWeight: 400 }}
      >
        lovers
      </text>
    </svg>
  );
}

/** Bare cartouche shape — used as decorative frame, badge and button. */
export function Cartouche({
  className,
  fill = "currentColor",
  stroke,
  w = 100,
  h = 140,
  inset = true,
}: {
  className?: string;
  fill?: string;
  stroke?: string;
  w?: number;
  h?: number;
  inset?: boolean;
}) {
  const b = Math.min(w, h) * 0.05;
  const r = Math.min(w, h) * 0.17;
  return (
    <svg viewBox={`0 0 ${w + b * 2} ${h + b * 2}`} className={className} aria-hidden="true" preserveAspectRatio="none">
      <path d={cartouchePath(w, h, r, b)} fill={fill} />
      {inset && stroke && (
        <path
          d={cartouchePath(w - 10, h - 10, r * 0.8, b * 0.8)}
          transform="translate(5 5)"
          fill="none"
          stroke={stroke}
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

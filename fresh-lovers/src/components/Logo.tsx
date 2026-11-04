import { cartouchePath } from "@/lib/cartouche";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/lib/logo";

type Props = {
  className?: string;
  /** cartouche colour — the lettering is knocked out and shows what is behind */
  fill?: string;
  title?: string;
};

/** Official Fresh Lovers logo, traced from the 2026 catalog cover. */
export function Logo({ className, fill = "var(--ink)", title = "Fresh Lovers" }: Props) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label={title}>
      <path d={LOGO_PATH} fill={fill} fillRule="evenodd" />
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

/**
 * The Fresh Lovers cartouche — the scalloped label frame from the logo.
 * Concave corner notches + gently convex edges. Used as logo, masks, buttons.
 *
 * Returns an SVG path for a frame of width w × height h, drawn inside
 * a box padded by `bulge` on each side (so the viewBox is (w + 2b) × (h + 2b)).
 */
export function cartouchePath(w: number, h: number, r = Math.min(w, h) * 0.16, bulge = Math.min(w, h) * 0.05) {
  const b = bulge;
  const x0 = b;
  const y0 = b;
  const x1 = b + w;
  const y1 = b + h;
  const f = (n: number) => +n.toFixed(2);
  // small lobe radius at each corner, tucked inside the notch — like the logo
  return [
    `M${f(x0 + r)},${f(y0)}`,
    `Q${f(x0 + w / 2)},${f(y0 - b * 2)} ${f(x1 - r)},${f(y0)}`,
    `A${f(r)},${f(r)} 0 0 0 ${f(x1)},${f(y0 + r)}`,
    `Q${f(x1 + b * 2)},${f(y0 + h / 2)} ${f(x1)},${f(y1 - r)}`,
    `A${f(r)},${f(r)} 0 0 0 ${f(x1 - r)},${f(y1)}`,
    `Q${f(x0 + w / 2)},${f(y1 + b * 2)} ${f(x0 + r)},${f(y1)}`,
    `A${f(r)},${f(r)} 0 0 0 ${f(x0)},${f(y1 - r)}`,
    `Q${f(x0 - b * 2)},${f(y0 + h / 2)} ${f(x0)},${f(y0 + r)}`,
    `A${f(r)},${f(r)} 0 0 0 ${f(x0 + r)},${f(y0)}`,
    "Z",
  ].join(" ");
}

/** Same frame in objectBoundingBox units (0..1) for CSS clip-path: url(#id) */
export function cartoucheClipPath(aspect = 0.72) {
  // normalised: width 1, height 1 but proportioned via r relative to aspect
  const w = 1;
  const h = 1;
  const r = 0.14;
  const ry = r * aspect;
  const b = 0.018;
  const f = (n: number) => +n.toFixed(4);
  return [
    `M${f(r)},${f(b)}`,
    `Q0.5,${f(-b)} ${f(w - r)},${f(b)}`,
    `A${f(r)},${f(ry)} 0 0 0 ${f(w - b)},${f(ry + b)}`,
    `Q${f(w + b)},0.5 ${f(w - b)},${f(h - ry - b)}`,
    `A${f(r)},${f(ry)} 0 0 0 ${f(w - r)},${f(h - b)}`,
    `Q0.5,${f(h + b)} ${f(r)},${f(h - b)}`,
    `A${f(r)},${f(ry)} 0 0 0 ${f(b)},${f(h - ry - b)}`,
    `Q${f(-b)},0.5 ${f(b)},${f(ry + b)}`,
    `A${f(r)},${f(ry)} 0 0 0 ${f(r)},${f(b)}`,
    "Z",
  ].join(" ");
}

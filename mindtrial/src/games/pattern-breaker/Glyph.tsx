import type { Glyph, ShapeKind } from "./puzzles";
import { PALETTE } from "./puzzles";

/** Copies laid out inside a 100×100 cell, plus the base radius for that count. */
const LAYOUT: Record<number, { pts: [number, number][]; r: number }> = {
  1: { pts: [[50, 50]], r: 36 },
  2: { pts: [[28, 50], [72, 50]], r: 20 },
  3: { pts: [[50, 27], [27, 71], [73, 71]], r: 19 },
  4: { pts: [[28, 28], [72, 28], [28, 72], [72, 72]], r: 18 },
  5: { pts: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]], r: 15 },
  6: { pts: [[20, 32], [50, 32], [80, 32], [20, 68], [50, 68], [80, 68]], r: 13.5 },
};

const SIZE_SCALE = [0.5, 0.74, 1];

function star(points: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const rr = i % 2 === 0 ? outer : inner;
    pts.push(`${(Math.cos(a) * rr).toFixed(3)},${(Math.sin(a) * rr).toFixed(3)}`);
  }
  return pts.join(" ");
}

function poly(n: number, r = 1, offset = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = offset + (i * Math.PI * 2) / n;
    return `${(Math.cos(a) * r).toFixed(3)},${(Math.sin(a) * r).toFixed(3)}`;
  }).join(" ");
}

const STAR = star(5, 1, 0.45);
const HEX = poly(6, 1, 0);
const TRI = poly(3, 1.1);

function Shape({ kind, fill, stroke, sw }: { kind: ShapeKind; fill: string; stroke: string; sw: number }) {
  const p = { fill, stroke, strokeWidth: sw, vectorEffect: "non-scaling-stroke" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "circle":
      return <circle r={0.95} {...p} />;
    case "square":
      return <rect x={-0.8} y={-0.8} width={1.6} height={1.6} {...p} />;
    case "triangle":
      return <polygon points={TRI} transform="translate(0 0.18)" {...p} />;
    case "diamond":
      return <polygon points="0,-1 0.62,0 0,1 -0.62,0" {...p} />;
    case "hexagon":
      return <polygon points={HEX} {...p} />;
    case "star":
      return <polygon points={STAR} transform="translate(0 0.06)" {...p} />;
    case "cross":
      return <polygon points="-0.3,-0.95 0.3,-0.95 0.3,-0.3 0.95,-0.3 0.95,0.3 0.3,0.3 0.3,0.95 -0.3,0.95 -0.3,0.3 -0.95,0.3 -0.95,-0.3 -0.3,-0.3" {...p} />;
    case "arrow":
      return <polygon points="-0.95,-0.28 0.15,-0.28 0.15,-0.7 0.98,0 0.15,0.7 0.15,0.28 -0.95,0.28" {...p} />;
    case "pac":
      return <path d="M0,0 L0.82,-0.55 A0.98,0.98 0 1 0 0.82,0.55 Z" {...p} />;
    case "flag":
      return <path d="M-0.75,1 L-0.75,-1 L0.9,-0.62 L-0.45,-0.22 L-0.45,1 Z" {...p} />;
  }
}

/** Renders one glyph cell (1–6 copies of a shape) as SVG filling its box. */
export function GlyphView({ g, className, bg = "#eaf2ff" }: { g: Glyph; className?: string; bg?: string }) {
  const layout = LAYOUT[g.count] ?? LAYOUT[1];
  const r = layout.r * SIZE_SCALE[g.size];
  const color = PALETTE[g.color];
  const solid = g.fill === 0;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {layout.pts.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${g.rot}) scale(${r})`}>
          <Shape kind={g.shape} fill={solid ? color : bg} stroke={color} sw={solid ? 1.5 : 3.2} />
          {g.fill === 2 && <circle r={0.2} fill={color} />}
        </g>
      ))}
    </svg>
  );
}

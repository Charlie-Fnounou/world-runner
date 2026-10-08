/**
 * Procedural canvas visuals for every object. Each function draws centred on
 * the origin and fits (roughly) inside a circle of radius r pixels.
 * t is seconds of (unpaused) time, for gentle idle animation.
 */
import { rng } from "@/lib/random";

type Ctx = CanvasRenderingContext2D;
type Draw = (c: Ctx, r: number, t: number) => void;

const TAU = Math.PI * 2;

/** Colour used when an object is only a few pixels wide. */
export const DOT: Record<string, string> = {
  regret: "#b9a3ff",
  proton: "#ff6b81",
  crumb: "#e8b25a",
  atom: "#5ef2d6",
  rain: "#7fd1ff",
  virus: "#8e7bff",
  bacterium: "#7ee081",
  hat: "#9b7bff",
  sand: "#d9b77c",
  ant: "#d0523a",
  cat: "#ff9f43",
  human: "#eef0ff",
  jellybean: "#ff6fae",
  baguette: "#e3a857",
  duck: "#f3f5ff",
  everest: "#aab4d6",
  fort: "#ffb3c7",
  moon: "#c9c9d6",
  earth: "#2f6bff",
  sun: "#ffc247",
  pizza: "#ff8a4c",
  dyson: "#5ef2d6",
  solar: "#ffd166",
  scarf: "#ff6fae",
  commute: "#ffe08a",
  sneeze: "#d68cff",
  disco: "#e0e6ff",
  soup: "#ff9a4a",
  knit: "#ffb3c7",
  noodles: "#ffd166",
  universe: "#ff9a6b",
};

const circle = (c: Ctx, x: number, y: number, r: number, fill: string) => {
  c.beginPath();
  c.arc(x, y, Math.max(0.1, r), 0, TAU);
  c.fillStyle = fill;
  c.fill();
};

const glow = (c: Ctx, r: number, color: string, alpha = 0.5) => {
  if (r <= 0.5 || alpha <= 0) return;
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.save();
  c.globalAlpha *= alpha;
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fill();
  c.restore();
};

/** Resolved font families (canvas cannot read CSS variables); set by the game on mount. */
export const FONTS = { display: "ui-sans-serif, system-ui, sans-serif", mono: "ui-monospace, monospace" };

/* fixed random features, generated once */
const R = rng(20260518);
const blobPoly = (n: number, jitter: number) => Array.from({ length: n }, (_, i) => ({ a: (i / n) * TAU, k: 1 - jitter + R.next() * jitter * 2 }));
const CRUMB = blobPoly(11, 0.28);
const SAND = blobPoly(9, 0.18);
const SAND_SPECKS = Array.from({ length: 16 }, () => ({ x: R.range(-0.6, 0.6), y: R.range(-0.5, 0.5), s: R.range(0.03, 0.08) }));
const CRATERS = Array.from({ length: 14 }, () => ({ x: R.range(-0.7, 0.7), y: R.range(-0.7, 0.7), s: R.range(0.05, 0.2) })).filter((p) => Math.hypot(p.x, p.y) + p.s < 0.95);
const CONTINENTS = Array.from({ length: 6 }, () => ({ x: R.range(-1, 1), y: R.range(-0.6, 0.6), s: R.range(0.18, 0.4), poly: blobPoly(9, 0.35) }));
const SPIRAL = Array.from({ length: 360 }, (_, i) => {
  const arm = i % 2;
  const d = R.next();
  const ang = d * 3.4 + arm * Math.PI + R.range(-0.25, 0.25);
  return { x: Math.cos(ang) * (0.12 + d * 0.88), y: Math.sin(ang) * (0.12 + d * 0.88), s: R.range(0.006, 0.02), col: R.pick(["#ff9a4a", "#ff6b4a", "#ffd166", "#7ee081", "#fff1c9"]), noodle: R.next() < 0.12 };
});
const CLUSTER = Array.from({ length: 70 }, () => {
  const a = R.next() * TAU;
  const d = Math.sqrt(R.next()) * 0.92 * (R.next() < 0.6 ? 0.6 : 1);
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: R.range(0.025, 0.06), ph: R.next() * TAU };
});
const SNEEZE = Array.from({ length: 140 }, () => {
  const d = R.next();
  const a = R.range(-0.55, 0.55) * (0.3 + d);
  return { x: -0.9 + d * 1.85 * Math.cos(a), y: d * 1.4 * Math.sin(a), s: R.range(0.01, 0.05) * (0.4 + d), col: R.pick(["#d68cff", "#ff8fc8", "#9b7bff", "#ffd1f0"]) };
});
const WEB_NODES = Array.from({ length: 34 }, () => {
  const a = R.next() * TAU;
  const d = Math.sqrt(R.next()) * 0.9;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d };
});
const WEB_EDGES: [number, number][] = [];
WEB_NODES.forEach((p, i) => {
  const near = WEB_NODES.map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) }))
    .filter((o) => o.j !== i)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  for (const n of near) if (n.j > i) WEB_EDGES.push([i, n.j]);
});
const CMB = Array.from({ length: 150 }, () => {
  const a = R.next() * TAU;
  const d = Math.sqrt(R.next()) * 0.95;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: R.range(0.06, 0.16), col: R.pick(["#ff6b4a", "#ffb347", "#5b8cff", "#3b5bdb", "#ff9a6b"]) };
});
const STRIPES = ["#ff6fae", "#5ef2d6", "#ffd166", "#9b7bff"];

function polyPath(c: Ctx, pts: { a: number; k: number }[], r: number) {
  c.beginPath();
  pts.forEach((p, i) => {
    const x = Math.cos(p.a) * r * p.k;
    const y = Math.sin(p.a) * r * p.k;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  });
  c.closePath();
}

function hexagon(c: Ctx, x: number, y: number, s: number) {
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const px = x + Math.cos(a) * s;
    const py = y + Math.sin(a) * s;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}

function roundRect(c: Ctx, x: number, y: number, w: number, h: number, rad: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, Math.min(rad, w / 2, h / 2));
}

export const DRAW: Record<string, Draw> = {
  regret: (c, r, t) => {
    glow(c, r * 1.7, "#9b7bff", 0.55);
    const wob = 1 + Math.sin(t * 3) * 0.04;
    circle(c, 0, 0, r * 0.62 * wob, "#cbbcff");
    circle(c, 0, 0, r * 0.48 * wob, "#e9e3ff");
    if (r > 10) {
      circle(c, -r * 0.17, -r * 0.08, r * 0.06, "#3a2f6b");
      circle(c, r * 0.17, -r * 0.08, r * 0.06, "#3a2f6b");
      c.strokeStyle = "#3a2f6b";
      c.lineWidth = Math.max(1, r * 0.05);
      c.beginPath();
      c.arc(0, r * 0.26, r * 0.16, Math.PI * 1.15, Math.PI * 1.85);
      c.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const a = t * 1.3 + (i * TAU) / 3;
      circle(c, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9 * 0.5, r * 0.05, "#5ef2d6");
    }
  },

  proton: (c, r, t) => {
    glow(c, r * 1.3, "#ff6b81", 0.35);
    c.strokeStyle = "rgba(238,240,255,0.25)";
    c.lineWidth = Math.max(1, r * 0.03);
    c.beginPath();
    c.arc(0, 0, r * 0.95, 0, TAU);
    c.stroke();
    const cols = ["#ff5a6e", "#5ef2a0", "#5b8cff"];
    const pts = cols.map((_, i) => {
      const a = t * 0.6 + (i * TAU) / 3 - Math.PI / 2;
      return [Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42] as const;
    });
    c.strokeStyle = "rgba(255,214,102,0.8)";
    c.lineWidth = Math.max(1, r * 0.035);
    for (let i = 0; i < 3; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % 3];
      c.beginPath();
      c.moveTo(x1, y1);
      const mx = (x1 + x2) / 2 + Math.sin(t * 4 + i) * r * 0.08;
      const my = (y1 + y2) / 2 + Math.cos(t * 4 + i) * r * 0.08;
      c.quadraticCurveTo(mx, my, x2, y2);
      c.stroke();
    }
    pts.forEach(([x, y], i) => {
      circle(c, x, y, r * 0.33, cols[i]);
      circle(c, x - r * 0.1, y - r * 0.1, r * 0.09, "rgba(255,255,255,0.5)");
    });
    if (r > 24) {
      // smug sunglasses on the top quark
      const [x, y] = pts[0];
      c.fillStyle = "#0b0d1f";
      roundRect(c, x - r * 0.24, y - r * 0.06, r * 0.2, r * 0.1, r * 0.04);
      c.fill();
      roundRect(c, x + r * 0.04, y - r * 0.06, r * 0.2, r * 0.1, r * 0.04);
      c.fill();
    }
  },

  crumb: (c, r, t) => {
    c.save();
    c.globalAlpha *= 0.3 + 0.1 * Math.sin(t * 2);
    c.translate(r * 0.28, -r * 0.18);
    polyPath(c, CRUMB, r * 0.7);
    c.setLineDash([r * 0.08, r * 0.06]);
    c.strokeStyle = "#ffd28a";
    c.lineWidth = Math.max(1, r * 0.03);
    c.stroke();
    c.restore();
    polyPath(c, CRUMB, r * 0.75);
    c.fillStyle = "#e8b25a";
    c.fill();
    c.strokeStyle = "#a8742f";
    c.lineWidth = Math.max(1, r * 0.04);
    c.stroke();
    if (r > 8) {
      circle(c, -r * 0.2, -r * 0.1, r * 0.1, "#5a3518");
      circle(c, r * 0.22, r * 0.18, r * 0.08, "#5a3518");
      circle(c, -r * 0.05, r * 0.3, r * 0.06, "#5a3518");
    }
  },

  atom: (c, r, t) => {
    glow(c, r, "#5ef2d6", 0.55);
    c.save();
    c.rotate(-0.4);
    c.strokeStyle = "rgba(94,242,214,0.6)";
    c.lineWidth = Math.max(1, r * 0.015);
    c.setLineDash([r * 0.05, r * 0.04]);
    c.beginPath();
    c.ellipse(0, 0, r * 0.85, r * 0.38, 0, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    const a = t * 2.2;
    circle(c, Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.38, Math.max(1.5, r * 0.05), "#eef0ff");
    c.restore();
    circle(c, 0, 0, Math.max(1, r * 0.07), "#ff6b81");
    if (r > 30) {
      c.fillStyle = "rgba(238,240,255,0.8)";
      c.font = `${Math.max(9, r * 0.09)}px ${FONTS.mono}`;
      c.textAlign = "center";
      c.fillText("z z z", r * 0.25, -r * 0.2);
    }
  },

  rain: (c, r, t) => {
    const s = r * 0.27;
    const centres = [
      [-s * 1.5, 0],
      [0, s * 0.866],
      [s * 1.5, 0],
    ];
    c.lineWidth = Math.max(1, r * 0.04);
    c.strokeStyle = "#7fd1ff";
    for (const [x, y] of centres) {
      hexagon(c, x, y, s);
      c.fillStyle = "rgba(127,209,255,0.12)";
      c.fill();
      c.stroke();
    }
    for (const [x, y] of centres)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        circle(c, x + Math.cos(a) * s, y + Math.sin(a) * s, r * 0.045, i % 3 === 0 ? "#eef0ff" : "#7fd1ff");
      }
    // droplet
    const dy = Math.sin(t * 2) * r * 0.05;
    c.beginPath();
    c.moveTo(r * 0.55, -r * 0.75 + dy);
    c.quadraticCurveTo(r * 0.78, -r * 0.45 + dy, r * 0.55, -r * 0.35 + dy);
    c.quadraticCurveTo(r * 0.32, -r * 0.45 + dy, r * 0.55, -r * 0.75 + dy);
    c.fillStyle = "#5ef2d6";
    c.fill();
  },

  virus: (c, r, t) => {
    const n = 14;
    c.strokeStyle = "#b8abff";
    c.lineWidth = Math.max(1, r * 0.05);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.2;
      c.beginPath();
      c.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
      c.lineTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88);
      c.stroke();
      circle(c, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.075, "#ff6fae");
    }
    circle(c, 0, 0, r * 0.64, "#8e7bff");
    circle(c, -r * 0.15, -r * 0.18, r * 0.3, "rgba(255,255,255,0.12)");
    if (r > 14) {
      c.fillStyle = "#eef0ff";
      c.font = `900 ${r * 0.55}px ${FONTS.display}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("M", 0, r * 0.04);
    }
  },

  bacterium: (c, r, t) => {
    const breathe = Math.sin(t * 1.5) * 0.04;
    c.lineCap = "round";
    c.lineJoin = "round";
    const path = () => {
      c.beginPath();
      c.moveTo(-r * 0.75, r * 0.45);
      c.quadraticCurveTo(-r * 0.25, -r * (0.55 + breathe), 0, -r * (0.45 + breathe));
      c.quadraticCurveTo(r * 0.25, -r * (0.55 + breathe), r * 0.75, r * 0.45);
    };
    path();
    c.strokeStyle = "#3f9a4e";
    c.lineWidth = r * 0.42;
    c.stroke();
    path();
    c.strokeStyle = "#7ee081";
    c.lineWidth = r * 0.32;
    c.stroke();
    if (r > 10) {
      c.strokeStyle = "#c8f5c0";
      c.lineWidth = Math.max(1, r * 0.025);
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        const x0 = r * 0.85;
        const y0 = r * 0.5 + k * r * 0.05;
        c.moveTo(x0, y0);
        for (let i = 1; i <= 6; i++) c.lineTo(x0 + i * r * 0.03, y0 + i * r * 0.05 + Math.sin(t * 6 + i + k) * r * 0.03);
        c.stroke();
      }
      circle(c, -r * 0.1, -r * 0.28, r * 0.05, "#1d4f27");
    }
    // yoga mat
    roundRect(c, -r * 0.95, r * 0.62, r * 1.9, r * 0.08, r * 0.04);
    c.fillStyle = "#ff6fae";
    c.fill();
  },

  hat: (c, r) => {
    c.fillStyle = "#3a2f6b";
    c.strokeStyle = "#9b7bff";
    c.lineWidth = Math.max(1, r * 0.035);
    roundRect(c, -r * 0.5, -r * 0.8, r, r * 1.25, r * 0.06);
    c.fill();
    c.stroke();
    c.fillStyle = "#ff6fae";
    c.fillRect(-r * 0.5, r * 0.15, r, r * 0.16);
    c.beginPath();
    c.ellipse(0, r * 0.48, r * 0.92, r * 0.17, 0, 0, TAU);
    c.fillStyle = "#3a2f6b";
    c.fill();
    c.stroke();
    if (r > 16) {
      c.beginPath();
      c.ellipse(-r * 0.3, -r * 0.4, r * 0.06, r * 0.28, 0, 0, TAU);
      c.fillStyle = "rgba(255,255,255,0.12)";
      c.fill();
    }
  },

  sand: (c, r) => {
    polyPath(c, SAND, r * 0.85);
    const g = c.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, "#f1d49b");
    g.addColorStop(1, "#b28a4f");
    c.fillStyle = g;
    c.fill();
    if (r > 8) for (const s of SAND_SPECKS) circle(c, s.x * r, s.y * r, s.s * r, "rgba(90,60,30,0.35)");
    circle(c, -r * 0.3, -r * 0.35, r * 0.12, "rgba(255,255,255,0.35)");
  },

  ant: (c, r, t) => {
    const leg = Math.sin(t * 8) * r * 0.04;
    c.strokeStyle = "#7a2a1a";
    c.lineWidth = Math.max(1, r * 0.035);
    c.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const x = -r * 0.05 + i * r * 0.12;
      const l = i % 2 ? leg : -leg;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x - r * 0.12 + l, r * 0.38);
      c.moveTo(x, 0);
      c.lineTo(x + r * 0.1 - l, r * 0.38);
      c.stroke();
    }
    c.fillStyle = "#d0523a";
    c.beginPath();
    c.ellipse(-r * 0.55, r * 0.02, r * 0.36, r * 0.22, 0.15, 0, TAU);
    c.fill();
    c.beginPath();
    c.ellipse(0.05 * r, 0, r * 0.2, r * 0.12, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.ellipse(r * 0.42, -r * 0.08, r * 0.16, r * 0.14, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.moveTo(r * 0.5, -r * 0.2);
    c.quadraticCurveTo(r * 0.6, -r * 0.45, r * 0.75, -r * 0.42);
    c.stroke();
    // crouton
    c.save();
    c.translate(r * 0.62, -r * 0.62);
    c.rotate(0.3 + Math.sin(t * 2) * 0.05);
    roundRect(c, -r * 0.18, -r * 0.18, r * 0.36, r * 0.36, r * 0.05);
    c.fillStyle = "#e3a857";
    c.fill();
    c.strokeStyle = "#a8742f";
    c.stroke();
    c.restore();
  },

  cat: (c, r, t) => {
    // tail
    c.strokeStyle = "#e07b1f";
    c.lineWidth = r * 0.14;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(r * 0.8, r * 0.35);
    c.quadraticCurveTo(r * 0.95, r * 0.65, r * 0.2, r * 0.62);
    c.stroke();
    roundRect(c, -r * 0.9, -r * 0.35, r * 1.8, r * 0.95, r * 0.45);
    c.fillStyle = "#ff9f43";
    c.fill();
    // ears
    c.beginPath();
    c.moveTo(-r * 0.75, -r * 0.15);
    c.lineTo(-r * 0.62, -r * 0.62);
    c.lineTo(-r * 0.38, -r * 0.3);
    c.moveTo(-r * 0.2, -r * 0.3);
    c.lineTo(-r * 0.02, -r * 0.62);
    c.lineTo(r * 0.08, -r * 0.18);
    c.fill();
    if (r > 10) {
      c.strokeStyle = "#e07b1f";
      c.lineWidth = Math.max(1, r * 0.06);
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(r * (0.2 + i * 0.2), -r * 0.3);
        c.lineTo(r * (0.15 + i * 0.2), r * 0.0);
        c.stroke();
      }
      const blink = Math.sin(t * 0.7) > 0.97 ? 0.02 : 1;
      c.strokeStyle = "#3a1f08";
      c.lineWidth = Math.max(1, r * 0.035);
      c.beginPath();
      c.arc(-r * 0.55, -r * 0.05, r * 0.08, Math.PI * 0.1, Math.PI * 0.9 * blink + 0.1);
      c.moveTo(-r * 0.1, -r * 0.05);
      c.arc(-r * 0.18, -r * 0.05, r * 0.08, Math.PI * 0.1, Math.PI * 0.9 * blink + 0.1);
      c.stroke();
      circle(c, -r * 0.36, r * 0.08, r * 0.04, "#ff6fae");
    }
  },

  human: (c, r, t) => {
    const ink = "#eef0ff";
    circle(c, 0, -r * 0.8, r * 0.14, ink);
    roundRect(c, -r * 0.17, -r * 0.62, r * 0.34, r * 0.72, r * 0.12);
    c.fillStyle = "#9b7bff";
    c.fill();
    c.strokeStyle = ink;
    c.lineCap = "round";
    c.lineWidth = r * 0.1;
    c.beginPath();
    c.moveTo(-r * 0.08, r * 0.12);
    c.lineTo(-r * 0.12, r * 0.92);
    c.moveTo(r * 0.08, r * 0.12);
    c.lineTo(r * 0.12, r * 0.92);
    c.stroke();
    c.lineWidth = r * 0.08;
    c.beginPath();
    c.moveTo(-r * 0.17, -r * 0.5);
    c.lineTo(-r * 0.32, -r * 0.1);
    c.moveTo(r * 0.17, -r * 0.5);
    c.lineTo(r * 0.36, -r * 0.82 + Math.sin(t * 2) * r * 0.03);
    c.stroke();
    if (r > 18) {
      c.fillStyle = "#5ef2d6";
      c.font = `900 ${r * 0.35}px ${FONTS.display}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("?", r * 0.6, -r * 0.95 + Math.sin(t * 2.5) * r * 0.04);
    }
  },

  jellybean: (c, r) => {
    c.save();
    c.rotate(-0.15);
    c.beginPath();
    c.moveTo(-r * 0.9, 0);
    c.bezierCurveTo(-r * 0.95, -r * 0.55, -r * 0.2, -r * 0.6, 0, -r * 0.3);
    c.bezierCurveTo(r * 0.2, -r * 0.6, r * 0.95, -r * 0.55, r * 0.9, 0);
    c.bezierCurveTo(r * 0.85, r * 0.5, -r * 0.85, r * 0.5, -r * 0.9, 0);
    const g = c.createLinearGradient(0, -r * 0.5, 0, r * 0.45);
    g.addColorStop(0, "#ff9ccf");
    g.addColorStop(1, "#d6337f");
    c.fillStyle = g;
    c.fill();
    c.beginPath();
    c.ellipse(-r * 0.45, -r * 0.18, r * 0.25, r * 0.07, -0.3, 0, TAU);
    c.fillStyle = "rgba(255,255,255,0.55)";
    c.fill();
    if (r > 20) for (let i = 0; i < 6; i++) circle(c, -r * 0.5 + i * r * 0.2, r * 0.12 + (i % 2) * r * 0.06, r * 0.025, "rgba(255,255,255,0.35)");
    c.restore();
  },

  baguette: (c, r) => {
    const h = r * 0.16;
    roundRect(c, -r, -h, r * 2, h * 2, h);
    const g = c.createLinearGradient(0, -h, 0, h);
    g.addColorStop(0, "#f2c27a");
    g.addColorStop(1, "#b97a32");
    c.fillStyle = g;
    c.fill();
    if (r > 20) {
      c.strokeStyle = "#f8e0b0";
      c.lineWidth = Math.max(1, h * 0.25);
      c.lineCap = "round";
      for (let i = 0; i < 9; i++) {
        const x = -r * 0.8 + i * r * 0.2;
        c.beginPath();
        c.moveTo(x - h * 0.4, -h * 0.4);
        c.lineTo(x + h * 0.4, h * 0.2);
        c.stroke();
      }
    }
  },

  duck: (c, r, t) => {
    const bob = Math.sin(t * 1.2) * r * 0.02;
    c.save();
    c.translate(0, bob);
    c.fillStyle = "rgba(243,245,255,0.95)";
    const puffs: [number, number, number][] = [
      [-0.45, 0.2, 0.32],
      [-0.1, 0.25, 0.38],
      [0.25, 0.22, 0.32],
      [-0.7, 0.05, 0.2],
      [0.0, 0.0, 0.3],
      [0.42, -0.2, 0.24],
      [0.5, -0.5, 0.2],
    ];
    for (const [x, y, s] of puffs) {
      c.beginPath();
      c.arc(x * r, y * r, s * r, 0, TAU);
      c.fill();
    }
    c.beginPath();
    c.moveTo(r * 0.66, -r * 0.52);
    c.lineTo(r * 0.92, -r * 0.45);
    c.lineTo(r * 0.66, -r * 0.4);
    c.fillStyle = "#ff9f43";
    c.fill();
    circle(c, r * 0.55, -r * 0.56, Math.max(1, r * 0.035), "#0b0d1f");
    c.restore();
  },

  everest: (c, r) => {
    c.beginPath();
    c.moveTo(-r, r * 0.6);
    c.lineTo(-r * 0.45, -r * 0.1);
    c.lineTo(-r * 0.25, r * 0.05);
    c.lineTo(r * 0.05, -r * 0.75);
    c.lineTo(r * 0.45, -r * 0.05);
    c.lineTo(r * 0.6, -r * 0.2);
    c.lineTo(r, r * 0.6);
    c.closePath();
    const g = c.createLinearGradient(0, -r * 0.75, 0, r * 0.6);
    g.addColorStop(0, "#8d97bd");
    g.addColorStop(1, "#3b4266");
    c.fillStyle = g;
    c.fill();
    c.beginPath();
    c.moveTo(r * 0.05, -r * 0.75);
    c.lineTo(-r * 0.17, -r * 0.37);
    c.lineTo(-r * 0.05, -r * 0.42);
    c.lineTo(r * 0.05, -r * 0.32);
    c.lineTo(r * 0.15, -r * 0.44);
    c.lineTo(r * 0.27, -r * 0.37);
    c.closePath();
    c.fillStyle = "#f3f5ff";
    c.fill();
    if (r > 30) {
      c.strokeStyle = "#eef0ff";
      c.lineWidth = Math.max(1, r * 0.01);
      c.beginPath();
      c.moveTo(r * 0.05, -r * 0.75);
      c.lineTo(r * 0.05, -r * 0.9);
      c.stroke();
      c.fillStyle = "#ff6fae";
      c.fillRect(r * 0.05, -r * 0.9, r * 0.08, r * 0.05);
    }
  },

  fort: (c, r) => {
    const cols = ["#ffb3c7", "#9b7bff", "#5ef2d6", "#ffd166", "#7fd1ff"];
    c.beginPath();
    c.moveTo(-r * 0.95, r * 0.5);
    c.quadraticCurveTo(0, -r * 1.15, r * 0.95, r * 0.5);
    c.closePath();
    c.fillStyle = "#6d5bd0";
    c.fill();
    let k = 0;
    for (let row = 0; row < 3; row++) {
      const n = 4 - row;
      for (let i = 0; i < n; i++) {
        const w = r * 0.42;
        const x = -((n * w) / 2) + i * w;
        roundRect(c, x + r * 0.02, r * 0.22 - row * r * 0.28, w - r * 0.04, r * 0.26, r * 0.08);
        c.fillStyle = cols[k++ % cols.length];
        c.fill();
      }
    }
    c.strokeStyle = "#eef0ff";
    c.lineWidth = Math.max(1, r * 0.015);
    c.beginPath();
    c.moveTo(0, -r * 0.42);
    c.lineTo(0, -r * 0.85);
    c.stroke();
    c.beginPath();
    c.moveTo(0, -r * 0.85);
    c.lineTo(r * 0.22, -r * 0.78);
    c.lineTo(0, -r * 0.7);
    c.fillStyle = "#ff6fae";
    c.fill();
    roundRect(c, -r * 0.15, r * 0.26, r * 0.3, r * 0.3, r * 0.14);
    c.fillStyle = "#0b0d1f";
    c.fill();
  },

  moon: (c, r) => {
    glow(c, r * 1.25, "#c9c9d6", 0.18);
    circle(c, 0, 0, r * 0.95, "#c9c9d6");
    if (r > 6) for (const k of CRATERS) circle(c, k.x * r, k.y * r, k.s * r, "rgba(110,110,135,0.45)");
    const g = c.createLinearGradient(-r, 0, r, 0);
    g.addColorStop(0.45, "rgba(11,13,31,0)");
    g.addColorStop(1, "rgba(11,13,31,0.55)");
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r * 0.95, 0, TAU);
    c.fill();
  },

  earth: (c, r, t) => {
    glow(c, r * 1.2, "#5b8cff", 0.35);
    circle(c, 0, 0, r * 0.95, "#2f6bff");
    c.save();
    c.beginPath();
    c.arc(0, 0, r * 0.95, 0, TAU);
    c.clip();
    const shift = ((t * 0.05) % 2) * r;
    for (const k of CONTINENTS) {
      for (const dx of [0, -2 * r]) {
        c.save();
        c.translate(k.x * r + shift + dx, k.y * r);
        polyPath(c, k.poly, k.s * r);
        c.fillStyle = "#3fcf8e";
        c.fill();
        c.restore();
      }
    }
    c.strokeStyle = "rgba(255,255,255,0.6)";
    c.lineWidth = Math.max(1, r * 0.05);
    c.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      const y = -r * 0.6 + i * r * 0.4;
      const x = (((t * 0.08 + i * 0.37) % 2) - 1) * r * 1.2;
      c.moveTo(x - r * 0.3, y);
      c.quadraticCurveTo(x, y - r * 0.08, x + r * 0.3, y);
      c.stroke();
    }
    const g = c.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0.5, "rgba(11,13,31,0)");
    g.addColorStop(1, "rgba(11,13,31,0.5)");
    c.fillStyle = g;
    c.fillRect(-r, -r, 2 * r, 2 * r);
    c.restore();
  },

  sun: (c, r, t) => {
    glow(c, r * 1.8, "#ffb347", 0.45);
    c.strokeStyle = "rgba(255,194,71,0.5)";
    c.lineWidth = Math.max(1, r * 0.03);
    c.lineCap = "round";
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + t * 0.1;
      const l = 1.1 + 0.12 * Math.sin(t * 2 + i * 1.7);
      c.beginPath();
      c.moveTo(Math.cos(a) * r * 1.0, Math.sin(a) * r * 1.0);
      c.lineTo(Math.cos(a) * r * l * 1.05, Math.sin(a) * r * l * 1.05);
      c.stroke();
    }
    const g = c.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r * 0.95);
    g.addColorStop(0, "#fff6c2");
    g.addColorStop(0.55, "#ffc247");
    g.addColorStop(1, "#ff6a2b");
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r * 0.95, 0, TAU);
    c.fill();
    if (r > 20)
      for (let i = 0; i < 10; i++) {
        const a = i * 2.4 + t * 0.15;
        const d = 0.3 + (i % 4) * 0.15;
        circle(c, Math.cos(a) * r * d, Math.sin(a) * r * d, r * 0.04, "rgba(255,120,40,0.35)");
      }
  },

  pizza: (c, r) => {
    const w = r * 0.24;
    roundRect(c, -w, -r, w * 2, r * 2, w * 0.3);
    c.fillStyle = "#e3a857";
    c.fill();
    const layers = Math.min(70, Math.floor(r / 3));
    for (let i = 0; i < layers; i++) {
      const y = -r + ((i + 0.5) / layers) * r * 2;
      c.fillStyle = i % 2 ? "#ff5a3c" : "#ffd166";
      c.fillRect(-w * 0.95, y - r / layers / 3, w * 1.9, (r / layers) * 0.6);
    }
    c.beginPath();
    c.ellipse(0, -r, w * 1.15, w * 0.35, 0, 0, TAU);
    c.fillStyle = "#ffd166";
    c.fill();
    if (r > 30) for (const dx of [-0.5, 0.1, 0.55]) circle(c, dx * w, -r + (dx > 0 ? 0.08 : -0.06) * w, w * 0.16, "#c23a2b");
  },

  dyson: (c, r, t) => {
    glow(c, r * 0.4, "#ffd166", 0.9);
    circle(c, 0, 0, Math.max(1, r * 0.05), "#fff6c2");
    c.save();
    c.beginPath();
    c.arc(0, 0, r * 0.95, 0, TAU);
    c.clip();
    c.strokeStyle = "rgba(94,242,214,0.7)";
    c.lineWidth = Math.max(1, r * 0.012);
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      const y = (i / 4) * r * 0.95;
      const half = Math.sqrt(Math.max(0, (r * 0.95) ** 2 - y * y));
      c.moveTo(-half, y);
      c.lineTo(half, y);
      c.stroke();
    }
    const rot = (t * 0.2) % (TAU / 8);
    for (let i = 0; i < 8; i++) {
      const a = rot + (i * Math.PI) / 8;
      const rx = Math.abs(Math.cos(a)) * r * 0.95;
      c.beginPath();
      c.ellipse(0, 0, rx, r * 0.95, 0, 0, TAU);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = "#5ef2d6";
    c.lineWidth = Math.max(1, r * 0.02);
    c.beginPath();
    c.arc(0, 0, r * 0.95, 0, TAU);
    c.stroke();
  },

  solar: (c, r, t) => {
    const radii = [0.06, 0.09, 0.12, 0.16, 0.36, 0.55, 0.78, 0.96];
    const cols = ["#b0a8a0", "#ffd28a", "#5b8cff", "#ff7a59", "#e0b07a", "#f3d08a", "#7fd1ff", "#4f7bff"];
    c.strokeStyle = "rgba(238,240,255,0.18)";
    c.lineWidth = 1;
    radii.forEach((d) => {
      c.beginPath();
      c.arc(0, 0, d * r, 0, TAU);
      c.stroke();
    });
    glow(c, r * 0.12, "#ffd166", 0.9);
    circle(c, 0, 0, Math.max(1.5, r * 0.02), "#fff6c2");
    radii.forEach((d, i) => {
      const a = t * (0.9 / Math.sqrt(d * 10)) + i * 1.9;
      circle(c, Math.cos(a) * d * r, Math.sin(a) * d * r, Math.max(1.2, r * (i >= 4 && i <= 5 ? 0.022 : 0.012)), cols[i]);
    });
  },

  scarf: (c, r, t) => {
    const n = 26;
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push([r * 0.75 - u * r * 1.7, Math.sin(u * 7 - t * 2) * r * 0.12 * u]);
    }
    const w = r * 0.09;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      c.beginPath();
      c.moveTo(x1, y1 - w);
      c.lineTo(x2, y2 - w * 0.95);
      c.lineTo(x2, y2 + w * 0.95);
      c.lineTo(x1, y1 + w);
      c.closePath();
      c.fillStyle = STRIPES[Math.floor(i / 2) % STRIPES.length];
      c.fill();
    }
    c.save();
    c.translate(r * 0.8, 0);
    glow(c, r * 0.3, "#bfe9ff", 0.8);
    circle(c, 0, 0, r * 0.1, "#eef8ff");
    c.restore();
  },

  commute: (c, r, t) => {
    c.save();
    c.translate(-r * 0.92, 0);
    glow(c, r * 0.18, "#ffe08a", 0.9);
    circle(c, 0, 0, Math.max(1.5, r * 0.035), "#fff6c2");
    c.restore();
    c.save();
    c.translate(r * 0.92, 0);
    glow(c, r * 0.14, "#ff6b4a", 0.9);
    circle(c, 0, 0, Math.max(1.2, r * 0.025), "#ffb39a");
    c.restore();
    c.strokeStyle = "rgba(238,240,255,0.5)";
    c.setLineDash([Math.max(2, r * 0.03), Math.max(2, r * 0.03)]);
    c.lineWidth = Math.max(1, r * 0.006);
    c.beginPath();
    c.moveTo(-r * 0.85, 0);
    c.lineTo(r * 0.85, 0);
    c.stroke();
    c.setLineDash([]);
    if (r > 40) {
      const u = (t * 0.06) % 1;
      const x = -r * 0.8 + u * r * 1.6;
      const s = Math.max(4, r * 0.04);
      roundRect(c, x - s, -s * 1.1, s * 2, s * 0.8, s * 0.3);
      c.fillStyle = "#9b7bff";
      c.fill();
      circle(c, x - s * 0.55, -s * 0.25, s * 0.25, "#eef0ff");
      circle(c, x + s * 0.55, -s * 0.25, s * 0.25, "#eef0ff");
    }
  },

  sneeze: (c, r, t) => {
    glow(c, r, "#9b7bff", 0.35);
    for (const p of SNEEZE) {
      const drift = Math.sin(t * 0.5 + p.x * 4) * r * 0.01;
      circle(c, p.x * r, p.y * r + drift, Math.max(0.6, p.s * r), p.col);
    }
    c.save();
    c.translate(-r * 0.9, 0);
    glow(c, r * 0.18, "#fff", 0.8);
    c.restore();
  },

  disco: (c, r, t) => {
    glow(c, r * 0.9, "#9b7bff", 0.35);
    for (const b of CLUSTER) {
      const x = b.x * r;
      const y = b.y * r;
      const s = Math.max(0.8, b.s * r);
      const g = c.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#8f97c8");
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, s, 0, TAU);
      c.fill();
      const tw = Math.sin(t * 3 + b.ph);
      if (tw > 0.85 && s > 3) {
        c.strokeStyle = "rgba(255,255,255,0.9)";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x - s * 1.6, y);
        c.lineTo(x + s * 1.6, y);
        c.moveTo(x, y - s * 1.6);
        c.lineTo(x, y + s * 1.6);
        c.stroke();
      }
    }
  },

  soup: (c, r, t) => {
    glow(c, r, "#ff9a4a", 0.25);
    c.save();
    c.rotate(t * 0.03);
    c.scale(1, 0.62);
    for (const p of SPIRAL) {
      if (p.noodle && r > 120) {
        c.strokeStyle = "#fff1c9";
        c.lineWidth = Math.max(1, r * 0.006);
        c.beginPath();
        c.arc(p.x * r, p.y * r, p.s * r * 1.2, 0, TAU * 0.8);
        c.stroke();
      } else circle(c, p.x * r, p.y * r, Math.max(0.7, p.s * r), p.col);
    }
    c.restore();
    glow(c, r * 0.3, "#fff1c9", 0.9);
  },

  knit: (c, r, t) => {
    const n = 7;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.3;
      const d = i % 2 ? 0.62 : 0.78;
      pts.push([Math.cos(a) * r * d, Math.sin(a) * r * d]);
    }
    c.strokeStyle = "#ffb3c7";
    c.lineWidth = Math.max(1, r * 0.02);
    c.beginPath();
    pts.forEach(([x, y], i) => {
      const [px, py] = pts[(i + n - 1) % n];
      if (i === 0) c.moveTo(px, py);
      c.quadraticCurveTo((px + x) / 2 * 0.6, (py + y) / 2 * 0.6, x, y);
    });
    c.stroke();
    pts.forEach(([x, y], i) => {
      c.save();
      c.translate(x, y);
      c.rotate(t * 0.1 + i);
      glow(c, r * 0.13, i % 2 ? "#7fd1ff" : "#ffd166", 0.6);
      c.scale(1, 0.55);
      c.strokeStyle = i % 2 ? "#7fd1ff" : "#ffd166";
      c.lineWidth = Math.max(1, r * 0.01);
      c.beginPath();
      for (let k = 0; k < 40; k++) {
        const a = k * 0.32;
        const d = (k / 40) * r * 0.12;
        if (k === 0) c.moveTo(0, 0);
        else c.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      c.stroke();
      c.restore();
    });
    // knitting needles
    c.strokeStyle = "#eef0ff";
    c.lineWidth = Math.max(1, r * 0.012);
    c.beginPath();
    c.moveTo(-r * 0.2, -r * 0.2);
    c.lineTo(r * 0.2, r * 0.2);
    c.moveTo(r * 0.2, -r * 0.2);
    c.lineTo(-r * 0.2, r * 0.2);
    c.stroke();
  },

  noodles: (c, r, t) => {
    c.strokeStyle = "rgba(255,209,102,0.55)";
    c.lineWidth = Math.max(1, r * 0.008);
    for (const [a, b] of WEB_EDGES) {
      const p = WEB_NODES[a];
      const q = WEB_NODES[b];
      const mx = (p.x + q.x) / 2 + Math.sin(t * 0.4 + a) * 0.04;
      const my = (p.y + q.y) / 2 + Math.cos(t * 0.4 + b) * 0.04;
      c.beginPath();
      c.moveTo(p.x * r, p.y * r);
      c.quadraticCurveTo(mx * r, my * r, q.x * r, q.y * r);
      c.stroke();
    }
    for (const p of WEB_NODES) {
      c.save();
      c.translate(p.x * r, p.y * r);
      glow(c, r * 0.05, "#ffd166", 0.8);
      c.restore();
    }
  },

  universe: (c, r, t) => {
    glow(c, r * 1.15, "#ff9a6b", 0.25);
    c.save();
    c.beginPath();
    c.arc(0, 0, r * 0.95, 0, TAU);
    c.clip();
    c.fillStyle = "#2a1a3a";
    c.fillRect(-r, -r, r * 2, r * 2);
    c.globalAlpha *= 0.35;
    for (const b of CMB) circle(c, b.x * r, b.y * r, b.s * r, b.col);
    c.restore();
    c.strokeStyle = "rgba(255,154,107,0.9)";
    c.lineWidth = Math.max(1, r * 0.012);
    c.beginPath();
    c.arc(0, 0, r * 0.95, 0, TAU);
    c.stroke();
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    circle(c, 0, 0, Math.max(2, r * 0.008) * (1 + pulse * 0.6), "#5ef2d6");
    if (r > 120) {
      c.fillStyle = "#5ef2d6";
      c.font = `${Math.max(11, r * 0.035)}px ${FONTS.mono}`;
      c.textAlign = "left";
      c.textBaseline = "middle";
      c.fillText("← you are here", r * 0.03, 0);
    }
  },
};

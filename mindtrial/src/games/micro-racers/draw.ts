/**
 * Micro Racers — canvas rendering (tabletop look, all procedural).
 */
import { rng } from "@/lib/random";
import type { PlayerConfig } from "@/lib/types";
import { BOOST_LEN, BOOST_WID, H, HUD_H, W, pointAt, type DecorDef, type Track } from "./track";
import { CAR_LEN, CAR_WID, LAPS, gridPose, lapOf, standings, type Car, type Race } from "./sim";

export const PAPER = "#e9e4d8";
export const INK = "#16161a";
export const ACCENT = "#ff2f4f";
const ROAD = "#3b3b44";
const TAPE = "#ecd28f";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "spark" | "dust" | "smoke";
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface Banner {
  text: string;
  sub?: string;
  color: string;
  life: number;
  max: number;
}

export interface RenderState {
  staticLayer: HTMLCanvasElement | null;
  staticScale: number;
  skid: HTMLCanvasElement | null;
  skidCtx: CanvasRenderingContext2D | null;
  prevWheels: ({ lx: number; ly: number; rx: number; ry: number } | null)[];
  particles: Particle[];
  floats: FloatText[];
  banner: Banner | null;
  fontSans: string;
  fontMono: string;
  time: number;
}

export function createRenderState(cars: number): RenderState {
  return {
    staticLayer: null,
    staticScale: 0,
    skid: null,
    skidCtx: null,
    prevWheels: new Array(cars).fill(null),
    particles: [],
    floats: [],
    banner: null,
    fontSans: "system-ui, sans-serif",
    fontMono: "ui-monospace, monospace",
    time: 0,
  };
}

function trackPath(g: CanvasRenderingContext2D, t: Track) {
  g.beginPath();
  g.moveTo(t.xs[0], t.ys[0]);
  for (let i = 1; i < t.n; i++) g.lineTo(t.xs[i], t.ys[i]);
  g.closePath();
}

export function buildStatic(track: Track, scale: number, carCount: number, fontSans: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.round(W * scale);
  c.height = Math.round(H * scale);
  const g = c.getContext("2d")!;
  g.scale(scale, scale);
  const r = rng(track.def.name.length * 7919 + track.n);

  // Desk paper + cutting-mat grid.
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = r.next() < 0.5 ? "rgba(22,22,26,0.035)" : "rgba(255,255,255,0.35)";
    g.fillRect(r.range(0, W), r.range(0, H), r.range(1, 2.5), r.range(1, 2.5));
  }
  g.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) {
    g.strokeStyle = x % 200 === 0 ? "rgba(22,22,26,0.09)" : "rgba(22,22,26,0.045)";
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, H);
    g.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    g.strokeStyle = y % 200 === 0 ? "rgba(22,22,26,0.09)" : "rgba(22,22,26,0.045)";
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(W, y + 0.5);
    g.stroke();
  }

  for (const d of track.def.decor) drawDecor(g, d, r, fontSans);

  g.lineJoin = "round";
  g.lineCap = "round";
  // Drop shadow under the mat.
  g.save();
  g.translate(3, 5);
  trackPath(g, track);
  g.strokeStyle = "rgba(22,22,26,0.14)";
  g.lineWidth = track.width + 18;
  g.stroke();
  g.restore();
  // Masking-tape border.
  trackPath(g, track);
  g.strokeStyle = TAPE;
  g.lineWidth = track.width + 16;
  g.stroke();
  trackPath(g, track);
  g.strokeStyle = "rgba(255,255,255,0.25)";
  g.lineWidth = track.width + 8;
  g.stroke();

  // Red/white kerbs on the outside of corners.
  g.lineCap = "butt";
  for (let i = 0; i < track.n; i++) {
    const k = track.curv[i];
    if (Math.abs(k) < 1 / 170) continue;
    const j = (i + 1) % track.n;
    const side = -Math.sign(k) * (track.half + 4);
    const ax = track.xs[i] - track.ty[i] * side;
    const ay = track.ys[i] + track.tx[i] * side;
    const bx = track.xs[j] - track.ty[j] * side;
    const by = track.ys[j] + track.tx[j] * side;
    g.strokeStyle = Math.floor(i / 3) % 2 === 0 ? ACCENT : "#fbfaf6";
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.stroke();
  }
  g.lineCap = "round";

  // Road.
  trackPath(g, track);
  g.strokeStyle = ROAD;
  g.lineWidth = track.width;
  g.stroke();
  // Road grain.
  for (let i = 0; i < track.n * 3; i++) {
    const p = pointAt(track, r.range(0, track.length), r.range(-track.half + 3, track.half - 3));
    g.fillStyle = r.next() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)";
    g.fillRect(p.x, p.y, r.range(1, 3), r.range(1, 3));
  }
  // Centre dashes.
  g.setLineDash([16, 22]);
  trackPath(g, track);
  g.strokeStyle = "rgba(255,255,255,0.32)";
  g.lineWidth = 3;
  g.stroke();
  g.setLineDash([]);

  // Start/finish checkerboard.
  {
    const p = pointAt(track, 0, 0);
    const ang = Math.atan2(p.ty, p.tx);
    g.save();
    g.translate(p.x, p.y);
    g.rotate(ang);
    const sq = 8;
    const rows = Math.ceil(track.width / sq);
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < rows; row++) {
        g.fillStyle = (row + col) % 2 === 0 ? "#fbfaf6" : INK;
        g.fillRect(-sq + col * sq, -track.half + row * sq, sq, Math.min(sq, track.width - row * sq));
      }
    }
    g.restore();
  }
  // Grid boxes.
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 2;
  for (let slot = 0; slot < carCount; slot++) {
    const gp = gridPose(track, slot);
    const p = pointAt(track, gp.s, gp.d);
    g.save();
    g.translate(p.x, p.y);
    g.rotate(Math.atan2(p.ty, p.tx));
    g.beginPath();
    g.moveTo(CAR_LEN / 2 + 6, -CAR_WID / 2 - 4);
    g.lineTo(CAR_LEN / 2 + 6, CAR_WID / 2 + 4);
    g.moveTo(CAR_LEN / 2 + 6, -CAR_WID / 2 - 4);
    g.lineTo(CAR_LEN / 2 - 4, -CAR_WID / 2 - 4);
    g.moveTo(CAR_LEN / 2 + 6, CAR_WID / 2 + 4);
    g.lineTo(CAR_LEN / 2 - 4, CAR_WID / 2 + 4);
    g.stroke();
    g.restore();
  }

  // Boost pad bases.
  for (const b of track.boosts) {
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.angle);
    g.fillStyle = "rgba(255,47,79,0.22)";
    g.strokeStyle = "rgba(255,47,79,0.75)";
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(-BOOST_LEN / 2, -BOOST_WID / 2, BOOST_LEN, BOOST_WID, 6);
    g.fill();
    g.stroke();
    g.restore();
  }

  return c;
}

function drawDecor(g: CanvasRenderingContext2D, d: DecorDef, r: ReturnType<typeof rng>, fontSans: string) {
  g.save();
  g.translate(d.x, d.y);
  g.rotate(d.angle ?? 0);
  switch (d.kind) {
    case "coffee": {
      const R = d.size ?? 80;
      g.fillStyle = "rgba(140,86,38,0.07)";
      g.beginPath();
      g.arc(0, 0, R, 0, Math.PI * 2);
      g.fill();
      for (let k = 0; k < 3; k++) {
        g.strokeStyle = `rgba(120,70,28,${0.22 - k * 0.06})`;
        g.lineWidth = 5 - k * 1.5;
        g.beginPath();
        const start = r.range(0, Math.PI);
        g.arc(r.range(-3, 3), r.range(-3, 3), R - k * 4, start, start + Math.PI * r.range(1.4, 2));
        g.stroke();
      }
      g.fillStyle = "rgba(120,70,28,0.18)";
      for (let k = 0; k < 4; k++) {
        const a = r.range(0, Math.PI * 2);
        g.beginPath();
        g.arc(Math.cos(a) * (R + r.range(8, 22)), Math.sin(a) * (R + r.range(8, 22)), r.range(2, 6), 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case "pencil": {
      const L = d.size ?? 360;
      const h = 16;
      g.fillStyle = "rgba(22,22,26,0.16)";
      g.fillRect(-L / 2 + 6, -h / 2 + 7, L, h);
      g.fillStyle = d.color ?? "#f6c431";
      g.fillRect(-L / 2 + 40, -h / 2, L - 70, h);
      g.fillStyle = "rgba(0,0,0,0.12)";
      g.fillRect(-L / 2 + 40, h / 6, L - 70, h / 3);
      g.fillStyle = "rgba(255,255,255,0.3)";
      g.fillRect(-L / 2 + 40, -h / 2 + 2, L - 70, 3);
      // ferrule + eraser
      g.fillStyle = "#c9ccd2";
      g.fillRect(L / 2 - 30, -h / 2, 14, h);
      g.fillStyle = "#f28fa0";
      g.beginPath();
      g.roundRect(L / 2 - 16, -h / 2, 16, h, [0, 5, 5, 0]);
      g.fill();
      // sharpened tip
      g.fillStyle = "#ecc9a0";
      g.beginPath();
      g.moveTo(-L / 2 + 40, -h / 2);
      g.lineTo(-L / 2 + 6, 0);
      g.lineTo(-L / 2 + 40, h / 2);
      g.fill();
      g.fillStyle = "#2b2b30";
      g.beginPath();
      g.moveTo(-L / 2 + 16, -3.5);
      g.lineTo(-L / 2 + 4, 0);
      g.lineTo(-L / 2 + 16, 3.5);
      g.fill();
      break;
    }
    case "clip": {
      g.strokeStyle = "#8f959e";
      g.lineWidth = 3;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(-30, 8);
      g.lineTo(26, 8);
      g.arc(26, 0, 8, Math.PI / 2, -Math.PI / 2, true);
      g.lineTo(-34, -8);
      g.arc(-34, 2, 10, -Math.PI / 2, Math.PI / 2, true);
      g.lineTo(18, 12);
      g.stroke();
      break;
    }
    case "eraser": {
      g.fillStyle = "rgba(22,22,26,0.14)";
      g.beginPath();
      g.roundRect(-34, -14, 72, 34, 6);
      g.fill();
      g.fillStyle = "#f6b7c3";
      g.beginPath();
      g.roundRect(-38, -18, 72, 34, 6);
      g.fill();
      g.fillStyle = "#2f6fd8";
      g.fillRect(-6, -18, 40, 34);
      g.fillStyle = "#fbfaf6";
      g.font = `800 10px ${fontSans}`;
      g.textAlign = "center";
      g.fillText("RUB", 14, 3);
      break;
    }
    case "ruler": {
      const L = d.size ?? 400;
      g.fillStyle = "rgba(170,205,225,0.45)";
      g.strokeStyle = "rgba(60,110,140,0.4)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(-L / 2, -22, L, 44, 4);
      g.fill();
      g.stroke();
      g.strokeStyle = "rgba(22,22,26,0.4)";
      g.lineWidth = 1;
      for (let x = 0; x <= L - 20; x += 10) {
        const len = x % 50 === 0 ? 14 : 7;
        g.beginPath();
        g.moveTo(-L / 2 + 10 + x, -22);
        g.lineTo(-L / 2 + 10 + x, -22 + len);
        g.stroke();
      }
      break;
    }
    case "sticky": {
      g.fillStyle = "rgba(22,22,26,0.12)";
      g.fillRect(-50, -46, 104, 104);
      g.fillStyle = d.color ?? "#ffe36e";
      g.fillRect(-54, -54, 104, 104);
      g.fillStyle = "rgba(0,0,0,0.05)";
      g.fillRect(-54, -54, 104, 18);
      g.fillStyle = "rgba(22,22,26,0.7)";
      g.font = `700 16px ${fontSans}`;
      g.textAlign = "center";
      g.fillText("3 LAPS", -2, 0);
      g.fillText("NO BRAKES", -2, 22);
      break;
    }
    case "crumbs": {
      for (let k = 0; k < 16; k++) {
        g.fillStyle = k % 3 === 0 ? "rgba(240,150,170,0.7)" : "rgba(22,22,26,0.15)";
        g.beginPath();
        g.ellipse(r.range(-40, 40), r.range(-24, 24), r.range(1.5, 4), r.range(1, 3), r.range(0, 3), 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
  }
  g.restore();
}

export function ensureLayers(rs: RenderState, track: Track, ctx: CanvasRenderingContext2D, carCount: number) {
  const scale = Math.min(2.5, ctx.canvas.width / W);
  if (!rs.staticLayer || Math.abs(rs.staticScale - scale) > 0.01) {
    rs.staticLayer = buildStatic(track, scale, carCount, rs.fontSans);
    rs.staticScale = scale;
  }
  if (!rs.skid) {
    const s = document.createElement("canvas");
    s.width = W;
    s.height = H;
    rs.skid = s;
    rs.skidCtx = s.getContext("2d");
  }
}

function wheelPositions(c: Car) {
  const fx = Math.cos(c.a);
  const fy = Math.sin(c.a);
  const rx = -fy;
  const ry = fx;
  const back = -CAR_LEN * 0.32;
  const side = CAR_WID * 0.42;
  return {
    lx: c.x + fx * back - rx * side,
    ly: c.y + fy * back - ry * side,
    rx: c.x + fx * back + rx * side,
    ry: c.y + fy * back + ry * side,
  };
}

/** Particles, skid marks and other per-step visual side effects. */
export function updateEffects(rs: RenderState, race: Race, dt: number, reducedMotion: boolean) {
  rs.time += dt;
  const sk = rs.skidCtx;
  race.cars.forEach((c, i) => {
    const speed = Math.hypot(c.vx, c.vy);
    const sliding = (Math.abs(c.vL) > 65 && speed > 70) || (c.handbrake && speed > 60) || (c.braking && speed > 170);
    const w = wheelPositions(c);
    const prev = rs.prevWheels[i];
    if (sliding && sk && !c.offTrack) {
      if (prev) {
        sk.strokeStyle = "rgba(16,16,20,0.2)";
        sk.lineWidth = 3;
        sk.lineCap = "round";
        sk.beginPath();
        sk.moveTo(prev.lx, prev.ly);
        sk.lineTo(w.lx, w.ly);
        sk.moveTo(prev.rx, prev.ry);
        sk.lineTo(w.rx, w.ry);
        sk.stroke();
      }
      rs.prevWheels[i] = w;
      if (!reducedMotion && Math.random() < 0.25) {
        rs.particles.push({ x: w.lx, y: w.ly, vx: -c.vx * 0.05, vy: -c.vy * 0.05, life: 0.6, max: 0.6, size: 5, color: "#f4f1ea", kind: "smoke" });
      }
    } else {
      rs.prevWheels[i] = null;
    }
    if (c.offTrack && speed > 50 && Math.random() < (reducedMotion ? 0.08 : 0.35)) {
      rs.particles.push({
        x: w.lx,
        y: w.ly,
        vx: (Math.random() - 0.5) * 40 - c.vx * 0.1,
        vy: (Math.random() - 0.5) * 40 - c.vy * 0.1,
        life: 0.5,
        max: 0.5,
        size: 3,
        color: "#c7b99a",
        kind: "dust",
      });
    }
    if (c.boost > 0 && !reducedMotion && Math.random() < 0.6) {
      const fx = Math.cos(c.a);
      const fy = Math.sin(c.a);
      rs.particles.push({
        x: c.x - fx * CAR_LEN * 0.55,
        y: c.y - fy * CAR_LEN * 0.55,
        vx: -fx * 120 + (Math.random() - 0.5) * 60,
        vy: -fy * 120 + (Math.random() - 0.5) * 60,
        life: 0.3,
        max: 0.3,
        size: 2.5,
        color: Math.random() < 0.5 ? ACCENT : "#ffc43d",
        kind: "spark",
      });
    }
  });
  for (const p of rs.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
  }
  rs.particles = rs.particles.filter((p) => p.life > 0);
  if (rs.particles.length > 400) rs.particles.splice(0, rs.particles.length - 400);
  for (const f of rs.floats) {
    f.life -= dt;
    f.y -= 22 * dt;
  }
  rs.floats = rs.floats.filter((f) => f.life > 0);
  if (rs.banner) {
    rs.banner.life -= dt;
    if (rs.banner.life <= 0) rs.banner = null;
  }
}

export function burst(rs: RenderState, x: number, y: number, n: number, color: string, speed = 160) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    rs.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4, max: 0.4, size: 2.5, color, kind: "spark" });
  }
}

function drawCar(g: CanvasRenderingContext2D, c: Car, p: PlayerConfig, time: number) {
  const L = CAR_LEN;
  const Wd = CAR_WID;
  g.save();
  g.translate(c.x, c.y);
  g.rotate(c.a);
  if (c.ghost) g.globalAlpha = 0.55;
  // shadow
  g.fillStyle = "rgba(22,22,26,0.28)";
  g.beginPath();
  g.roundRect(-L / 2 + 2, -Wd / 2 + 3, L, Wd, 6);
  g.fill();
  // boost flame
  if (c.boost > 0) {
    const fl = 10 + Math.sin(time * 60) * 3;
    g.fillStyle = "#ffc43d";
    g.beginPath();
    g.moveTo(-L / 2, -4);
    g.lineTo(-L / 2 - fl - 6, 0);
    g.lineTo(-L / 2, 4);
    g.fill();
    g.fillStyle = ACCENT;
    g.beginPath();
    g.moveTo(-L / 2, -3);
    g.lineTo(-L / 2 - fl, 0);
    g.lineTo(-L / 2, 3);
    g.fill();
  }
  // wheels
  g.fillStyle = INK;
  const wl = 8;
  const ww = 4;
  for (const sx of [-1, 1]) {
    // rear
    g.fillRect(-L * 0.32 - wl / 2, sx * (Wd / 2) - ww / 2, wl, ww);
    // front (steered)
    g.save();
    g.translate(L * 0.3, sx * (Wd / 2));
    g.rotate(c.steer * 0.45);
    g.fillRect(-wl / 2, -ww / 2, wl, ww);
    g.restore();
  }
  // body
  g.fillStyle = p.color;
  g.strokeStyle = p.shade;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(-L / 2, -Wd / 2, L, Wd, [4, 7, 7, 4]);
  g.fill();
  g.stroke();
  // racing stripe
  g.fillStyle = "rgba(255,255,255,0.7)";
  g.fillRect(-L / 2 + 1, -2, L - 2, 4);
  // cabin
  g.fillStyle = "rgba(22,22,26,0.88)";
  g.beginPath();
  g.roundRect(-7, -Wd / 2 + 2.5, 13, Wd - 5, 3);
  g.fill();
  g.fillStyle = "rgba(170,210,255,0.55)";
  g.fillRect(3, -Wd / 2 + 3.5, 3, Wd - 7);
  // lights
  g.fillStyle = "#fff6c9";
  g.fillRect(L / 2 - 2.5, -Wd / 2 + 2, 2, 3);
  g.fillRect(L / 2 - 2.5, Wd / 2 - 5, 2, 3);
  g.fillStyle = c.braking || c.vF < -5 ? "#ff2a2a" : "#7a1212";
  g.fillRect(-L / 2, -Wd / 2 + 2, 2, 3);
  g.fillRect(-L / 2, Wd / 2 - 5, 2, 3);
  if (c.braking) {
    g.fillStyle = "rgba(255,40,40,0.35)";
    g.beginPath();
    g.arc(-L / 2 - 2, 0, 7, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function fmtTime(t: number) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function fmtSec(t: number) {
  return `${t.toFixed(2)} s`;
}

export function drawFrame(
  g: CanvasRenderingContext2D,
  rs: RenderState,
  race: Race,
  players: PlayerConfig[],
  opts: { started: boolean; goFlash: number },
) {
  const t = race.track;
  g.save();
  g.clearRect(0, 0, W, H);
  if (rs.staticLayer) g.drawImage(rs.staticLayer, 0, 0, W, H);
  if (rs.skid) g.drawImage(rs.skid, 0, 0, W, H);

  // Boost chevrons.
  for (const b of t.boosts) {
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.angle);
    for (let k = 0; k < 3; k++) {
      const phase = (rs.time * 2.2 - k * 0.33) % 1;
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(phase * Math.PI));
      g.strokeStyle = `rgba(255,47,79,${a.toFixed(3)})`;
      g.lineWidth = 4;
      g.lineCap = "round";
      g.lineJoin = "round";
      const x = -14 + k * 12;
      g.beginPath();
      g.moveTo(x - 5, -10);
      g.lineTo(x + 4, 0);
      g.lineTo(x - 5, 10);
      g.stroke();
    }
    g.restore();
  }

  // Particles (under cars).
  for (const p of rs.particles) {
    const k = p.life / p.max;
    if (p.kind === "smoke") {
      g.fillStyle = `rgba(244,241,234,${(0.55 * k).toFixed(3)})`;
      g.beginPath();
      g.arc(p.x, p.y, p.size * (1.8 - k), 0, Math.PI * 2);
      g.fill();
    } else {
      g.globalAlpha = Math.max(0, k);
      g.fillStyle = p.color;
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      g.globalAlpha = 1;
    }
  }

  // Cars: ghosts first.
  const order = race.cars.slice().sort((a, b) => Number(b.ghost) - Number(a.ghost));
  for (const c of order) drawCar(g, c, players[c.id], rs.time);

  // Position tags.
  const st = standings(race);
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const c of race.cars) {
    const pos = st.indexOf(c.id) + 1;
    const p = players[c.id];
    const tx = c.x;
    const ty = c.y - 24;
    g.globalAlpha = c.ghost ? 0.6 : 1;
    g.fillStyle = p.color;
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.beginPath();
    if (!p.cpu) {
      g.roundRect(tx - 17, ty - 9, 34, 18, 9);
    } else {
      g.arc(tx, ty, 9, 0, Math.PI * 2);
    }
    g.fill();
    g.stroke();
    if (!p.cpu) {
      g.beginPath();
      g.moveTo(tx - 4, ty + 9);
      g.lineTo(tx, ty + 14);
      g.lineTo(tx + 4, ty + 9);
      g.fillStyle = INK;
      g.fill();
    }
    g.fillStyle = INK;
    g.font = `800 11px ${rs.fontSans}`;
    g.fillText(p.cpu ? String(pos) : `P${pos}`, tx, ty + 0.5);
    g.globalAlpha = 1;
  }

  // Floating texts.
  for (const f of rs.floats) {
    g.globalAlpha = Math.min(1, f.life * 2);
    g.font = `800 15px ${rs.fontMono}`;
    g.lineWidth = 4;
    g.strokeStyle = PAPER;
    g.strokeText(f.text, f.x, f.y);
    g.fillStyle = f.color;
    g.fillText(f.text, f.x, f.y);
    g.globalAlpha = 1;
  }

  // Start lights / GO.
  if (!opts.started || opts.goFlash > 0) {
    const cx = W / 2;
    const cy = 54;
    g.fillStyle = INK;
    g.beginPath();
    g.roundRect(cx - 92, cy - 26, 184, 52, 26);
    g.fill();
    for (let k = 0; k < 4; k++) {
      g.fillStyle = opts.started ? "#3fdc6a" : k < 3 ? "#ff2a2a" : "#3a3a40";
      g.beginPath();
      g.arc(cx - 66 + k * 44, cy, 15, 0, Math.PI * 2);
      g.fill();
    }
    if (opts.started) {
      g.font = `900 ${Math.round(120 + (1 - opts.goFlash) * 30)}px ${rs.fontSans}`;
      g.globalAlpha = Math.min(1, opts.goFlash * 1.6);
      g.lineWidth = 10;
      g.strokeStyle = PAPER;
      g.strokeText("GO!", W / 2, (H - HUD_H) / 2);
      g.fillStyle = ACCENT;
      g.fillText("GO!", W / 2, (H - HUD_H) / 2);
      g.globalAlpha = 1;
    }
  }

  // Banner.
  if (rs.banner) {
    const b = rs.banner;
    const k = Math.min(1, (b.max - b.life) * 6, b.life * 2.5);
    g.globalAlpha = Math.max(0, k);
    const y = (H - HUD_H) / 2;
    g.font = `900 64px ${rs.fontSans}`;
    g.lineWidth = 10;
    g.strokeStyle = PAPER;
    g.strokeText(b.text, W / 2, y);
    g.fillStyle = b.color;
    g.fillText(b.text, W / 2, y);
    if (b.sub) {
      g.font = `700 22px ${rs.fontMono}`;
      g.lineWidth = 6;
      g.strokeText(b.sub, W / 2, y + 50);
      g.fillStyle = INK;
      g.fillText(b.sub, W / 2, y + 50);
    }
    g.globalAlpha = 1;
  }

  // Finish countdown.
  if (race.graceEnd !== null && race.phase !== "over") {
    const left = Math.max(0, race.graceEnd - race.time);
    g.fillStyle = INK;
    g.beginPath();
    g.roundRect(W / 2 - 110, 18, 220, 50, 25);
    g.fill();
    g.fillStyle = left < 5 ? ACCENT : PAPER;
    g.font = `800 22px ${rs.fontMono}`;
    g.fillText(`FINISH IN ${Math.ceil(left)}s`, W / 2, 44);
  }

  drawHud(g, rs, race, players, st);
  g.restore();
}

function drawHud(g: CanvasRenderingContext2D, rs: RenderState, race: Race, players: PlayerConfig[], st: number[]) {
  const y0 = H - HUD_H;
  g.fillStyle = INK;
  g.fillRect(0, y0, W, HUD_H);
  g.fillStyle = ACCENT;
  g.fillRect(0, y0, W, 3);
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.fillStyle = PAPER;
  g.font = `900 20px ${rs.fontSans}`;
  g.fillText(race.track.def.name.toUpperCase(), 18, y0 + 24);
  g.font = `600 12px ${rs.fontMono}`;
  g.fillStyle = "rgba(233,228,216,0.6)";
  g.fillText(`${LAPS} LAPS · LEADER LAP ${race.leaderLap}/${LAPS}`, 18, y0 + 43);

  const left = 270;
  const right = W - 150;
  const cw = (right - left) / players.length;
  st.forEach((id, rank) => {
    const c = race.cars[id];
    const p = players[id];
    const x = left + rank * cw;
    g.fillStyle = "rgba(233,228,216,0.07)";
    g.beginPath();
    g.roundRect(x + 4, y0 + 8, cw - 8, HUD_H - 14, 10);
    g.fill();
    g.fillStyle = p.color;
    g.fillRect(x + 4, y0 + 8, 6, HUD_H - 14);
    g.font = `900 26px ${rs.fontSans}`;
    g.fillStyle = PAPER;
    g.fillText(String(rank + 1), x + 18, y0 + 31);
    const tx = x + 44;
    g.font = `800 14px ${rs.fontSans}`;
    g.fillStyle = p.color;
    const maxW = cw - 54;
    let name = p.name;
    while (g.measureText(name).width > maxW && name.length > 3) name = name.slice(0, -1);
    g.fillText(name, tx, y0 + 22);
    g.font = `600 11px ${rs.fontMono}`;
    g.fillStyle = "rgba(233,228,216,0.75)";
    const best = c.bestLap !== null ? ` · BEST ${c.bestLap.toFixed(2)}` : "";
    const line = c.finished && c.finishTime !== null ? `FIN ${c.finishTime.toFixed(2)}s` : `LAP ${lapOf(c)}/${LAPS}${best}`;
    let ln = line;
    while (g.measureText(ln).width > maxW && ln.length > 3) ln = ln.slice(0, -1);
    g.fillText(ln, tx, y0 + 40);
  });

  g.textAlign = "right";
  g.font = `700 22px ${rs.fontMono}`;
  g.fillStyle = PAPER;
  g.fillText(fmtTime(race.time), W - 18, y0 + 30);
}

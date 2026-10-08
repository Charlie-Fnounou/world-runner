/**
 * Tiny purpose-built 2D physics for Chain Reaction. No DOM, no deps.
 *
 * - Dynamic circles (balls, bomb debris) with gravity.
 * - Static capsules (walls, ramps, springs) and static circles (bumpers, bombs).
 * - Dominoes are rigid rods hinged at their base pivot; they topple under
 *   gravity torque once nudged, and exchange impulses with balls, other
 *   dominoes and static geometry.
 * Integrate with a fixed substep (`SUBSTEP`) for stability.
 */

export const WORLD_W = 1200;
export const WORLD_H = 750;
export const GRAVITY = 1500;
export const SUBSTEP = 1 / 240;

export const BALL_R = 14;
export const DOMINO_H = 72;
export const DOMINO_W = 12;
export const RAMP_LEN = 150;
export const RAMP_R = 5;
export const SPRING_LEN = 70;
export const SPRING_R = 7;
export const SPRING_SPEED = 1250;
export const BUMPER_R = 24;
export const BUMPER_KICK = 640;
export const BOMB_R = 18;
export const TARGET_R = 20;
export const BLAST_R = 210;
export const BLAST_SPEED = 1100;
export const STAR_BLAST_R = 105;
/** Bombs within this distance of an explosion go off too. */
export const CHAIN_R = 180;
export const WALL_R = 8;

const DOMINO_M = 0.8;
const DOMINO_I = (DOMINO_M * DOMINO_H * DOMINO_H) / 3;
const MAX_SPEED = 1700;

export type PartKind = "ramp" | "bumper" | "domino" | "bomb" | "spring";

export interface Part {
  id: number;
  kind: PartKind;
  /** Centre for ramps/springs/bumpers/bombs; base pivot for dominoes. */
  x: number;
  y: number;
  /** Radians. Ramps & springs only. */
  angle: number;
  /** Pre-placed by the level (cannot be moved or removed). */
  fixed?: boolean;
  /** Override ramp length (fixed level ramps). */
  len?: number;
}

export interface WallDef {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r?: number;
}

export interface Seg {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r: number;
  e: number;
  kind: "wall" | "ramp" | "spring";
  /** Spring launch normal. */
  nx: number;
  ny: number;
  partId: number;
  anim: number;
}

export interface Circ {
  x: number;
  y: number;
  r: number;
  kind: "bumper" | "bomb";
  partId: number;
  alive: boolean;
  /** Seconds until a triggered bomb explodes; -1 when idle. */
  fuse: number;
  anim: number;
}

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  m: number;
  kind: "ball" | "debris";
  life: number;
  alive: boolean;
  trail: number[];
}

export interface Domino {
  px: number;
  py: number;
  th: number;
  om: number;
  partId: number;
  fixed: boolean;
}

export interface Target {
  x: number;
  y: number;
  r: number;
  hit: boolean;
  /** Seconds since hit (for animation). */
  t: number;
}

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export interface Shock {
  x: number;
  y: number;
  t: number;
}

export type PhysEvent =
  | { type: "bounce"; strength: number }
  | { type: "bumper" }
  | { type: "spring" }
  | { type: "clack"; strength: number }
  | { type: "boom" }
  | { type: "star"; index: number; count: number }
  | { type: "knock"; strength: number };

export interface World {
  segs: Seg[];
  circs: Circ[];
  bodies: Body[];
  dominoes: Domino[];
  targets: Target[];
  sparks: Spark[];
  shocks: Shock[];
  events: PhysEvent[];
  time: number;
  idle: number;
  seed: number;
  hits: number;
}

// ── geometry helpers (shared with rendering / hit testing) ────────────────

export function segEnds(p: Part): [number, number, number, number] {
  const len = p.kind === "spring" ? SPRING_LEN : (p.len ?? RAMP_LEN);
  const hx = (Math.cos(p.angle) * len) / 2;
  const hy = (Math.sin(p.angle) * len) / 2;
  return [p.x - hx, p.y - hy, p.x + hx, p.y + hy];
}

export function dominoTip(px: number, py: number, th: number): [number, number] {
  return [px + Math.sin(th) * DOMINO_H, py - Math.cos(th) * DOMINO_H];
}

/** Closest point on segment AB to P; returns [x, y, t]. */
export function closestOnSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number, number] {
  const sx = bx - ax;
  const sy = by - ay;
  const l2 = sx * sx + sy * sy;
  let t = l2 > 0 ? ((px - ax) * sx + (py - ay) * sy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return [ax + sx * t, ay + sy * t, t];
}

export function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const [cx, cy] = closestOnSeg(px, py, ax, ay, bx, by);
  return Math.hypot(px - cx, py - cy);
}

function cross(ax: number, ay: number, bx: number, by: number) {
  return ax * by - ay * bx;
}

// ── world construction ───────────────────────────────────────────────────

export interface LevelGeometry {
  start: { x: number; y: number; vx?: number; vy?: number };
  walls: WallDef[];
  targets: { x: number; y: number }[];
  balls?: { x: number; y: number }[];
}

export function makeBall(x: number, y: number, vx = 0, vy = 0): Body {
  return { x, y, vx, vy, r: BALL_R, m: 1, kind: "ball", life: Infinity, alive: true, trail: [] };
}

export function buildWorld(level: LevelGeometry, parts: Part[], seed = 1): World {
  const segs: Seg[] = level.walls.map((w) => ({
    ax: w.ax,
    ay: w.ay,
    bx: w.bx,
    by: w.by,
    r: w.r ?? WALL_R,
    e: 0.35,
    kind: "wall",
    nx: 0,
    ny: 0,
    partId: -1,
    anim: 0,
  }));
  const circs: Circ[] = [];
  const dominoes: Domino[] = [];
  for (const p of parts) {
    if (p.kind === "ramp" || p.kind === "spring") {
      const [ax, ay, bx, by] = segEnds(p);
      segs.push({
        ax,
        ay,
        bx,
        by,
        r: p.kind === "ramp" ? RAMP_R : SPRING_R,
        e: p.kind === "ramp" ? 0.25 : 0.3,
        kind: p.kind,
        nx: Math.sin(p.angle),
        ny: -Math.cos(p.angle),
        partId: p.id,
        anim: 0,
      });
    } else if (p.kind === "bumper" || p.kind === "bomb") {
      circs.push({ x: p.x, y: p.y, r: p.kind === "bumper" ? BUMPER_R : BOMB_R, kind: p.kind, partId: p.id, alive: true, fuse: -1, anim: 0 });
    } else {
      dominoes.push({ px: p.x, py: p.y, th: 0, om: 0, partId: p.id, fixed: !!p.fixed });
    }
  }
  const bodies: Body[] = [makeBall(level.start.x, level.start.y, level.start.vx ?? 0, level.start.vy ?? 0)];
  for (const b of level.balls ?? []) bodies.push(makeBall(b.x, b.y));
  return {
    segs,
    circs,
    bodies,
    dominoes,
    targets: level.targets.map((t) => ({ x: t.x, y: t.y, r: TARGET_R, hit: false, t: 0 })),
    sparks: [],
    shocks: [],
    events: [],
    time: 0,
    idle: 0,
    seed: seed >>> 0 || 1,
    hits: 0,
  };
}

function rand(w: World) {
  let x = w.seed;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;
  x >>>= 0;
  w.seed = x;
  return x / 4294967296;
}

// ── simulation ───────────────────────────────────────────────────────────

/** Advance one fixed substep. */
export function step(w: World, dt: number = SUBSTEP) {
  w.time += dt;
  const { bodies, dominoes } = w;

  // Integrate bodies.
  for (const b of bodies) {
    if (!b.alive) continue;
    b.vy += GRAVITY * dt;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAX_SPEED) {
      b.vx *= MAX_SPEED / sp;
      b.vy *= MAX_SPEED / sp;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.kind === "debris") {
      b.life -= dt;
      if (b.life <= 0) b.alive = false;
    }
    if (b.y > WORLD_H + 80 || b.x < -100 || b.x > WORLD_W + 100) b.alive = false;
  }

  // Integrate dominoes (rod hinged at its base).
  for (const d of dominoes) {
    const alpha = ((3 * GRAVITY) / (2 * DOMINO_H)) * Math.sin(d.th);
    d.om += alpha * dt;
    d.om *= 1 - 0.4 * dt;
    d.th += d.om * dt;
    if (d.th > Math.PI) d.th -= Math.PI * 2;
    if (d.th < -Math.PI) d.th += Math.PI * 2;
  }

  // Collisions. A couple of iterations helps stacked contacts settle.
  for (let it = 0; it < 2; it++) {
    for (const b of bodies) {
      if (!b.alive) continue;
      for (const s of w.segs) collideBodySeg(w, b, s, it === 0);
      for (const c of w.circs) if (c.alive) collideBodyCirc(w, b, c, it === 0);
      for (const d of dominoes) collideBodyDomino(w, b, d, it === 0);
    }
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (!b.alive || (a.kind === "debris" && b.kind === "debris")) continue;
        collideBodies(w, a, b, it === 0);
      }
    }
    for (let i = 0; i < dominoes.length; i++) {
      const a = dominoes[i];
      for (let j = i + 1; j < dominoes.length; j++) {
        const b = dominoes[j];
        if (Math.abs(a.px - b.px) > DOMINO_H * 2 + DOMINO_W || Math.abs(a.py - b.py) > DOMINO_H * 2 + DOMINO_W) continue;
        collideDominoTip(w, a, b, it === 0);
        collideDominoTip(w, b, a, it === 0);
      }
      collideDominoStatic(w, a, it === 0);
    }
  }

  // Fuses.
  for (const c of w.circs) {
    if (c.alive && c.kind === "bomb" && c.fuse >= 0) {
      c.fuse -= dt;
      if (c.fuse <= 0) explode(w, c);
    }
  }

  // Targets.
  for (let ti = 0; ti < w.targets.length; ti++) {
    const t = w.targets[ti];
    if (t.hit) continue;
    let touched = false;
    for (const b of bodies) {
      if (!b.alive) continue;
      const rr = t.r + b.r;
      const dx = b.x - t.x;
      const dy = b.y - t.y;
      if (dx * dx + dy * dy < rr * rr) {
        touched = true;
        break;
      }
    }
    if (!touched) {
      for (const d of dominoes) {
        if (Math.abs(d.om) < 0.15) continue;
        const [tx, ty] = dominoTip(d.px, d.py, d.th);
        if (distToSeg(t.x, t.y, d.px, d.py, tx, ty) < t.r + DOMINO_W / 2) {
          touched = true;
          break;
        }
      }
    }
    if (touched) hitTarget(w, ti);
  }

  // Activity tracking (for "the machine has stopped").
  let active = false;
  for (const b of bodies) {
    if (!b.alive) continue;
    if (b.kind === "debris" || b.vx * b.vx + b.vy * b.vy > 30 * 30) {
      active = true;
      break;
    }
  }
  if (!active) for (const d of dominoes) if (Math.abs(d.om) > 0.12) active = true;
  if (!active) for (const c of w.circs) if (c.alive && c.fuse >= 0) active = true;
  w.idle = active ? 0 : w.idle + dt;
}

function hitTarget(w: World, ti: number) {
  const t = w.targets[ti];
  if (t.hit) return;
  t.hit = true;
  t.t = 0;
  w.hits++;
  w.events.push({ type: "star", index: ti, count: w.hits });
  for (let k = 0; k < 18; k++) {
    const a = rand(w) * Math.PI * 2;
    const s = 120 + rand(w) * 260;
    w.sparks.push({ x: t.x, y: t.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7, max: 0.7, color: k % 3 ? "#ff4f2e" : "#1b1b1b", size: 3 + rand(w) * 3 });
  }
}

function trigger(c: Circ, delay = 0.03) {
  if (c.kind === "bomb" && c.alive && c.fuse < 0) c.fuse = delay;
}

function collideBodySeg(w: World, b: Body, s: Seg, first: boolean) {
  const [cx, cy] = closestOnSeg(b.x, b.y, s.ax, s.ay, s.bx, s.by);
  let dx = b.x - cx;
  let dy = b.y - cy;
  const R = b.r + s.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return;
  let d = Math.sqrt(d2);
  if (d < 1e-6) {
    // Dead centre: push out along the segment normal.
    const sx = s.bx - s.ax;
    const sy = s.by - s.ay;
    const l = Math.hypot(sx, sy) || 1;
    dx = -sy / l;
    dy = sx / l;
    d = 1;
  }
  const nx = dx / d;
  const ny = dy / d;
  const pen = R - Math.sqrt(d2);
  b.x += nx * pen;
  b.y += ny * pen;
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  if (s.kind === "spring" && b.kind === "ball" && nx * s.nx + ny * s.ny > 0.55) {
    const tx = b.vx - vn * nx;
    const ty = b.vy - vn * ny;
    b.vx = s.nx * SPRING_SPEED + tx * 0.35;
    b.vy = s.ny * SPRING_SPEED + ty * 0.35;
    s.anim = 1;
    w.events.push({ type: "spring" });
    return;
  }
  const e = -vn < 70 ? 0 : s.e;
  b.vx -= (1 + e) * vn * nx;
  b.vy -= (1 + e) * vn * ny;
  // Rolling friction on the tangential component.
  const tvx = b.vx - (b.vx * nx + b.vy * ny) * nx;
  const tvy = b.vy - (b.vx * nx + b.vy * ny) * ny;
  const f = 0.35 * SUBSTEP;
  b.vx -= tvx * f;
  b.vy -= tvy * f;
  if (first && -vn > 140 && b.kind === "ball") w.events.push({ type: "bounce", strength: -vn });
}

function collideBodyCirc(w: World, b: Body, c: Circ, first: boolean) {
  const dx = b.x - c.x;
  const dy = b.y - c.y;
  const R = b.r + c.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return;
  const d = Math.sqrt(d2) || 1;
  const nx = dx / d;
  const ny = dy / d;
  b.x = c.x + nx * R;
  b.y = c.y + ny * R;
  const vn = b.vx * nx + b.vy * ny;
  if (c.kind === "bomb") {
    // Only real balls set bombs off (debris would make chains too random).
    if (b.kind === "ball" && Math.hypot(b.vx, b.vy) > 25) trigger(c);
    if (vn < 0) {
      b.vx -= 1.3 * vn * nx;
      b.vy -= 1.3 * vn * ny;
    }
    return;
  }
  // Bumper.
  if (vn < 0) {
    b.vx -= 1.8 * vn * nx;
    b.vy -= 1.8 * vn * ny;
  }
  const out = b.vx * nx + b.vy * ny;
  if (out < BUMPER_KICK && b.kind === "ball") {
    b.vx += (BUMPER_KICK - out) * nx;
    b.vy += (BUMPER_KICK - out) * ny;
  }
  if (first && vn < -20) {
    c.anim = 1;
    w.events.push({ type: "bumper" });
  }
}

function collideBodies(w: World, a: Body, b: Body, first: boolean) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const R = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return;
  const d = Math.sqrt(d2) || 1;
  const nx = dx / d;
  const ny = dy / d;
  const pen = R - d;
  const ia = 1 / a.m;
  const ib = 1 / b.m;
  const sum = ia + ib;
  a.x -= nx * pen * (ia / sum);
  a.y -= ny * pen * (ia / sum);
  b.x += nx * pen * (ib / sum);
  b.y += ny * pen * (ib / sum);
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return;
  const j = (-(1 + 0.75) * vn) / sum;
  a.vx -= j * nx * ia;
  a.vy -= j * ny * ia;
  b.vx += j * nx * ib;
  b.vy += j * ny * ib;
  if (first && -vn > 120 && a.kind === "ball" && b.kind === "ball") w.events.push({ type: "knock", strength: -vn });
}

function collideBodyDomino(w: World, b: Body, d: Domino, first: boolean) {
  const [tx, ty] = dominoTip(d.px, d.py, d.th);
  const [cx, cy] = closestOnSeg(b.x, b.y, d.px, d.py, tx, ty);
  const dx = b.x - cx;
  const dy = b.y - cy;
  const R = b.r + DOMINO_W / 2;
  const d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return;
  const dist = Math.sqrt(d2) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const pen = R - dist;
  b.x += nx * pen;
  b.y += ny * pen;
  const rx = cx - d.px;
  const ry = cy - d.py;
  // Velocity of the domino at the contact point: ω × r.
  const vdx = -d.om * ry;
  const vdy = d.om * rx;
  const vn = (b.vx - vdx) * nx + (b.vy - vdy) * ny;
  if (vn >= 0) return;
  const k = cross(rx, ry, nx, ny);
  const j = (-(1 + 0.3) * vn) / (1 / b.m + (k * k) / DOMINO_I);
  b.vx += (j * nx) / b.m;
  b.vy += (j * ny) / b.m;
  d.om -= (j * k) / DOMINO_I;
  if (first && -vn > 80) w.events.push({ type: "clack", strength: -vn });
}

/** Tip of domino `a` against the rod of domino `b`. */
function collideDominoTip(w: World, a: Domino, b: Domino, first: boolean) {
  const [ax, ay] = dominoTip(a.px, a.py, a.th);
  const [bx, by] = dominoTip(b.px, b.py, b.th);
  const [cx, cy] = closestOnSeg(ax, ay, b.px, b.py, bx, by);
  const dx = ax - cx;
  const dy = ay - cy;
  const d2 = dx * dx + dy * dy;
  const R = DOMINO_W;
  if (d2 >= R * R) return;
  const dist = Math.sqrt(d2) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const pen = R - dist;
  const kA = cross(ax - a.px, ay - a.py, nx, ny);
  const kB = cross(cx - b.px, cy - b.py, nx, ny);
  // Positional correction, split by each rod's rotational "inverse mass".
  const wA = (kA * kA) / DOMINO_I;
  const wB = (kB * kB) / DOMINO_I;
  const wSum = wA + wB;
  if (wSum < 1e-6) return;
  a.th += clampAngle((pen * 0.8 * kA) / DOMINO_I / wSum);
  b.th -= clampAngle((pen * 0.8 * kB) / DOMINO_I / wSum);
  const vn = a.om * kA - b.om * kB;
  if (vn >= 0) return;
  const denom = (kA * kA) / DOMINO_I + (kB * kB) / DOMINO_I;
  if (denom < 1e-9) return;
  const j = (-(1 + 0.1) * vn) / denom;
  a.om += (j * kA) / DOMINO_I;
  b.om -= (j * kB) / DOMINO_I;
  if (first && -vn > 60) w.events.push({ type: "clack", strength: -vn });
}

function clampAngle(v: number) {
  return v > 0.06 ? 0.06 : v < -0.06 ? -0.06 : v;
}

/** Resolve a contact on domino `d` at rod point (cx,cy) with outward normal n. */
function dominoContact(w: World, d: Domino, cx: number, cy: number, nx: number, ny: number, pen: number, first: boolean): boolean {
  const k = cross(cx - d.px, cy - d.py, nx, ny);
  // Contacts close to the hinge (or along the rod's axis) can't be resolved by rotating.
  if (Math.abs(k) < DOMINO_H * 0.2) return false;
  d.th += clampAngle((pen * 0.8) / k);
  const vn = d.om * k;
  if (vn < 0) {
    d.om = -0.15 * d.om;
    if (first && -vn > 70) w.events.push({ type: "clack", strength: -vn * 0.7 });
  }
  return true;
}

function collideDominoStatic(w: World, d: Domino, first: boolean) {
  const [tx, ty] = dominoTip(d.px, d.py, d.th);
  const hw = DOMINO_W / 2;
  for (const s of w.segs) {
    // Tip against the capsule.
    const [cx, cy] = closestOnSeg(tx, ty, s.ax, s.ay, s.bx, s.by);
    let dx = tx - cx;
    let dy = ty - cy;
    let R = hw + s.r;
    let d2 = dx * dx + dy * dy;
    if (d2 < R * R) {
      const dist = Math.sqrt(d2) || 1;
      dominoContact(w, d, tx, ty, dx / dist, dy / dist, R - dist, first);
    }
    // Segment end caps against the rod (e.g. falling over a ledge corner).
    for (let e = 0; e < 2; e++) {
      const ex = e === 0 ? s.ax : s.bx;
      const ey = e === 0 ? s.ay : s.by;
      const [rx, ry, t] = closestOnSeg(ex, ey, d.px, d.py, tx, ty);
      if (t < 0.15 || t > 0.98) continue;
      dx = rx - ex;
      dy = ry - ey;
      R = hw + s.r;
      d2 = dx * dx + dy * dy;
      if (d2 >= R * R) continue;
      const dist = Math.sqrt(d2) || 1;
      dominoContact(w, d, rx, ry, dx / dist, dy / dist, R - dist, first);
    }
  }
  for (const c of w.circs) {
    if (!c.alive) continue;
    const [rx, ry, t] = closestOnSeg(c.x, c.y, d.px, d.py, tx, ty);
    if (t < 0.12) continue;
    const dx = rx - c.x;
    const dy = ry - c.y;
    const R = hw + c.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) continue;
    if (c.kind === "bomb" && Math.abs(d.om) > 0.3) trigger(c);
    const dist = Math.sqrt(d2) || 1;
    dominoContact(w, d, rx, ry, dx / dist, dy / dist, R - dist, first);
  }
}

export function explode(w: World, c: Circ) {
  if (!c.alive) return;
  c.alive = false;
  w.events.push({ type: "boom" });
  w.shocks.push({ x: c.x, y: c.y, t: 0 });
  for (const b of w.bodies) {
    if (!b.alive) continue;
    const dx = b.x - c.x;
    const dy = b.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > BLAST_R) continue;
    const mag = BLAST_SPEED * (1 - d / BLAST_R) * (b.kind === "debris" ? 0.3 : 1);
    b.vx += (dx / d) * mag;
    b.vy += (dy / d) * mag;
  }
  for (const dm of w.dominoes) {
    const mx = dm.px + Math.sin(dm.th) * DOMINO_H * 0.6;
    const my = dm.py - Math.cos(dm.th) * DOMINO_H * 0.6;
    const dx = mx - c.x;
    const dy = my - c.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > BLAST_R) continue;
    const J = BLAST_SPEED * 0.9 * DOMINO_M * (1 - d / BLAST_R);
    dm.om += cross(mx - dm.px, my - dm.py, (dx / d) * J, (dy / d) * J) / DOMINO_I;
  }
  for (const o of w.circs) {
    if (o === c || !o.alive || o.kind !== "bomb") continue;
    if (Math.hypot(o.x - c.x, o.y - c.y) < CHAIN_R) trigger(o, 0.14);
  }
  for (let ti = 0; ti < w.targets.length; ti++) {
    const t = w.targets[ti];
    if (!t.hit && Math.hypot(t.x - c.x, t.y - c.y) < STAR_BLAST_R + t.r) hitTarget(w, ti);
  }
  // Physical debris that can bounce around and touch targets.
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + rand(w) * 0.5;
    const s = 450 + rand(w) * 400;
    w.bodies.push({ x: c.x + Math.cos(a) * 8, y: c.y + Math.sin(a) * 8, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 150, r: 4, m: 0.15, kind: "debris", life: 1.4 + rand(w) * 0.6, alive: true, trail: [] });
  }
  // Visual sparks.
  for (let k = 0; k < 34; k++) {
    const a = rand(w) * Math.PI * 2;
    const s = 150 + rand(w) * 520;
    w.sparks.push({
      x: c.x,
      y: c.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.4 + rand(w) * 0.5,
      max: 0.9,
      color: k % 4 === 0 ? "#1b1b1b" : k % 2 ? "#ff4f2e" : "#ffb02e",
      size: 2 + rand(w) * 4,
    });
  }
}

/** Per-frame cosmetic updates (sparks, trails, animations). */
export function updateCosmetics(w: World, dt: number) {
  for (const s of w.sparks) {
    s.life -= dt;
    s.vy += 900 * dt;
    s.vx *= 1 - 1.5 * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }
  if (w.sparks.length > 0) w.sparks = w.sparks.filter((s) => s.life > 0);
  for (const sh of w.shocks) sh.t += dt;
  if (w.shocks.length > 0) w.shocks = w.shocks.filter((s) => s.t < 0.6);
  for (const t of w.targets) if (t.hit) t.t += dt;
  for (const s of w.segs) s.anim = Math.max(0, s.anim - dt * 4);
  for (const c of w.circs) c.anim = Math.max(0, c.anim - dt * 5);
  for (const b of w.bodies) {
    if (!b.alive) continue;
    b.trail.push(b.x, b.y);
    const max = b.kind === "ball" ? 60 : 16;
    if (b.trail.length > max) b.trail.splice(0, b.trail.length - max);
  }
  if (w.bodies.length > 40) w.bodies = w.bodies.filter((b) => b.alive);
}

export function allTargetsHit(w: World) {
  return w.targets.length > 0 && w.targets.every((t) => t.hit);
}

/**
 * Find the first walkable surface below (x, y) — used to stand dominoes on
 * the floor. Returns the y of the surface top, or null if none is close.
 */
export function surfaceBelow(x: number, y: number, segs: { ax: number; ay: number; bx: number; by: number; r: number }[], reach = 170): number | null {
  let best: number | null = null;
  for (const s of segs) {
    const minX = Math.min(s.ax, s.bx);
    const maxX = Math.max(s.ax, s.bx);
    if (x < minX || x > maxX || maxX - minX < 1) continue;
    const slope = (s.by - s.ay) / (s.bx - s.ax);
    if (Math.abs(slope) > 0.4) continue;
    const top = s.ay + (x - s.ax) * slope - s.r * Math.sqrt(1 + slope * slope);
    if (top < y - 40 || top > y + reach) continue;
    if (best === null || top < best) best = top;
  }
  return best;
}

/** Static segments a level + its parts produce (for snapping & hit tests). */
export function staticSegs(walls: WallDef[], parts: Part[]) {
  const out = walls.map((w) => ({ ax: w.ax, ay: w.ay, bx: w.bx, by: w.by, r: w.r ?? WALL_R }));
  for (const p of parts) {
    if (p.kind !== "ramp" && p.kind !== "spring") continue;
    const [ax, ay, bx, by] = segEnds(p);
    out.push({ ax, ay, bx, by, r: p.kind === "ramp" ? RAMP_R : SPRING_R });
  }
  return out;
}

/** Squared distance between segments P1Q1 and P2Q2. */
export function segSegDist(p1x: number, p1y: number, q1x: number, q1y: number, p2x: number, p2y: number, q2x: number, q2y: number): number {
  const d1x = q1x - p1x;
  const d1y = q1y - p1y;
  const d2x = q2x - p2x;
  const d2y = q2y - p2y;
  const rx = p1x - p2x;
  const ry = p1y - p2y;
  const a = d1x * d1x + d1y * d1y;
  const e = d2x * d2x + d2y * d2y;
  const f = d2x * rx + d2y * ry;
  let s: number;
  let t: number;
  if (a < 1e-9 && e < 1e-9) return Math.hypot(rx, ry);
  if (a < 1e-9) {
    s = 0;
    t = Math.min(1, Math.max(0, f / e));
  } else {
    const c = d1x * rx + d1y * ry;
    if (e < 1e-9) {
      t = 0;
      s = Math.min(1, Math.max(0, -c / a));
    } else {
      const b = d1x * d2x + d1y * d2y;
      const denom = a * e - b * b;
      s = denom > 1e-9 ? Math.min(1, Math.max(0, (b * f - c * e) / denom)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (b - c) / a));
      }
    }
  }
  const cx = p1x + d1x * s - (p2x + d2x * t);
  const cy = p1y + d1y * s - (p2y + d2y * t);
  return Math.hypot(cx, cy);
}

/** Capsule (segment + radius) used for placement overlap checks. */
export interface Shape {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r: number;
}

export function partShape(p: Part): Shape {
  switch (p.kind) {
    case "ramp":
    case "spring": {
      const [ax, ay, bx, by] = segEnds(p);
      return { ax, ay, bx, by, r: p.kind === "ramp" ? RAMP_R : SPRING_R };
    }
    case "bumper":
      return { ax: p.x, ay: p.y, bx: p.x, by: p.y, r: BUMPER_R };
    case "bomb":
      return { ax: p.x, ay: p.y, bx: p.x, by: p.y, r: BOMB_R };
    default:
      // Upright domino, trimmed at the base so it may stand on a surface.
      return { ax: p.x, ay: p.y - 12, bx: p.x, by: p.y - DOMINO_H, r: DOMINO_W / 2 };
  }
}

function shapesOverlap(a: Shape, b: Shape, margin = 0) {
  return segSegDist(a.ax, a.ay, a.bx, a.by, b.ax, b.ay, b.bx, b.by) < a.r + b.r + margin;
}

/**
 * Can `cand` sit here? Parts may not overlap dominoes, balls, targets or the
 * drop point. Round parts and dominoes may not sit inside walls. Ramps and
 * springs may touch walls and each other (to build chutes).
 */
export function placementOk(level: LevelGeometry, parts: Part[], cand: Part): boolean {
  const s = partShape(cand);
  const seg = cand.kind === "ramp" || cand.kind === "spring";
  if (Math.max(s.ax, s.bx) < 0 || Math.min(s.ax, s.bx) > WORLD_W || Math.max(s.ay, s.by) < 0 || Math.min(s.ay, s.by) > WORLD_H) return false;
  const pts = [{ x: level.start.x, y: level.start.y, r: BALL_R + 10 }, ...(level.balls ?? []).map((b) => ({ x: b.x, y: b.y, r: BALL_R + 4 })), ...level.targets.map((t) => ({ x: t.x, y: t.y, r: TARGET_R }))];
  for (const p of pts) {
    if (segSegDist(s.ax, s.ay, s.bx, s.by, p.x, p.y, p.x, p.y) < s.r + p.r) return false;
  }
  if (!seg) {
    for (const w of level.walls) {
      if (shapesOverlap(s, { ax: w.ax, ay: w.ay, bx: w.bx, by: w.by, r: w.r ?? WALL_R }, -1)) return false;
    }
  }
  for (const o of parts) {
    if (o.id === cand.id) continue;
    const oSeg = o.kind === "ramp" || o.kind === "spring";
    if (seg && oSeg) continue;
    // Keep a little clearance around dominoes so nothing nudges them at rest.
    const margin = cand.kind === "domino" || o.kind === "domino" ? 4 : 0;
    if (shapesOverlap(s, partShape(o), margin)) return false;
  }
  return true;
}

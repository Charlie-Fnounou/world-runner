/**
 * Bumper Arena — pure simulation (no DOM, no React).
 * `createArena` builds the state; `step(state, inputs, dt)` advances it and
 * fills `state.events` for sound / particles in the renderer.
 */
import { rng } from "../../lib/random";

export const W = 1280;
export const H = 720;
export const ACX = 640;
export const ACY = 404;
export const R_START = 288;
export const R_MIN = 118;
export const BUMPER_R = 28;
export const HEAVY_R = 35;
export const PICKUP_R = 15;
export const WINS_NEEDED = 2;
/** px per metre (a bumper is ~2 m across) for human-friendly speeds. */
export const PX_PER_M = BUMPER_R;

const ACCEL = 660;
const DRAG = 1.9; // terminal ≈ 347 px/s
const DASH_SPEED = 440;
export const DASH_COOLDOWN = 1.5;
const RESTITUTION = 0.92;
const PUNCH = 1.1; // arcade knockback bonus on every hit
const SHRINK_GRACE = 3;
const SHRINK_RATE = 4;
const SUDDEN_DEATH_AT = 45;
const SUDDEN_SHRINK = 16;
export const FALL_TIME = 0.9;
const HEAVY_TIME = 5;
const HEAVY_MASS = 2.2;
const KO_WINDOW = 2;
const INTRO_FIRST = 0.9;
const INTRO_NEXT = 1.9;
const ROUND_END_TIME = 2.6;

export interface Input {
  x: number;
  y: number;
  action: boolean;
  actionPressed: boolean;
}

export interface Seat {
  cpu: boolean;
}

export interface Bumper {
  id: number;
  cpu: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  r: number;
  mass: number;
  dashCd: number;
  /** >0 while the dash burst is visually active. */
  dashT: number;
  heavyT: number;
  alive: boolean;
  falling: boolean;
  fallT: number;
  /** Round time the bumper went over the edge (−1 if still in). */
  outAt: number;
  /** Simulation frame index when it went over (for same-frame draws). */
  outFrame: number;
  lastHitBy: number;
  lastHitT: number;
  /** Visual squash from impacts. */
  squash: number;
  // AI
  aiTimer: number;
  aiTarget: number;
  aiDx: number;
  aiDy: number;
  aiDash: boolean;
}

export interface Pickup {
  x: number;
  y: number;
  t: number;
  life: number;
}

export type ArenaEvent =
  | { type: "hit"; x: number; y: number; a: number; b: number; speed: number }
  | { type: "dash"; id: number; x: number; y: number }
  | { type: "fall"; id: number; x: number; y: number; by: number }
  | { type: "pickup"; id: number; x: number; y: number }
  | { type: "spawn"; x: number; y: number }
  | { type: "fight"; round: number }
  | { type: "sudden" }
  | { type: "roundEnd"; winner: number }
  | { type: "end" };

export type Phase = "intro" | "fight" | "roundEnd" | "over";

export interface ArenaState {
  rand: ReturnType<typeof rng>;
  n: number;
  bs: Bumper[];
  pickup: Pickup | null;
  nextPickup: number;
  radius: number;
  phase: Phase;
  phaseT: number;
  roundT: number;
  frame: number;
  round: number;
  roundsPlayed: number;
  draws: number;
  wins: number[];
  /** Winner of the last finished round (−1 = draw). */
  roundWinner: number;
  sudden: boolean;
  /** Knockouts credited per bumper. */
  kos: number[];
  /** Falls with no one to blame. */
  selfFalls: number[];
  /** Survival rank info for the most recent finished round: outFrame (Infinity for the winner). */
  lastSurvival: number[];
  biggestHit: { by: number; on: number; speed: number } | null;
  events: ArenaEvent[];
}

const len = (x: number, y: number) => Math.hypot(x, y);

export function createArena(seats: Seat[], seed: number): ArenaState {
  const n = seats.length;
  const s: ArenaState = {
    rand: rng(seed),
    n,
    bs: seats.map((seat, id) => ({
      id,
      cpu: seat.cpu,
      x: ACX,
      y: ACY,
      vx: 0,
      vy: 0,
      fx: 1,
      fy: 0,
      r: BUMPER_R,
      mass: 1,
      dashCd: 0,
      dashT: 0,
      heavyT: 0,
      alive: true,
      falling: false,
      fallT: 0,
      outAt: -1,
      outFrame: -1,
      lastHitBy: -1,
      lastHitT: -99,
      squash: 0,
      aiTimer: 0,
      aiTarget: -1,
      aiDx: 0,
      aiDy: 0,
      aiDash: false,
    })),
    pickup: null,
    nextPickup: 0,
    radius: R_START,
    phase: "intro",
    phaseT: 0,
    roundT: 0,
    frame: 0,
    round: 1,
    roundsPlayed: 0,
    draws: 0,
    wins: Array(n).fill(0),
    roundWinner: -1,
    sudden: false,
    kos: Array(n).fill(0),
    selfFalls: Array(n).fill(0),
    lastSurvival: Array(n).fill(0),
    biggestHit: null,
    events: [],
  };
  setupRound(s);
  return s;
}

function setupRound(s: ArenaState) {
  s.radius = R_START;
  s.roundT = 0;
  s.sudden = false;
  s.pickup = null;
  s.nextPickup = 6 + s.rand.next() * 3;
  s.phase = "intro";
  s.phaseT = 0;
  const offset = s.rand.next() < 0.5 ? 0 : Math.PI / s.n;
  s.bs.forEach((b, i) => {
    const a = Math.PI + offset + (i / s.n) * Math.PI * 2;
    const r0 = R_START * 0.58 + (s.rand.next() * 2 - 1) * 6;
    b.x = ACX + Math.cos(a) * r0;
    b.y = ACY + Math.sin(a) * r0;
    b.vx = b.vy = 0;
    b.fx = -Math.cos(a);
    b.fy = -Math.sin(a);
    b.r = BUMPER_R;
    b.mass = 1;
    b.dashCd = 0;
    b.dashT = 0;
    b.heavyT = 0;
    b.alive = true;
    b.falling = false;
    b.fallT = 0;
    b.outAt = -1;
    b.outFrame = -1;
    b.lastHitBy = -1;
    b.lastHitT = -99;
    b.squash = 0;
    b.aiTimer = 0.2 + s.rand.next() * 0.2;
    b.aiTarget = -1;
    b.aiDash = false;
  });
}

// ------------------------------------------------------------------ AI

function aiThink(s: ArenaState, b: Bumper) {
  const R = s.radius;
  const rx = b.x - ACX;
  const ry = b.y - ACY;
  const d = len(rx, ry);
  const toCx = -rx / (d || 1);
  const toCy = -ry / (d || 1);
  const predX = b.x + b.vx * 0.5 - ACX;
  const predY = b.y + b.vy * 0.5 - ACY;
  const predD = len(predX, predY);
  b.aiDash = false;

  // Danger: heading over the edge → steer home (and maybe dash home).
  if (predD > R - b.r * 0.9 || d > R - b.r * 1.4) {
    b.aiDx = toCx;
    b.aiDy = toCy;
    const outward = -(b.vx * toCx + b.vy * toCy);
    if (d > R - b.r * 0.6 && outward > 60 && b.dashCd <= 0 && s.rand.next() < 0.55) b.aiDash = true;
    return;
  }

  // Pick a target: nearest opponent, preferring ones close to the edge.
  const opps = s.bs.filter((o) => o !== b && o.alive);
  if (!opps.length) {
    b.aiDx = toCx * 0.4;
    b.aiDy = toCy * 0.4;
    return;
  }
  const score = (o: Bumper) => len(o.x - b.x, o.y - b.y) - 0.5 * len(o.x - ACX, o.y - ACY) - (o.id === b.aiTarget ? 60 : 0);
  let target = opps[0];
  for (const o of opps) if (score(o) < score(target)) target = o;
  b.aiTarget = target.id;

  // Detour for the power-up when it is clearly closer than the fight.
  const p = s.pickup;
  const distT = len(target.x - b.x, target.y - b.y);
  if (p && b.heavyT <= 0 && len(p.x - b.x, p.y - b.y) < distT * 0.7) {
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const l = len(dx, dy) || 1;
    b.aiDx = dx / l;
    b.aiDy = dy / l;
    return;
  }

  const ox = target.x - ACX;
  const oy = target.y - ACY;
  const od = len(ox, oy) || 1;
  const outX = ox / od;
  const outY = oy / od;
  // Hit point: behind the target relative to the centre, so the push sends them outward.
  const lead = 0.25;
  const tx = target.x + target.vx * lead;
  const ty = target.y + target.vy * lead;
  const behind = (b.x - target.x) * outX + (b.y - target.y) * outY; // <0 means we are on the inside
  let gx: number;
  let gy: number;
  if (behind < -b.r * 0.5) {
    gx = tx - b.x;
    gy = ty - b.y;
  } else {
    const k = b.r + target.r + 30;
    gx = tx - outX * k - b.x;
    gy = ty - outY * k - b.y;
  }
  const gl = len(gx, gy) || 1;
  gx /= gl;
  gy /= gl;
  // Blend in a pull toward the centre as we near the edge.
  const w = Math.max(0, Math.min(1, (d - (R - 110)) / 80));
  gx = gx * (1 - w) + toCx * w * 1.4;
  gy = gy * (1 - w) + toCy * w * 1.4;
  const l2 = len(gx, gy) || 1;
  b.aiDx = gx / l2;
  b.aiDy = gy / l2;

  // Dash when lined up and close, as long as it doesn't fling us off.
  if (b.dashCd <= 0 && distT < 175) {
    const ax = target.x - b.x;
    const ay = target.y - b.y;
    const al = len(ax, ay) || 1;
    const cos = (ax / al) * b.aiDx + (ay / al) * b.aiDy;
    const land = len(b.x + (ax / al) * 140 - ACX, b.y + (ay / al) * 140 - ACY);
    if (cos > 0.9 && land < R - 10 && s.rand.next() < 0.7) {
      b.aiDx = ax / al;
      b.aiDy = ay / al;
      b.aiDash = true;
    }
  }
}

// ------------------------------------------------------------------ physics

function dash(s: ArenaState, b: Bumper, dx: number, dy: number) {
  const l = len(dx, dy);
  if (l < 0.01) {
    dx = b.fx;
    dy = b.fy;
  } else {
    dx /= l;
    dy /= l;
  }
  b.vx += dx * DASH_SPEED;
  b.vy += dy * DASH_SPEED;
  b.fx = dx;
  b.fy = dy;
  b.dashCd = DASH_COOLDOWN;
  b.dashT = 0.3;
  s.events.push({ type: "dash", id: b.id, x: b.x, y: b.y });
}

function collide(s: ArenaState) {
  const live = s.bs.filter((b) => b.alive);
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const c = live[j];
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const d = len(dx, dy);
      const min = a.r + c.r;
      if (d >= min || d < 0.0001) continue;
      const nx = dx / d;
      const ny = dy / d;
      const ia = 1 / a.mass;
      const ic = 1 / c.mass;
      const push = (min - d) / (ia + ic);
      a.x -= nx * push * ia;
      a.y -= ny * push * ia;
      c.x += nx * push * ic;
      c.y += ny * push * ic;
      const vrel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
      if (vrel >= 0) continue;
      const jImp = ((-(1 + RESTITUTION) * vrel) / (ia + ic)) * PUNCH + 15;
      a.vx -= jImp * ia * nx;
      a.vy -= jImp * ia * ny;
      c.vx += jImp * ic * nx;
      c.vy += jImp * ic * ny;
      const speed = -vrel;
      a.lastHitBy = c.id;
      a.lastHitT = s.roundT;
      c.lastHitBy = a.id;
      c.lastHitT = s.roundT;
      a.squash = Math.min(1, speed / 400);
      c.squash = Math.min(1, speed / 400);
      // the "hitter" is whoever was moving into the contact harder
      const aIn = a.vx * nx + a.vy * ny;
      const cIn = -(c.vx * nx + c.vy * ny);
      const by = aIn >= cIn ? a.id : c.id;
      const on = by === a.id ? c.id : a.id;
      if (!s.biggestHit || speed > s.biggestHit.speed) s.biggestHit = { by, on, speed };
      if (speed > 40) s.events.push({ type: "hit", x: a.x + nx * a.r, y: a.y + ny * a.r, a: a.id, b: c.id, speed });
    }
  }
}

function survivalOrder(s: ArenaState, winner: number) {
  s.lastSurvival = s.bs.map((b) => (b.id === winner ? Number.POSITIVE_INFINITY : b.outFrame));
}

/** Advance the arena. `inputs[i]` is player i's input (ignored for CPU seats). */
export function step(s: ArenaState, inputs: (Input | null)[], dt: number) {
  s.events.length = 0;
  if (s.phase === "over") return;
  s.phaseT += dt;
  s.frame++;

  if (s.phase === "intro") {
    const dur = s.round === 1 ? INTRO_FIRST : INTRO_NEXT;
    if (s.phaseT >= dur) {
      s.phase = "fight";
      s.phaseT = 0;
      s.events.push({ type: "fight", round: s.round });
    }
    return;
  }

  if (s.phase === "roundEnd") {
    // losers finish falling; the survivor gets a victory lap but can't fall any more
    integrate(s, inputs, dt, true);
    for (const b of s.bs) {
      if (!b.alive) continue;
      const rx = b.x - ACX;
      const ry = b.y - ACY;
      const d = len(rx, ry);
      const lim = Math.max(0, s.radius - b.r * 0.5);
      if (d > lim && d > 0) {
        b.x = ACX + (rx / d) * lim;
        b.y = ACY + (ry / d) * lim;
        const vn = (b.vx * rx + b.vy * ry) / d;
        if (vn > 0) {
          b.vx -= (vn * rx) / d;
          b.vy -= (vn * ry) / d;
        }
      }
    }
    if (s.phaseT >= ROUND_END_TIME) {
      if (s.wins.some((w) => w >= WINS_NEEDED)) {
        s.phase = "over";
        s.events.push({ type: "end" });
      } else {
        s.round++;
        setupRound(s);
      }
    }
    return;
  }

  // fight
  s.roundT += dt;
  if (s.roundT > SUDDEN_DEATH_AT && !s.sudden) {
    s.sudden = true;
    s.events.push({ type: "sudden" });
  }
  if (s.roundT > SHRINK_GRACE) {
    const floor = s.sudden ? 0 : R_MIN;
    const rate = s.sudden ? SUDDEN_SHRINK : SHRINK_RATE;
    s.radius = Math.max(floor, s.radius - rate * dt);
  }

  // power-up
  if (s.pickup) {
    s.pickup.t += dt;
    const p = s.pickup;
    if (p.t > p.life || len(p.x - ACX, p.y - ACY) > s.radius - PICKUP_R) s.pickup = null;
  } else if (!s.sudden && s.roundT > s.nextPickup) {
    const a = s.rand.next() * Math.PI * 2;
    const r = Math.sqrt(s.rand.next()) * s.radius * 0.5;
    s.pickup = { x: ACX + Math.cos(a) * r, y: ACY + Math.sin(a) * r, t: 0, life: 8 };
    s.nextPickup = s.roundT + 10 + s.rand.next() * 4;
    s.events.push({ type: "spawn", x: s.pickup.x, y: s.pickup.y });
  }

  integrate(s, inputs, dt, true);
  collide(s);

  if (s.pickup) {
    const p = s.pickup;
    for (const b of s.bs) {
      if (!b.alive) continue;
      if (len(b.x - p.x, b.y - p.y) < b.r + PICKUP_R) {
        b.heavyT = HEAVY_TIME;
        s.events.push({ type: "pickup", id: b.id, x: p.x, y: p.y });
        s.pickup = null;
        s.nextPickup = s.roundT + 9 + s.rand.next() * 4;
        break;
      }
    }
  }

  // edge check
  for (const b of s.bs) {
    if (!b.alive) continue;
    if (len(b.x - ACX, b.y - ACY) > s.radius) {
      b.alive = false;
      b.falling = true;
      b.fallT = 0;
      b.outAt = s.roundT;
      b.outFrame = s.frame;
      const credited = b.lastHitBy >= 0 && s.roundT - b.lastHitT <= KO_WINDOW ? b.lastHitBy : -1;
      if (credited >= 0) s.kos[credited]++;
      else s.selfFalls[b.id]++;
      s.events.push({ type: "fall", id: b.id, x: b.x, y: b.y, by: credited });
    }
  }

  const alive = s.bs.filter((b) => b.alive);
  if (alive.length <= 1) {
    s.roundsPlayed++;
    if (alive.length === 1) {
      const w = alive[0].id;
      s.wins[w]++;
      s.roundWinner = w;
      survivalOrder(s, w);
    } else {
      s.roundWinner = -1;
      s.draws++;
    }
    s.phase = "roundEnd";
    s.phaseT = 0;
    s.pickup = null;
    s.events.push({ type: "roundEnd", winner: s.roundWinner });
  }
}

function integrate(s: ArenaState, inputs: (Input | null)[], dt: number, control: boolean) {
  for (const b of s.bs) {
    b.squash = Math.max(0, b.squash - dt * 4);
    b.dashT = Math.max(0, b.dashT - dt);
    if (b.falling) {
      b.fallT += dt;
      const k = Math.exp(-1.2 * dt);
      b.vx *= k;
      b.vy *= k;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.fallT >= FALL_TIME) b.falling = false;
      continue;
    }
    if (!b.alive) continue;
    b.dashCd = Math.max(0, b.dashCd - dt);
    b.heavyT = Math.max(0, b.heavyT - dt);
    const heavy = b.heavyT > 0;
    const targetR = heavy ? HEAVY_R : BUMPER_R;
    b.r += (targetR - b.r) * Math.min(1, dt * 8);
    b.mass = heavy ? HEAVY_MASS : 1;

    let ix = 0;
    let iy = 0;
    let wantDash = false;
    if (control) {
      if (b.cpu) {
        b.aiTimer -= dt;
        if (b.aiTimer <= 0) {
          b.aiTimer = 0.14 + s.rand.next() * 0.1;
          aiThink(s, b);
        }
        ix = b.aiDx;
        iy = b.aiDy;
        if (b.aiDash) {
          wantDash = true;
          b.aiDash = false;
        }
      } else {
        const inp = inputs[b.id];
        if (inp) {
          ix = inp.x;
          iy = inp.y;
          wantDash = inp.actionPressed;
        }
      }
    }
    let l = len(ix, iy);
    if (l > 1) {
      ix /= l;
      iy /= l;
      l = 1;
    }
    const acc = ACCEL * (b.cpu ? 0.93 : 1) * (heavy ? 0.85 : 1);
    b.vx += ix * acc * dt;
    b.vy += iy * acc * dt;
    if (l > 0.1) {
      const k = Math.min(1, dt * 10);
      b.fx += (ix / l - b.fx) * k;
      b.fy += (iy / l - b.fy) * k;
      const fl = len(b.fx, b.fy) || 1;
      b.fx /= fl;
      b.fy /= fl;
    }
    if (wantDash && b.dashCd <= 0) dash(s, b, ix, iy);
    const drag = Math.exp(-DRAG * dt);
    b.vx *= drag;
    b.vy *= drag;
    const sp = len(b.vx, b.vy);
    const vmax = 1100;
    if (sp > vmax) {
      b.vx *= vmax / sp;
      b.vy *= vmax / sp;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
}

// ------------------------------------------------------------------ results

/** Rank per player: by round wins (desc), tiebreak by survival in the last round. Ties share rank. */
export function placementsFor(s: ArenaState): number[] {
  const better = (i: number, j: number) =>
    s.wins[i] > s.wins[j] || (s.wins[i] === s.wins[j] && s.lastSurvival[i] > s.lastSurvival[j]);
  return s.bs.map((_, i) => s.bs.filter((__, j) => better(j, i)).length);
}

export function champion(s: ArenaState): number {
  let best = 0;
  for (let i = 1; i < s.n; i++) if (s.wins[i] > s.wins[best]) best = i;
  return best;
}

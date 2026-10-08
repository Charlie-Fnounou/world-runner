/**
 * Micro Racers — pure race simulation: car physics, checkpoints/laps,
 * collisions, boost pads, CPU drivers. No DOM; step with a fixed dt.
 */
import { BOOST_LEN, BOOST_WID, H, HUD_H, W, pointAt, project, wrapDist, type Track } from "./track";

export const LAPS = 3;
export const CHECKPOINTS = 16;
export const FINISH_GRACE = 15;
export const CAR_R = 12;
export const CAR_LEN = 30;
export const CAR_WID = 16;

const ACC = 540;
const BRAKE = 760;
const REV_ACC = 360;
const REV_MAX = 140;
const DRAG = 1.48;
const DRAG_OFF = 4.6;
const TURN = 3.5;
const GRIP = 11;
const GRIP_HB = 1.7;
const GRIP_OFF = 5.5;
const BOOST_TIME = 0.85;
const BOOST_KICK = 450;
const BOOST_ACC = 260;

export interface CarInput {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
}

export const NO_INPUT: CarInput = { throttle: 0, brake: 0, steer: 0, handbrake: false };

export interface Car {
  id: number;
  cpu: boolean;
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  /** Forward / lateral speed (last step). */
  vF: number;
  vL: number;
  steer: number;
  handbrake: boolean;
  braking: boolean;
  hint: number;
  s: number;
  d: number;
  offTrack: boolean;
  /** Checkpoints passed in total (the start line counts as passed at the start). */
  cp: number;
  lapStart: number;
  lapTimes: number[];
  bestLap: number | null;
  finished: boolean;
  finishTime: number | null;
  finishPlace: number | null;
  /** Ghost cars (finished) don't collide. */
  ghost: boolean;
  boost: number;
  /** CPU personality. */
  skill: number;
  lineBias: number;
  stuck: number;
  reverse: number;
  progress: number;
}

export type RaceEvent =
  | { type: "lap"; car: number; lap: number; time: number; best: boolean }
  | { type: "finalLap"; car: number }
  | { type: "finish"; car: number; place: number; time: number }
  | { type: "boost"; car: number }
  | { type: "bump"; x: number; y: number; power: number }
  | { type: "over" };

export type RacePhase = "racing" | "finishing" | "over";

export interface Race {
  track: Track;
  cars: Car[];
  time: number;
  phase: RacePhase;
  graceEnd: number | null;
  finishOrder: number[];
  leaderLap: number;
}

/** Starting grid slot position (behind the start line). */
export function gridPose(track: Track, slot: number) {
  const row = Math.floor(slot / 2);
  const side = slot % 2 === 0 ? -1 : 1;
  return { s: track.length - 34 - row * 50 - (slot % 2) * 18, d: side * track.half * 0.42 };
}

export function createRace(track: Track, cpuFlags: boolean[], rand: () => number): Race {
  // Random grid order so nobody always gets pole position.
  const slots = cpuFlags.map((_, i) => i);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const cars: Car[] = cpuFlags.map((cpu, i) => {
    const { s, d: lat } = gridPose(track, slots[i]);
    const p = pointAt(track, s, lat);
    return {
      id: i,
      cpu,
      x: p.x,
      y: p.y,
      a: Math.atan2(p.ty, p.tx),
      vx: 0,
      vy: 0,
      vF: 0,
      vL: 0,
      steer: 0,
      handbrake: false,
      braking: false,
      hint: p.i,
      s,
      d: lat,
      offTrack: false,
      cp: 0,
      lapStart: 0,
      lapTimes: [],
      bestLap: null,
      finished: false,
      finishTime: null,
      finishPlace: null,
      ghost: false,
      boost: 0,
      skill: 0.84 + rand() * 0.14,
      lineBias: (rand() - 0.5) * 0.5,
      stuck: 0,
      reverse: 0,
      progress: 0,
    };
  });
  const race: Race = { track, cars, time: 0, phase: "racing", graceEnd: null, finishOrder: [], leaderLap: 1 };
  for (const c of cars) updateProgress(race, c);
  return race;
}

export function lapOf(c: Car) {
  return Math.min(LAPS, Math.floor(c.cp / CHECKPOINTS) + 1);
}

function updateProgress(race: Race, c: Car) {
  const t = race.track;
  const seg = t.length / CHECKPOINTS;
  const lastS = (c.cp % CHECKPOINTS) * seg;
  const rel = Math.max(-seg, Math.min(seg * 1.5, wrapDist(c.s - lastS, t.length)));
  c.progress = c.cp * seg + rel;
}

/** Current race order (car ids), first place first. */
export function standings(race: Race): number[] {
  return race.cars
    .slice()
    .sort((a, b) => {
      if (a.finished && b.finished) return (a.finishTime ?? 0) - (b.finishTime ?? 0) || (a.finishPlace ?? 0) - (b.finishPlace ?? 0);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    })
    .map((c) => c.id);
}

function angleWrap(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Max cornering speed for a radius, given the steering model (with margin). */
function cornerSpeed(radius: number) {
  const k = 700;
  return (-1 + Math.sqrt(1 + (4 * TURN * radius) / k)) * (k / 2);
}

/** CPU / autopilot driving. */
export function cpuInput(race: Race, c: Car, dt: number, cruise = 1): CarInput {
  const t = race.track;
  const speed = Math.hypot(c.vx, c.vy);
  const fx = Math.cos(c.a);
  const fy = Math.sin(c.a);

  // Unstick: reverse out when barely moving for a while.
  if (c.reverse > 0) {
    c.reverse -= dt;
    const tp = pointAt(t, c.s + 60, 0);
    const want = Math.atan2(tp.y - c.y, tp.x - c.x);
    const diff = angleWrap(want - c.a);
    return { throttle: 0, brake: 1, steer: diff > 0 ? -1 : 1, handbrake: false };
  }
  if (race.time > 1.2 && speed < 22) {
    c.stuck += dt;
    if (c.stuck > 0.9) {
      c.stuck = 0;
      c.reverse = 0.75;
    }
  } else {
    c.stuck = Math.max(0, c.stuck - dt * 2);
  }

  // Avoid cars right ahead.
  let avoid = 0;
  for (const o of race.cars) {
    if (o === c || o.ghost || c.ghost) continue;
    const ahead = wrapDist(o.s - c.s, t.length);
    if (ahead > 0 && ahead < 70 + speed * 0.12 && Math.abs(o.d - c.d) < 26) {
      const roomRight = t.half - o.d;
      const roomLeft = t.half + o.d;
      avoid += (roomRight > roomLeft ? 1 : -1) * 30 * (1 - ahead / 110);
    }
  }

  const look = 42 + speed * 0.3;
  const ti = Math.round(((((c.s + look) % t.length) + t.length) % t.length) / t.step) % t.n;
  let lineOff = t.line[ti] + c.lineBias * t.half * 0.3;
  // Aim for boost pads coming up.
  for (const b of t.boosts) {
    const ahead = wrapDist(b.s - c.s, t.length);
    if (ahead > -BOOST_LEN / 2 && ahead < 190) lineOff += (b.offset - lineOff) * Math.min(1, c.skill * 0.9);
  }
  const offset = Math.max(-t.half * 0.7, Math.min(t.half * 0.7, lineOff + avoid));
  const tp = pointAt(t, c.s + look, offset);
  // Steer back from far off-track toward the centerline instead of the line.
  const want = Math.atan2(tp.y - c.y, tp.x - c.x);
  const diff = angleWrap(want - c.a);
  const facing = fx * tp.tx + fy * tp.ty;
  let steer = Math.max(-1, Math.min(1, diff * 3.2));

  // Speed planning: scan ahead and respect braking distance.
  const brakeEff = BRAKE * 0.55;
  const horizon = 60 + (speed * speed) / (2 * brakeEff) + speed * 0.25;
  let target = (ACC / DRAG) * c.skill * cruise;
  for (let x = 0; x < horizon; x += 10) {
    const i = Math.round(((((c.s + x) % t.length) + t.length) % t.length) / t.step) % t.n;
    const k = Math.abs(t.curv[i]) * 0.78;
    if (k < 1e-4) continue;
    const v = cornerSpeed(1 / k) * (0.6 + c.skill * 0.3) * cruise;
    const allowed = Math.sqrt(v * v + 2 * brakeEff * x);
    if (allowed < target) target = allowed;
  }
  if (c.offTrack) target = Math.min(target, 160);
  let throttle = 0;
  let brake = 0;
  const fwd = c.vF;
  if (facing < -0.2 && speed < 60) {
    // Facing the wrong way: turn around at low speed.
    throttle = 0.7;
    steer = diff > 0 ? 1 : -1;
  } else if (fwd < target - 8) throttle = 1;
  else if (fwd > target + 22) brake = 1;
  else throttle = 0.35;
  const handbrake = !c.cpu ? false : Math.abs(diff) > 0.9 && speed > 170;
  return { throttle, brake, steer, handbrake };
}

function physics(race: Race, c: Car, inp: CarInput, dt: number, events: RaceEvent[]) {
  const t = race.track;
  const fx = Math.cos(c.a);
  const fy = Math.sin(c.a);
  const rx = -fy;
  const ry = fx;
  let vF = c.vx * fx + c.vy * fy;
  let vL = c.vx * rx + c.vy * ry;
  const off = c.offTrack;

  // Longitudinal.
  if (inp.throttle > 0) vF += ACC * inp.throttle * (off ? 0.6 : 1) * dt;
  if (c.boost > 0) {
    vF += BOOST_ACC * dt;
    c.boost -= dt;
  }
  c.braking = false;
  if (inp.brake > 0) {
    if (vF > 8) {
      vF = Math.max(0, vF - BRAKE * inp.brake * dt);
      c.braking = true;
    } else {
      vF = Math.max(-REV_MAX, vF - REV_ACC * inp.brake * dt);
    }
  }
  const drag = off ? DRAG_OFF : DRAG;
  vF -= vF * drag * dt;
  if (inp.throttle === 0 && inp.brake === 0) {
    const roll = Math.min(Math.abs(vF), 70 * dt);
    vF -= Math.sign(vF) * roll;
  }
  if (inp.handbrake) vF -= vF * 0.9 * dt;

  // Lateral grip.
  const grip = inp.handbrake ? GRIP_HB : off ? GRIP_OFF : GRIP;
  vL *= Math.exp(-grip * dt);

  // Steering scales with speed.
  const sp = Math.abs(vF);
  const sf = Math.min(1, sp / 80) / (1 + sp / 700);
  let turn = inp.steer * TURN * sf * Math.sign(vF || 1);
  if (inp.handbrake) turn *= 1.5;
  c.a = angleWrap(c.a + turn * dt);

  c.vx = fx * vF + rx * vL;
  c.vy = fy * vF + ry * vL;
  c.vF = vF;
  c.vL = vL;
  c.steer = inp.steer;
  c.handbrake = inp.handbrake;
  c.x += c.vx * dt;
  c.y += c.vy * dt;

  // Stay on the desk.
  const m = 14;
  if (c.x < m || c.x > W - m) {
    c.x = Math.max(m, Math.min(W - m, c.x));
    c.vx *= -0.3;
  }
  if (c.y < m || c.y > H - HUD_H - m) {
    c.y = Math.max(m, Math.min(H - HUD_H - m, c.y));
    c.vy *= -0.3;
  }

  // Track position.
  const p = project(t, c.x, c.y, c.hint);
  c.hint = p.i;
  c.s = p.s;
  c.d = p.d;
  c.offTrack = Math.abs(p.d) > t.half + 3 || p.dist > t.half + 3;

  // Boost pads.
  for (const b of t.boosts) {
    const along = wrapDist(c.s - b.s, t.length);
    if (Math.abs(along) < BOOST_LEN / 2 && Math.abs(c.d - b.offset) < BOOST_WID / 2 + 4) {
      if (c.boost <= 0) events.push({ type: "boost", car: c.id });
      if (c.boost < BOOST_TIME - 0.05) {
        c.boost = BOOST_TIME;
        const nf = Math.cos(c.a) * c.vx + Math.sin(c.a) * c.vy;
        if (nf < BOOST_KICK && nf > 0) {
          const add = BOOST_KICK - nf;
          c.vx += Math.cos(c.a) * add;
          c.vy += Math.sin(c.a) * add;
        }
      }
    }
  }
}

function checkpoints(race: Race, c: Car, events: RaceEvent[]) {
  const t = race.track;
  const seg = t.length / CHECKPOINTS;
  if (c.finished) return;
  const next = (c.cp + 1) % CHECKPOINTS;
  const rel = wrapDist(c.s - next * seg, t.length);
  if (rel >= 0 && rel < seg * 0.6 && Math.abs(c.d) < t.half + 70) {
    c.cp += 1;
    if (c.cp % CHECKPOINTS === 0) {
      const lap = c.cp / CHECKPOINTS;
      const lt = race.time - c.lapStart;
      c.lapStart = race.time;
      c.lapTimes.push(lt);
      const best = c.bestLap === null || lt < c.bestLap;
      if (best) c.bestLap = lt;
      if (lap >= LAPS) {
        c.finished = true;
        c.ghost = true;
        c.finishTime = race.time;
        race.finishOrder.push(c.id);
        c.finishPlace = race.finishOrder.length;
        events.push({ type: "finish", car: c.id, place: c.finishPlace, time: race.time });
        if (race.graceEnd === null) {
          race.graceEnd = race.time + FINISH_GRACE;
          race.phase = "finishing";
        }
      } else {
        events.push({ type: "lap", car: c.id, lap, time: lt, best });
        if (lap === LAPS - 1) events.push({ type: "finalLap", car: c.id });
      }
    }
  }
  updateProgress(race, c);
}

function collisions(race: Race, events: RaceEvent[]) {
  const cs = race.cars;
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i];
      const b = cs[j];
      if (a.ghost || b.ghost) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      const min = CAR_R * 2;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      const push = (min - d) / 2;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) {
        const jImp = (-(1 + 0.35) * rv) / 2;
        a.vx -= nx * jImp;
        a.vy -= ny * jImp;
        b.vx += nx * jImp;
        b.vy += ny * jImp;
        if (jImp > 35) events.push({ type: "bump", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, power: jImp });
      }
    }
  }
}

/** Advance the race by one fixed step. `inputs[i]` is used for human cars. */
export function stepRace(race: Race, inputs: (CarInput | null)[], dt: number): RaceEvent[] {
  const events: RaceEvent[] = [];
  if (race.phase === "over") return events;
  race.time += dt;
  for (const c of race.cars) {
    let inp: CarInput;
    if (c.finished) inp = cpuInput(race, c, dt, 0.55);
    else if (c.cpu) inp = cpuInput(race, c, dt);
    else inp = inputs[c.id] ?? NO_INPUT;
    physics(race, c, inp, dt, events);
  }
  collisions(race, events);
  for (const c of race.cars) checkpoints(race, c, events);
  race.leaderLap = Math.max(...race.cars.map((c) => lapOf(c)));
  const allDone = race.cars.every((c) => c.finished);
  if (allDone || (race.graceEnd !== null && race.time >= race.graceEnd)) {
    race.phase = "over";
    events.push({ type: "over" });
  }
  return events;
}

/** Final placements: finishers by order, the rest by progress. */
export function finalPlacements(race: Race): number[] {
  const order = standings(race);
  const out = new Array<number>(race.cars.length).fill(0);
  order.forEach((id, rank) => (out[id] = rank));
  return out;
}

/**
 * Mini Football — pure simulation (no DOM, no React).
 * `createMatch` builds the state, `step(state, inputs, dt)` advances it and
 * fills `state.events` with things the renderer may want to react to.
 */
import { rng } from "../../lib/random";

export const W = 1280;
export const H = 720;
export const FIELD = { left: 90, right: 1190, top: 120, bottom: 690 };
export const CX = (FIELD.left + FIELD.right) / 2;
export const CY = (FIELD.top + FIELD.bottom) / 2;
export const FIELD_W = FIELD.right - FIELD.left;
export const GOAL_HALF = 86;
export const GOAL_DEPTH = 44;
export const POST_R = 5;
export const PLAYER_R = 21;
export const KEEPER_R = 27;
export const BALL_R = 10;
export const PX_PER_M = FIELD_W / 40;
export const MATCH_TIME = 90;
export const GOALS_TO_WIN = 3;

const ACCEL = 1050;
const DRAG = 3.5; // terminal speed = ACCEL / DRAG ≈ 300 px/s
const KICK_POWER = 780;
const KICK_RANGE = PLAYER_R + BALL_R + 16;
const KICK_COOLDOWN = 0.42;
const BALL_FRICTION = 0.85;
const BALL_ROLL_DECEL = 26;
const GOAL_PAUSE = 1.7;
const KICKOFF_PAUSE = 0.9;
const SLOWMO_TIME = 0.75;
const SOLO_BOOST = 1.1;

export type Team = 0 | 1;
export type Role = "attack" | "defend" | "keeper";

export interface Input {
  x: number;
  y: number;
  action: boolean;
  actionPressed: boolean;
}

export interface PlayerSeat {
  index: number;
  cpu: boolean;
}

export interface Footballer {
  id: number;
  /** Index into `players`, or -1 for a helper bot. */
  playerIndex: number;
  team: Team;
  cpu: boolean;
  bot: boolean;
  role: Role;
  r: number;
  mass: number;
  speedMul: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  kickCd: number;
  /** 1 right after a kick, decays to 0 (render flash). */
  kickFlash: number;
  goals: number;
  shots: number;
  // AI scratch
  aiTimer: number;
  aiTx: number;
  aiTy: number;
  aiKick: boolean;
  aiAimY: number;
  aiStuck: number;
  aiSide: number;
  /** Direction a CPU wants to strike the ball. */
  aiKx: number;
  aiKy: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rolling angle for rendering. */
  spin: number;
  lastTouch: number;
  lastKick: { by: number; x: number; y: number } | null;
}

export type MatchEvent =
  | { type: "kick"; x: number; y: number; team: Team; by: number; shot: boolean }
  | { type: "whiff"; x: number; y: number; by: number }
  | { type: "wall"; x: number; y: number; speed: number }
  | { type: "post"; x: number; y: number }
  | { type: "touch"; x: number; y: number }
  | { type: "bump"; x: number; y: number; speed: number }
  | { type: "goal"; team: Team; x: number; y: number; scorer: number; own: boolean; distM: number }
  | { type: "kickoff" }
  | { type: "golden" }
  | { type: "end"; winner: Team };

export type Phase = "kickoff" | "play" | "goal" | "over";

export interface MatchState {
  rand: ReturnType<typeof rng>;
  fs: Footballer[];
  ball: Ball;
  score: [number, number];
  remaining: number;
  elapsed: number;
  phase: Phase;
  phaseT: number;
  golden: boolean;
  /** Seconds spent in golden goal; capped so a stalemate can't stall Party Mode. */
  goldenT: number;
  winner: Team | null;
  endAfterGoal: boolean;
  possession: [number, number];
  shots: [number, number];
  longestGoal: { m: number; by: number } | null;
  lastGoal: { team: Team; scorer: number; own: boolean; distM: number } | null;
  kickoffTeam: Team;
  events: MatchEvent[];
}

export const teamOf = (playerIndex: number): Team => (playerIndex % 2 === 0 ? 0 : 1);
/** x of the goal line a team defends. */
export const ownGoalX = (t: Team) => (t === 0 ? FIELD.left : FIELD.right);
export const oppGoalX = (t: Team) => (t === 0 ? FIELD.right : FIELD.left);

function makeFootballer(id: number, playerIndex: number, team: Team, cpu: boolean, bot: boolean, role: Role): Footballer {
  const keeper = role === "keeper";
  return {
    id,
    playerIndex,
    team,
    cpu,
    bot,
    role,
    r: keeper ? KEEPER_R : PLAYER_R,
    mass: keeper ? 1.35 : 1,
    speedMul: bot ? (keeper ? 1 : 0.94) : cpu ? 0.95 : 1,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    fx: team === 0 ? 1 : -1,
    fy: 0,
    kickCd: 0,
    kickFlash: 0,
    goals: 0,
    shots: 0,
    aiTimer: 0,
    aiTx: 0,
    aiTy: 0,
    aiKick: false,
    aiAimY: CY,
    aiStuck: 0,
    aiSide: 1,
    aiKx: team === 0 ? 1 : -1,
    aiKy: 0,
  };
}

export function createMatch(seats: PlayerSeat[], seed: number): MatchState {
  const fs: Footballer[] = [];
  const members: [number, number] = [0, 0];
  for (const s of seats) {
    const team = teamOf(s.index);
    const role: Role = members[team] === 0 ? "attack" : "defend";
    members[team]++;
    fs.push(makeFootballer(fs.length, s.index, team, s.cpu, false, role));
  }
  // Balance sides with helper bots: an outfield bot for an empty side,
  // a goalkeeper bot for a short-handed side (3-player games).
  for (const t of [0, 1] as Team[]) {
    const other = (1 - t) as Team;
    if (members[t] === 0) {
      fs.push(makeFootballer(fs.length, -1, t, true, true, "attack"));
      members[t]++;
    }
    if (members[t] < members[other]) {
      fs.push(makeFootballer(fs.length, -1, t, true, true, "keeper"));
      // the short-handed side's outfielder gets a little extra pace
      for (const f of fs) if (f.team === t && f.role !== "keeper") f.speedMul *= SOLO_BOOST;
      members[t]++;
    }
  }
  const r = rng(seed);
  const s: MatchState = {
    rand: r,
    fs,
    ball: { x: CX, y: CY, vx: 0, vy: 0, spin: 0, lastTouch: -1, lastKick: null },
    score: [0, 0],
    remaining: MATCH_TIME,
    elapsed: 0,
    phase: "kickoff",
    phaseT: 0,
    golden: false,
    goldenT: 0,
    winner: null,
    endAfterGoal: false,
    possession: [0, 0],
    shots: [0, 0],
    longestGoal: null,
    lastGoal: null,
    kickoffTeam: r.next() < 0.5 ? 0 : 1,
    events: [],
  };
  resetPositions(s);
  return s;
}

function resetPositions(s: MatchState) {
  const b = s.ball;
  b.x = CX;
  b.y = CY;
  b.vx = b.vy = b.spin = 0;
  b.lastTouch = -1;
  b.lastKick = null;
  for (const t of [0, 1] as Team[]) {
    const team = s.fs.filter((f) => f.team === t);
    const outfield = team.filter((f) => f.role !== "keeper");
    const dir = t === 0 ? -1 : 1; // direction toward own goal from centre
    outfield.forEach((f, i) => {
      let dx: number;
      let y: number;
      if (outfield.length === 1) {
        dx = t === s.kickoffTeam ? 70 : 190;
        y = CY;
      } else {
        const attacker = i === 0;
        dx = attacker ? (t === s.kickoffTeam ? 70 : 170) : 360;
        y = attacker ? CY - 30 : CY + 70;
        f.role = attacker ? "attack" : "defend";
      }
      f.x = CX + dir * dx;
      f.y = y;
    });
    for (const k of team.filter((f) => f.role === "keeper")) {
      k.x = ownGoalX(t) - dir * 40;
      k.y = CY;
    }
    for (const f of team) {
      f.vx = f.vy = 0;
      f.fx = -dir;
      f.fy = 0;
      f.kickCd = 0;
      f.aiTimer = 0;
      f.aiStuck = 0;
    }
  }
  s.phase = "kickoff";
  s.phaseT = 0;
}

const len = (x: number, y: number) => Math.hypot(x, y);

// ---------------------------------------------------------------- AI

function teammates(s: MatchState, f: Footballer) {
  return s.fs.filter((o) => o.team === f.team && o !== f);
}

/** Decide roles for a team with two outfield players: closer one attacks. */
function assignRoles(s: MatchState) {
  const b = s.ball;
  for (const t of [0, 1] as Team[]) {
    const out = s.fs.filter((f) => f.team === t && f.role !== "keeper");
    if (out.length < 2) {
      out.forEach((f) => (f.role = "attack"));
      continue;
    }
    const score = (f: Footballer) => {
      // distance to ball, preferring the player already goal-side-ish attacking
      let d = len(b.x - f.x, b.y - f.y);
      if (f.role === "attack") d -= 45;
      // a player further toward own goal is a natural defender
      d += (t === 0 ? b.x - f.x : f.x - b.x) < -40 ? 0 : 20;
      return d;
    };
    const [a, c] = out;
    if (score(a) <= score(c)) {
      a.role = "attack";
      c.role = "defend";
    } else {
      a.role = "defend";
      c.role = "attack";
    }
  }
}

function inField(x: number, y: number, m: number) {
  return x > FIELD.left + m && x < FIELD.right - m && y > FIELD.top + m && y < FIELD.bottom - m;
}

/** Target + kick intent for "get behind the ball and drive it toward (gx, gy)". */
function attackPlan(s: MatchState, f: Footballer, gx: number, gy: number, eager: boolean) {
  const b = s.ball;
  const px = b.x + b.vx * 0.22;
  const py = b.y + b.vy * 0.22;
  let ax = gx - px;
  let ay = gy - py;
  let al = len(ax, ay) || 1;
  ax /= al;
  ay /= al;
  const back = f.r + BALL_R + 4;
  // If getting behind the ball is impossible (ball against a wall), play it toward the middle instead.
  if (!inField(px - ax * back, py - ay * back, f.r * 0.6)) {
    ax = CX + (gx > CX ? 120 : -120) - px;
    ay = CY - py;
    al = len(ax, ay) || 1;
    ax /= al;
    ay /= al;
  }
  f.aiKx = ax;
  f.aiKy = ay;
  const rx = f.x - px;
  const ry = f.y - py;
  const along = rx * ax + ry * ay; // <0 means we are behind the ball
  const dist = len(rx, ry);
  if (along > -f.r * 0.6) {
    // circle around the ball on the side we're on
    const cross = rx * ay - ry * ax;
    if (Math.abs(cross) > 8) f.aiSide = cross > 0 ? 1 : -1;
    const off = back + 34;
    f.aiTx = px - ax * off + ay * f.aiSide * off;
    f.aiTy = py - ay * off - ax * f.aiSide * off;
    if (!inField(f.aiTx, f.aiTy, f.r)) {
      f.aiSide = -f.aiSide;
      f.aiTx = px - ax * off + ay * f.aiSide * off;
      f.aiTy = py - ay * off - ax * f.aiSide * off;
    }
    // scrappy: pinned on the ball for a while → hoof it toward open space
    f.aiKick = dist < KICK_RANGE && (f.aiStuck > 0.9 || (eager && -along / (dist || 1) > 0.3));
    if (f.aiKick && f.aiStuck > 0.9) unstickAim(f, px, py);
    return;
  }
  // Behind the ball: drive through it.
  f.aiTx = px + ax * 30;
  f.aiTy = py + ay * 30;
  const cos = -along / (dist || 1);
  const goalDist = len(gx - b.x, gy - b.y);
  const aligned = cos > (eager ? 0.8 : 0.88);
  const opponentNear = s.fs.some((o) => o.team !== f.team && len(o.x - b.x, o.y - b.y) < 90);
  f.aiKick =
    dist < KICK_RANGE &&
    (aligned || f.aiStuck > 1.1) &&
    (eager || goalDist < 600 || opponentNear || s.rand.next() < 0.06);
  if (f.aiKick && !aligned) unstickAim(f, px, py);
}

function unstickAim(f: Footballer, px: number, py: number) {
  const tx = CX + (f.team === 0 ? 150 : -150) - px;
  const ty = CY - py;
  const l = len(tx, ty) || 1;
  f.aiKx = tx / l;
  f.aiKy = ty / l;
}

function aiThink(s: MatchState, f: Footballer) {
  const b = s.ball;
  const t = f.team;
  const myGoalX = ownGoalX(t);
  const toward = t === 0 ? 1 : -1; // attacking direction
  const gx = oppGoalX(t);
  const near = len(b.x - f.x, b.y - f.y);
  if (near < KICK_RANGE + 6) f.aiStuck += 0.14;
  else f.aiStuck = Math.max(0, f.aiStuck - 0.3);

  if (f.role === "keeper") {
    const ballDistGoal = len(b.x - myGoalX, b.y - CY);
    const inFront = (b.x - myGoalX) * toward > -4;
    if (ballDistGoal < 200 && inFront) {
      attackPlan(s, f, gx, CY, true);
    } else {
      // track the ball's line across the mouth
      const ty = CY + (b.y + b.vy * 0.25 - CY) * 0.55;
      f.aiTx = myGoalX + toward * (34 + Math.min(40, ballDistGoal * 0.05));
      f.aiTy = Math.max(CY - GOAL_HALF + 12, Math.min(CY + GOAL_HALF - 12, ty));
      f.aiKick = false;
    }
    // never wander far from goal
    const maxX = 210;
    if ((f.aiTx - myGoalX) * toward > maxX) f.aiTx = myGoalX + toward * maxX;
    return;
  }

  if (f.role === "defend") {
    const opps = s.fs.filter((o) => o.team !== t);
    const oppNearest = Math.min(...opps.map((o) => len(o.x - b.x, o.y - b.y)));
    const ballInOwnHalf = (b.x - CX) * toward < 0;
    // step up if our attacker isn't actually playing the ball (e.g. a human who wandered off)
    const mateNear = Math.min(
      Number.POSITIVE_INFINITY,
      ...teammates(s, f)
        .filter((o) => o.role !== "keeper")
        .map((o) => len(o.x - b.x, o.y - b.y)),
    );
    const looseBall = len(b.vx, b.vy) < 140 && mateNear > 190;
    if (near < 120 || looseBall || (ballInOwnHalf && near < oppNearest - 20)) {
      attackPlan(s, f, gx, CY, ballInOwnHalf);
      return;
    }
    // sit between ball and own goal
    const k = ballInOwnHalf ? 0.45 : 0.3;
    f.aiTx = myGoalX + (b.x - myGoalX) * k;
    f.aiTy = CY + (b.y - CY) * 0.7;
    const limit = CX - toward * 40;
    if ((f.aiTx - limit) * toward > 0) f.aiTx = limit;
    f.aiKick = false;
    return;
  }

  // attacker; pick a fresh target corner of the goal now and then
  if (s.rand.next() < 0.05) f.aiAimY = CY + (s.rand.next() * 2 - 1) * GOAL_HALF * 0.55;
  // if a teammate (human or CPU) already has the ball, offer support instead of crowding
  const mate = teammates(s, f).find((o) => o.role !== "keeper" && len(b.x - o.x, b.y - o.y) < near - 30 && len(b.x - o.x, b.y - o.y) < 70);
  if (mate) {
    f.aiTx = b.x + toward * 170;
    f.aiTy = b.y < CY ? b.y + 150 : b.y - 150;
    f.aiTx = Math.max(FIELD.left + 60, Math.min(FIELD.right - 60, f.aiTx));
    f.aiKick = false;
    return;
  }
  attackPlan(s, f, gx, f.aiAimY, false);
}

function aiSteer(f: Footballer): { x: number; y: number } {
  const dx = f.aiTx - f.x;
  const dy = f.aiTy - f.y;
  const d = len(dx, dy);
  const vmax = (ACCEL / DRAG) * f.speedMul;
  const mag = d > 50 ? 1 : d / 50;
  const dvx = (dx / (d || 1)) * vmax * mag - f.vx;
  const dvy = (dy / (d || 1)) * vmax * mag - f.vy;
  const l = len(dvx, dvy);
  const k = Math.min(1, l / (vmax * 0.35));
  return l > 1 ? { x: (dvx / l) * k, y: (dvy / l) * k } : { x: 0, y: 0 };
}

// ---------------------------------------------------------------- physics

function kick(s: MatchState, f: Footballer, noise: number) {
  f.kickCd = KICK_COOLDOWN;
  f.kickFlash = 1;
  const b = s.ball;
  const dx = b.x - f.x;
  const dy = b.y - f.y;
  const d = len(dx, dy);
  if (d > KICK_RANGE + f.r - PLAYER_R) {
    s.events.push({ type: "whiff", x: f.x + f.fx * f.r, y: f.y + f.fy * f.r, by: f.id });
    return;
  }
  let kx = f.fx * 0.72 + (dx / (d || 1)) * 0.28;
  let ky = f.fy * 0.72 + (dy / (d || 1)) * 0.28;
  if (noise) {
    const a = Math.atan2(ky, kx) + noise;
    kx = Math.cos(a);
    ky = Math.sin(a);
  }
  const kl = len(kx, ky) || 1;
  kx /= kl;
  ky /= kl;
  b.vx = kx * KICK_POWER + f.vx * 0.3;
  b.vy = ky * KICK_POWER + f.vy * 0.3;
  // make sure the ball leaves the foot
  const need = f.r + BALL_R + 1;
  if (d < need) {
    b.x = f.x + (dx / (d || 1)) * need;
    b.y = f.y + (dy / (d || 1)) * need;
  }
  b.lastTouch = f.id;
  b.lastKick = { by: f.id, x: b.x, y: b.y };
  // a shot = kicked toward the opposition goal and on target-ish
  const gx = oppGoalX(f.team);
  let shot = false;
  if ((gx - b.x) * kx > 0) {
    const tHit = (gx - b.x) / kx;
    const yAt = b.y + ky * tHit;
    if (Math.abs(yAt - CY) < GOAL_HALF + 40 && Math.abs(gx - b.x) < FIELD_W * 0.75) shot = true;
  }
  if (shot) {
    f.shots++;
    s.shots[f.team]++;
  }
  s.events.push({ type: "kick", x: b.x, y: b.y, team: f.team, by: f.id, shot });
}

function moveFootballer(f: Footballer, ix: number, iy: number, dt: number) {
  let l = len(ix, iy);
  if (l > 1) {
    ix /= l;
    iy /= l;
    l = 1;
  }
  const a = ACCEL * f.speedMul;
  f.vx += ix * a * dt;
  f.vy += iy * a * dt;
  const drag = Math.exp(-(l > 0.05 ? DRAG : DRAG * 1.6) * dt);
  f.vx *= drag;
  f.vy *= drag;
  const vmax = (ACCEL / DRAG) * 1.6;
  const sp = len(f.vx, f.vy);
  if (sp > vmax) {
    f.vx *= vmax / sp;
    f.vy *= vmax / sp;
  }
  if (l > 0.15) {
    const k = Math.min(1, dt * 14);
    f.fx += (ix / l - f.fx) * k;
    f.fy += (iy / l - f.fy) * k;
    const fl = len(f.fx, f.fy) || 1;
    f.fx /= fl;
    f.fy /= fl;
  }
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  const m = f.r - 6;
  if (f.x < FIELD.left + m) {
    f.x = FIELD.left + m;
    f.vx = Math.max(0, f.vx);
  }
  if (f.x > FIELD.right - m) {
    f.x = FIELD.right - m;
    f.vx = Math.min(0, f.vx);
  }
  if (f.y < FIELD.top + m) {
    f.y = FIELD.top + m;
    f.vy = Math.max(0, f.vy);
  }
  if (f.y > FIELD.bottom - m) {
    f.y = FIELD.bottom - m;
    f.vy = Math.min(0, f.vy);
  }
}

const POSTS = [
  [FIELD.left, CY - GOAL_HALF],
  [FIELD.left, CY + GOAL_HALF],
  [FIELD.right, CY - GOAL_HALF],
  [FIELD.right, CY + GOAL_HALF],
] as const;

function moveBall(s: MatchState, dt: number) {
  const b = s.ball;
  const sp0 = len(b.vx, b.vy);
  if (sp0 > 0) {
    const sp = Math.max(0, sp0 * Math.exp(-BALL_FRICTION * dt) - BALL_ROLL_DECEL * dt);
    b.vx *= sp / sp0;
    b.vy *= sp / sp0;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.spin += (len(b.vx, b.vy) * dt) / BALL_R;
  ballBounds(s, true);
}

function ballBounds(s: MatchState, emit: boolean) {
  const b = s.ball;
  const inMouth = Math.abs(b.y - CY) < GOAL_HALF;
  const behindLeft = b.x < FIELD.left;
  const behindRight = b.x > FIELD.right;
  if (behindLeft || behindRight) {
    // inside the goal net
    const backX = behindLeft ? FIELD.left - GOAL_DEPTH + BALL_R : FIELD.right + GOAL_DEPTH - BALL_R;
    if (behindLeft ? b.x < backX : b.x > backX) {
      b.x = backX;
      b.vx = -b.vx * 0.25;
      b.vy *= 0.6;
    }
    const lim = GOAL_HALF - BALL_R;
    if (Math.abs(b.y - CY) > lim) {
      b.y = CY + Math.sign(b.y - CY) * lim;
      b.vy = -b.vy * 0.3;
    }
  } else {
    if (b.y - BALL_R < FIELD.top) {
      b.y = FIELD.top + BALL_R;
      wall(s, Math.abs(b.vy), emit);
      b.vy = Math.abs(b.vy) * 0.78;
    } else if (b.y + BALL_R > FIELD.bottom) {
      b.y = FIELD.bottom - BALL_R;
      wall(s, Math.abs(b.vy), emit);
      b.vy = -Math.abs(b.vy) * 0.78;
    }
    if (!inMouth) {
      if (b.x - BALL_R < FIELD.left) {
        b.x = FIELD.left + BALL_R;
        wall(s, Math.abs(b.vx), emit);
        b.vx = Math.abs(b.vx) * 0.78;
      } else if (b.x + BALL_R > FIELD.right) {
        b.x = FIELD.right - BALL_R;
        wall(s, Math.abs(b.vx), emit);
        b.vx = -Math.abs(b.vx) * 0.78;
      }
    }
  }
  for (const [px, py] of POSTS) {
    const dx = b.x - px;
    const dy = b.y - py;
    const d = len(dx, dy);
    const min = BALL_R + POST_R;
    if (d < min && d > 0) {
      const nx = dx / d;
      const ny = dy / d;
      b.x = px + nx * min;
      b.y = py + ny * min;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= 1.75 * vn * nx;
        b.vy -= 1.75 * vn * ny;
        if (emit && -vn > 80) s.events.push({ type: "post", x: px, y: py });
      }
    }
  }
}

function wall(s: MatchState, speed: number, emit = true) {
  if (emit && speed > 120) s.events.push({ type: "wall", x: s.ball.x, y: s.ball.y, speed });
}

function collide(s: MatchState) {
  const b = s.ball;
  // footballer vs ball (dribble)
  for (const f of s.fs) {
    const dx = b.x - f.x;
    const dy = b.y - f.y;
    const d = len(dx, dy);
    const min = f.r + BALL_R;
    if (d < min && d > 0.0001) {
      const nx = dx / d;
      const ny = dy / d;
      b.x = f.x + nx * min;
      b.y = f.y + ny * min;
      const vrel = (b.vx - f.vx) * nx + (b.vy - f.vy) * ny;
      if (vrel < 0) {
        b.vx -= (1 + 0.3) * vrel * nx;
        b.vy -= (1 + 0.3) * vrel * ny;
        f.vx += vrel * 0.06 * nx;
        f.vy += vrel * 0.06 * ny;
        if (-vrel > 160) s.events.push({ type: "touch", x: b.x, y: b.y });
      }
      b.lastTouch = f.id;
    }
  }
  // footballer vs footballer
  for (let i = 0; i < s.fs.length; i++) {
    for (let j = i + 1; j < s.fs.length; j++) {
      const a = s.fs[i];
      const c = s.fs[j];
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const d = len(dx, dy);
      const min = a.r + c.r;
      if (d < min && d > 0.0001) {
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
        if (vrel < 0) {
          const jImp = (-(1 + 0.55) * vrel) / (ia + ic);
          a.vx -= jImp * ia * nx;
          a.vy -= jImp * ia * ny;
          c.vx += jImp * ic * nx;
          c.vy += jImp * ic * ny;
          if (-vrel > 140) s.events.push({ type: "bump", x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, speed: -vrel });
        }
      }
    }
  }
}

function checkGoal(s: MatchState) {
  const b = s.ball;
  let team: Team | null = null;
  if (b.x < FIELD.left - BALL_R) team = 1;
  else if (b.x > FIELD.right + BALL_R) team = 0;
  if (team === null) return;
  s.score[team]++;
  const scorerF = s.fs[b.lastTouch];
  const own = !!scorerF && scorerF.team !== team;
  let distM = 0;
  if (scorerF && !own) {
    scorerF.goals++;
    if (b.lastKick && b.lastKick.by === scorerF.id) {
      distM = len(oppGoalX(team) - b.lastKick.x, CY - b.lastKick.y) / PX_PER_M;
      if (!s.longestGoal || distM > s.longestGoal.m) s.longestGoal = { m: distM, by: scorerF.id };
    }
  }
  s.lastGoal = { team, scorer: scorerF ? scorerF.id : -1, own, distM };
  s.events.push({ type: "goal", team, x: b.x, y: b.y, scorer: scorerF ? scorerF.id : -1, own, distM });
  s.phase = "goal";
  s.phaseT = 0;
  s.kickoffTeam = (1 - team) as Team;
  if (s.golden || s.score[team] >= GOALS_TO_WIN) {
    s.endAfterGoal = true;
    s.winner = team;
  }
}

const GOLDEN_GOAL_CAP = 60;

/**
 * Advance the match. `inputs[playerIndex]` holds each human's input
 * (CPU seats are ignored and driven by the AI).
 */
export function step(s: MatchState, inputs: (Input | null)[], rawDt: number) {
  s.events.length = 0;
  if (s.phase === "over") return;
  const slow = s.phase === "goal" && s.phaseT < SLOWMO_TIME;
  const dt = slow ? rawDt * 0.3 : rawDt;
  s.phaseT += rawDt;

  if (s.phase === "kickoff") {
    if (s.phaseT >= KICKOFF_PAUSE) {
      s.phase = "play";
      s.phaseT = 0;
      s.events.push({ type: "kickoff" });
    }
    for (const f of s.fs) f.kickFlash = Math.max(0, f.kickFlash - rawDt * 3);
    return;
  }

  if (s.phase === "goal" && s.phaseT >= GOAL_PAUSE) {
    if (s.endAfterGoal && s.winner !== null) {
      s.phase = "over";
      s.events.push({ type: "end", winner: s.winner });
      return;
    }
    resetPositions(s);
    return;
  }

  if (s.phase === "play") {
    s.elapsed += dt;
    if (s.golden) {
      s.goldenT += dt;
      if (s.goldenT >= GOLDEN_GOAL_CAP) {
        // Still level after a minute of sudden death: the team with more possession takes it.
        s.winner = s.possession[0] >= s.possession[1] ? 0 : 1;
        s.phase = "over";
        s.events.push({ type: "end", winner: s.winner });
        return;
      }
    } else {
      s.remaining = Math.max(0, s.remaining - dt);
      if (s.remaining <= 0) {
        if (s.score[0] === s.score[1]) {
          s.golden = true;
          s.events.push({ type: "golden" });
        } else {
          s.winner = s.score[0] > s.score[1] ? 0 : 1;
          s.phase = "over";
          s.events.push({ type: "end", winner: s.winner });
          return;
        }
      }
    }
    const lt = s.fs[s.ball.lastTouch];
    if (lt) s.possession[lt.team] += dt;
    assignRoles(s);
  }

  const playing = s.phase === "play";
  for (const f of s.fs) {
    f.kickCd = Math.max(0, f.kickCd - dt);
    f.kickFlash = Math.max(0, f.kickFlash - dt * 3);
    let ix = 0;
    let iy = 0;
    let wantKick = false;
    if (f.cpu) {
      if (playing) {
        f.aiTimer -= dt;
        if (f.aiTimer <= 0) {
          f.aiTimer = 0.11 + s.rand.next() * 0.08;
          aiThink(s, f);
        }
        const st = aiSteer(f);
        ix = st.x;
        iy = st.y;
        if (f.aiKick && f.kickCd <= 0) {
          // CPUs turn to where they're aiming when they strike
          f.fx = f.aiKx;
          f.fy = f.aiKy;
          wantKick = true;
          f.aiKick = false;
          f.aiStuck = 0;
        }
      }
    } else {
      const inp = inputs[f.playerIndex];
      if (inp) {
        ix = inp.x;
        iy = inp.y;
        wantKick = inp.actionPressed;
      }
    }
    moveFootballer(f, ix, iy, dt);
    if (wantKick && f.kickCd <= 0 && playing) kick(s, f, f.cpu ? (s.rand.next() * 2 - 1) * 0.11 : 0);
  }
  moveBall(s, dt);
  collide(s);
  ballBounds(s, false);
  if (playing) checkGoal(s);
}

// ---------------------------------------------------------------- results

export interface ResultSummary {
  winner: Team;
  placements: number[];
  teamNames: [string, string];
}

export function teamLabel(fs: Footballer[], t: Team, names: string[]): string {
  const humans = fs.filter((f) => f.team === t && f.playerIndex >= 0).map((f) => names[f.playerIndex]);
  return humans.join(" & ") || "Bot";
}

export function placementsFor(s: MatchState, playerCount: number): number[] {
  const w = s.winner ?? 0;
  return Array.from({ length: playerCount }, (_, i) => (teamOf(i) === w ? 0 : 1));
}

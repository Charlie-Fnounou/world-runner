/**
 * Falling-sand cellular automaton. Pure logic on typed arrays — no DOM.
 *
 * Each cell stores an element id (`type`), a small per-cell counter (`life`,
 * used for lifetimes of fire/steam/smoke/embers) and a random `shade` used
 * only for colour texture. `stamp` prevents a particle from being processed
 * twice in one step after it moves.
 */
import {
  ACID,
  ASH,
  DENSITY,
  EMBER,
  EMPTY,
  ERASER,
  FIRE,
  GLASS,
  ICE,
  KIND,
  KIND_GAS,
  KIND_LIQUID,
  KIND_POWDER,
  KIND_STATIC,
  LAVA,
  OBSIDIAN,
  OIL,
  PLANT,
  R_COLDFRONT,
  R_CORROSION,
  R_DOUSE,
  R_FROSTBITE,
  R_GLASS,
  R_KINDLING,
  R_OBSIDIAN,
  R_OILFIRE,
  R_OVERGROWTH,
  R_RAIN,
  R_THAW,
  R_WILDFIRE,
  SAND,
  SMOKE,
  STEAM,
  STONE,
  WATER,
  WOOD,
  paintDensity,
} from "./elements";

/** Things acid can eat. */
const DISSOLVES = new Uint8Array(32);
[SAND, STONE, WOOD, PLANT, ICE, OBSIDIAN, GLASS, ASH, EMBER].forEach((e) => (DISSOLVES[e] = 1));

export interface SimEvents {
  /** Water/lava/ice meeting heat this step. */
  sizzle: number;
  /** New things catching fire. */
  ignite: number;
  /** Acid eating something. */
  fizz: number;
}

export class Sim {
  readonly w: number;
  readonly h: number;
  readonly type: Uint8Array;
  readonly life: Uint8Array;
  readonly shade: Uint8Array;
  private stamp: Uint8Array;
  private tick = 1;
  private seed: number;
  /** Bitmask of discovered reactions. */
  found = 0;
  /** Running count of burning cells (fire + embers), refreshed each step. */
  burning = 0;
  events: SimEvents = { sizzle: 0, ignite: 0, fizz: 0 };

  constructor(w: number, h: number, seed = 0x9e3779b9) {
    this.w = w;
    this.h = h;
    const n = w * h;
    this.type = new Uint8Array(n);
    this.life = new Uint8Array(n);
    this.shade = new Uint8Array(n);
    this.stamp = new Uint8Array(n);
    this.seed = seed >>> 0 || 1;
    for (let i = 0; i < n; i++) this.shade[i] = this.rnd() & 255;
  }

  /** xorshift32 → [0, 2^32) */
  private rnd(): number {
    let x = this.seed;
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    this.seed = x;
    return x;
  }
  /** Uniform [0,1). */
  rand(): number {
    return this.rnd() / 4294967296;
  }

  clear() {
    this.type.fill(EMPTY);
    this.life.fill(0);
  }

  /** Set a cell with the default initial state for its element. Returns true if changed. */
  set(x: number, y: number, el: number): boolean {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    const i = y * this.w + x;
    if (el === ERASER) {
      if (this.type[i] === EMPTY) return false;
      this.type[i] = EMPTY;
      this.life[i] = 0;
      return true;
    }
    this.type[i] = el;
    this.life[i] = this.initialLife(el);
    this.shade[i] = this.rnd() & 255;
    return true;
  }

  private initialLife(el: number): number {
    switch (el) {
      case FIRE:
        return 30 + (this.rnd() % 40);
      case STEAM:
        return 140 + (this.rnd() % 110);
      case SMOKE:
        return 50 + (this.rnd() % 70);
      case EMBER:
        return 120 + (this.rnd() % 120);
      default:
        return 0;
    }
  }

  /**
   * Paint a filled circle. Only fills empty cells (except the eraser).
   * Returns the number of cells changed.
   */
  paintCircle(cx: number, cy: number, r: number, el: number): number {
    const density = el === ERASER ? 1 : paintDensity(el);
    const r2 = r * r + r * 0.8;
    let changed = 0;
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > r2) continue;
        const i = y * this.w + x;
        if (el === ERASER) {
          if (this.type[i] !== EMPTY) {
            this.type[i] = EMPTY;
            this.life[i] = 0;
            changed++;
          }
          continue;
        }
        if (this.type[i] !== EMPTY) {
          // The fire brush sets flammables alight (through the normal reaction rules).
          if (el === FIRE && this.ignite(i, 0.5)) changed++;
          continue;
        }
        if (density < 1 && this.rand() > density) continue;
        this.set(x, y, el);
        changed++;
      }
    }
    return changed;
  }

  /** Paint along a line between two points (inclusive). */
  paintLine(x0: number, y0: number, x1: number, y1: number, r: number, el: number): number {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const stepLen = Math.max(1, r * 0.5);
    const steps = Math.max(1, Math.ceil(dist / stepLen));
    let changed = 0;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      changed += this.paintCircle(Math.round(x0 + dx * t), Math.round(y0 + dy * t), r, el);
    }
    return changed;
  }

  /** Fill an axis-aligned rect (used by scene presets). */
  fillRect(x0: number, y0: number, x1: number, y1: number, el: number, chance = 1) {
    for (let y = Math.max(0, Math.round(y0)); y <= Math.min(this.h - 1, Math.round(y1)); y++) {
      for (let x = Math.max(0, Math.round(x0)); x <= Math.min(this.w - 1, Math.round(x1)); x++) {
        if (chance < 1 && this.rand() > chance) continue;
        this.set(x, y, el);
      }
    }
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return STONE;
    return this.type[y * this.w + x];
  }

  private discover(bit: number) {
    this.found |= 1 << bit;
  }

  private swap(i: number, j: number) {
    const t = this.type;
    const l = this.life;
    const s = this.shade;
    const tt = t[i];
    t[i] = t[j];
    t[j] = tt;
    const ll = l[i];
    l[i] = l[j];
    l[j] = ll;
    const ss = s[i];
    s[i] = s[j];
    s[j] = ss;
    this.stamp[i] = this.tick;
    this.stamp[j] = this.tick;
  }

  private become(i: number, el: number) {
    this.type[i] = el;
    this.life[i] = this.initialLife(el);
    this.stamp[i] = this.tick;
  }

  /** Can an element of density `d` move (downwards / sideways) into cell j? */
  private canSink(j: number, d: number): boolean {
    const t = this.type[j];
    if (t === EMPTY) return true;
    const k = KIND[t];
    return (k === KIND_LIQUID || k === KIND_GAS) && DENSITY[t] < d;
  }

  step() {
    this.tick = this.tick >= 255 ? 1 : this.tick + 1;
    this.events.sizzle = 0;
    this.events.ignite = 0;
    this.events.fizz = 0;
    this.burning = 0;
    const { w, h, type, stamp } = this;
    for (let y = h - 1; y >= 0; y--) {
      const ltr = ((this.tick + y) & 1) === 0;
      for (let k = 0; k < w; k++) {
        const x = ltr ? k : w - 1 - k;
        const i = y * w + x;
        const t = type[i];
        if (t === EMPTY || stamp[i] === this.tick) continue;
        switch (t) {
          case SAND:
          case ASH:
            this.powder(i, x, y, t);
            break;
          case WATER:
            this.liquid(i, x, y, t, 5);
            break;
          case OIL:
            this.liquid(i, x, y, t, 3);
            break;
          case ACID:
            if (this.acid(i, x, y)) break;
            this.liquid(i, x, y, t, 3);
            break;
          case LAVA:
            if (this.lava(i, x, y)) break;
            if (this.rand() < 0.28) this.liquid(i, x, y, t, 1);
            break;
          case FIRE:
            this.burning++;
            this.fire(i, x, y);
            break;
          case EMBER:
            this.burning++;
            this.ember(i, x, y);
            break;
          case STEAM:
            this.steam(i, x, y);
            break;
          case SMOKE:
            this.smoke(i, x, y);
            break;
          case PLANT:
            this.plant(i, x, y);
            break;
          case ICE:
            this.ice(i, x, y);
            break;
          default:
            break;
        }
      }
    }
  }

  // ── movement ────────────────────────────────────────────────────────────

  private powder(i: number, x: number, y: number, t: number) {
    if (y >= this.h - 1) return;
    const w = this.w;
    const d = DENSITY[t];
    const below = i + w;
    if (this.canSink(below, d)) {
      // Sinking through liquid is slower than falling through air.
      if (this.type[below] === EMPTY || this.rand() < 0.45) this.swap(i, below);
      return;
    }
    const dir = this.rand() < 0.5 ? -1 : 1;
    const xa = x + dir;
    const xb = x - dir;
    if (xa >= 0 && xa < w && this.canSink(below + dir, d) && this.type[i + dir] !== STONE) {
      this.swap(i, below + dir);
    } else if (xb >= 0 && xb < w && this.canSink(below - dir, d) && this.type[i - dir] !== STONE) {
      this.swap(i, below - dir);
    }
  }

  private liquid(i: number, x: number, y: number, t: number, disp: number) {
    const w = this.w;
    const d = DENSITY[t];
    if (y < this.h - 1) {
      const below = i + w;
      if (this.canSink(below, d)) {
        this.swap(i, below);
        return;
      }
      const dir = this.rand() < 0.5 ? -1 : 1;
      if (x + dir >= 0 && x + dir < w && this.canSink(below + dir, d)) {
        this.swap(i, below + dir);
        return;
      }
      if (x - dir >= 0 && x - dir < w && this.canSink(below - dir, d)) {
        this.swap(i, below - dir);
        return;
      }
    }
    // Sideways flow: slide up to `disp` cells through empty/lighter cells.
    const dir = this.rand() < 0.5 ? -1 : 1;
    if (!this.flow(i, x, dir, d, disp)) this.flow(i, x, -dir, d, disp);
  }

  private flow(i: number, x: number, dir: number, d: number, disp: number): boolean {
    let target = -1;
    for (let s = 1; s <= disp; s++) {
      const nx = x + dir * s;
      if (nx < 0 || nx >= this.w) break;
      const j = i + dir * s;
      if (!this.canSink(j, d)) break;
      target = j;
      if (this.type[j] !== EMPTY) break;
    }
    if (target < 0) return false;
    this.swap(i, target);
    return true;
  }

  /** Gas movement: rise, drift, bubble up through liquids. */
  private rise(i: number, x: number, y: number, bubble: number) {
    const w = this.w;
    const dir = this.rand() < 0.5 ? -1 : 1;
    if (y > 0) {
      const up = i - w;
      const tu = this.type[up];
      if (tu === EMPTY || (KIND[tu] === KIND_LIQUID && this.rand() < bubble) || (KIND[tu] === KIND_POWDER && this.rand() < bubble * 0.5)) {
        if (this.rand() < 0.8) {
          this.swap(i, up);
          return;
        }
      }
      const nx = x + dir;
      if (nx >= 0 && nx < w && this.type[up + dir] === EMPTY) {
        this.swap(i, up + dir);
        return;
      }
    }
    const nx = x + dir;
    if (nx >= 0 && nx < w && this.type[i + dir] === EMPTY && this.rand() < 0.6) this.swap(i, i + dir);
  }

  // ── reactions ───────────────────────────────────────────────────────────

  /** Random 4-neighbour index, or -1 if out of bounds. */
  private neighbour(i: number, x: number, y: number, r: number): number {
    switch (r & 3) {
      case 0:
        return y > 0 ? i - this.w : -1;
      case 1:
        return y < this.h - 1 ? i + this.w : -1;
      case 2:
        return x > 0 ? i - 1 : -1;
      default:
        return x < this.w - 1 ? i + 1 : -1;
    }
  }

  /** Try to set a flammable neighbour alight. */
  private ignite(j: number, chanceScale: number): boolean {
    const t = this.type[j];
    if (t === PLANT && this.rand() < 0.3 * chanceScale) {
      this.become(j, FIRE);
      this.discover(R_WILDFIRE);
      this.events.ignite++;
      return true;
    }
    if (t === WOOD && this.rand() < 0.04 * chanceScale) {
      this.become(j, EMBER);
      this.discover(R_KINDLING);
      this.events.ignite++;
      return true;
    }
    if (t === OIL && this.rand() < 0.5 * chanceScale) {
      this.become(j, FIRE);
      this.life[j] = 50 + (this.rnd() % 40);
      this.discover(R_OILFIRE);
      this.events.ignite++;
      return true;
    }
    return false;
  }

  private fire(i: number, x: number, y: number) {
    const type = this.type;
    for (let r = 0; r < 4; r++) {
      const j = this.neighbour(i, x, y, r);
      if (j < 0) continue;
      const t = type[j];
      if (t === WATER) {
        if (this.rand() < 0.5) this.become(j, STEAM);
        this.become(i, this.rand() < 0.5 ? STEAM : EMPTY);
        this.discover(R_DOUSE);
        this.events.sizzle++;
        return;
      }
      if (t === ICE) {
        if (this.rand() < 0.06) {
          this.become(j, WATER);
          this.discover(R_THAW);
          this.events.sizzle++;
        }
        continue;
      }
      this.ignite(j, 1);
    }
    const l = this.life[i];
    if (l <= 1) {
      this.become(i, this.rand() < 0.35 ? SMOKE : EMPTY);
      return;
    }
    this.life[i] = l - 1;
    // Flicker upwards.
    if (this.rand() < 0.7) this.rise(i, x, y, 0);
  }

  private ember(i: number, x: number, y: number) {
    const type = this.type;
    const j = this.neighbour(i, x, y, this.rnd());
    if (j >= 0) {
      const t = type[j];
      if (t === WATER) {
        this.become(j, STEAM);
        this.discover(R_DOUSE);
        this.events.sizzle++;
        if (this.rand() < 0.3) {
          this.become(i, WOOD);
          return;
        }
      } else if (t === EMPTY) {
        if (this.rand() < 0.12) this.become(j, FIRE);
      } else if (t === ICE) {
        if (this.rand() < 0.05) {
          this.become(j, WATER);
          this.discover(R_THAW);
        }
      } else {
        this.ignite(j, 0.6);
      }
    }
    // Always prefer to throw flames upward.
    if (y > 0 && type[i - this.w] === EMPTY && this.rand() < 0.08) this.become(i - this.w, FIRE);
    if (this.rand() < 0.5) {
      const l = this.life[i];
      if (l <= 1) {
        const r = this.rand();
        this.become(i, r < 0.35 ? ASH : r < 0.7 ? SMOKE : EMPTY);
        return;
      }
      this.life[i] = l - 1;
    }
  }

  /** Returns true if the lava cell changed into something else. */
  private lava(i: number, x: number, y: number): boolean {
    const type = this.type;
    for (let r = 0; r < 4; r++) {
      const j = this.neighbour(i, x, y, r);
      if (j < 0) continue;
      const t = type[j];
      if (t === WATER) {
        this.become(j, STEAM);
        this.become(i, OBSIDIAN);
        this.discover(R_OBSIDIAN);
        this.events.sizzle++;
        return true;
      }
      if (t === ICE) {
        if (this.rand() < 0.12) {
          this.become(j, WATER);
          this.become(i, STONE);
          this.discover(R_COLDFRONT);
          this.events.sizzle++;
          return true;
        }
        continue;
      }
      if (t === SAND) {
        if (this.rand() < 0.006) {
          this.become(j, GLASS);
          this.discover(R_GLASS);
        }
        continue;
      }
      if (t === STEAM || t === SMOKE || t === EMPTY) continue;
      this.ignite(j, 0.5);
    }
    // Occasional spit of flame from the surface.
    if (y > 0 && type[i - this.w] === EMPTY && this.rand() < 0.0025) this.become(i - this.w, FIRE);
    return false;
  }

  private steam(i: number, x: number, y: number) {
    const j = this.neighbour(i, x, y, this.rnd());
    if (j >= 0 && this.type[j] === ICE && this.rand() < 0.2) {
      this.become(i, WATER);
      this.discover(R_RAIN);
      return;
    }
    let l = this.life[i];
    const dec = y < 3 ? 3 : 1;
    if (l <= dec) {
      if (this.rand() < 0.65) {
        this.become(i, WATER);
        this.discover(R_RAIN);
      } else this.become(i, EMPTY);
      return;
    }
    l -= dec;
    this.life[i] = l;
    if (this.rand() < 0.85) this.rise(i, x, y, 0.4);
  }

  private smoke(i: number, x: number, y: number) {
    let l = this.life[i];
    const dec = y < 2 ? 4 : 1;
    if (l <= dec) {
      this.become(i, EMPTY);
      return;
    }
    l -= dec;
    this.life[i] = l;
    if (this.rand() < 0.75) this.rise(i, x, y, 0.3);
  }

  private plant(i: number, x: number, y: number) {
    if (this.rand() > 0.035) return;
    const j = this.neighbour(i, x, y, this.rnd());
    if (j >= 0 && this.type[j] === WATER) {
      this.become(j, PLANT);
      this.discover(R_OVERGROWTH);
    }
  }

  private ice(i: number, x: number, y: number) {
    if (this.rand() > 0.012) return;
    const j = this.neighbour(i, x, y, this.rnd());
    if (j >= 0 && this.type[j] === WATER) {
      this.become(j, ICE);
      this.discover(R_FROSTBITE);
    }
  }

  /** Returns true if the acid was consumed. */
  private acid(i: number, x: number, y: number): boolean {
    if (this.rand() > 0.3) return false;
    const j = this.neighbour(i, x, y, this.rnd());
    if (j < 0) return false;
    const t = this.type[j];
    if (!DISSOLVES[t]) return false;
    this.become(j, this.rand() < 0.25 ? SMOKE : EMPTY);
    this.discover(R_CORROSION);
    this.events.fizz++;
    if (this.rand() < 0.4) {
      this.become(i, EMPTY);
      return true;
    }
    return false;
  }

  /** Static solids paint with the same KIND table; exported for UI decisions. */
  static isStatic(el: number) {
    return KIND[el] === KIND_STATIC;
  }
}

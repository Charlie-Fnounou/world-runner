/**
 * Speed Duel — pure round/scoring simulation (no DOM, no React).
 *
 * Time inside the engine is a "game clock" in milliseconds that only
 * advances through `update(dtMs)`, so pausing the caller's loop freezes it.
 * Human reaction times are measured by the caller with high-resolution
 * event timestamps and passed in through `shoot()`.
 */

export type RoundKind = "draw" | "color" | "word" | "bell";
export type Lamp = "red" | "yellow" | "green";
export type CueSound = "crow" | "clunk" | "whistle" | "bell";

export interface Cue {
  /** ms after the standoff ("wait" phase) begins. */
  at: number;
  real: boolean;
  /** Text shown on the sign (word rounds, draw round, bell caption). */
  text: string;
  lamp?: Lamp;
  sound?: CueSound;
}

export interface Plan {
  kind: RoundKind;
  cues: Cue[];
  realAt: number;
}

export type Phase = "idle" | "announce" | "wait" | "signal" | "result" | "void" | "done";

export interface DuelPlayer {
  cpu: boolean;
  /** Small per-CPU skill offset (ms), positive = slower. */
  skill: number;
  points: number;
  jammed: boolean;
  /** Valid reaction this round, ms. */
  shot: number | null;
  /** Won the current/last resolved round. */
  won: boolean;
  best: number | null;
  falseStarts: number;
  validShots: number;
  /** CPU: scheduled reaction (ms after signal) for this round. */
  cpuReaction: number;
  /** CPU: scheduled false start (ms after wait start), or -1. */
  cpuFalseAt: number;
}

export type DuelEvent =
  | { type: "announce"; round: number; kind: RoundKind; restarted: boolean }
  | { type: "wait" }
  | { type: "cue"; cue: Cue }
  | { type: "signal"; cue: Cue }
  | { type: "shot"; player: number; reaction: number }
  | { type: "jam"; player: number }
  | { type: "result"; winners: number[]; best: number }
  | { type: "void"; reason: "jammed" | "noshot" }
  | { type: "done"; winner: number };

export interface Rand {
  next: () => number;
  range: (a: number, b: number) => number;
  int: (a: number, b: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  shuffle: <T>(arr: readonly T[]) => T[];
}

export const TARGET_POINTS = 5;
export const ANNOUNCE_MS = 2100;
export const RESULT_MS = 2300;
export const VOID_MS = 2000;
/** Max time to wait for anybody to shoot after the real signal. */
export const SIGNAL_TIMEOUT_MS = 2500;
/** After the first shot, how long others still have to register their time. */
export const LATE_WINDOW_MS = 650;

export const KIND_INFO: Record<RoundKind, { title: string; rule: string }> = {
  draw: { title: "Classic Draw", rule: "Fire the moment you see DRAW!" },
  color: { title: "Signal Lamp", rule: "Fire only on GREEN. Red and yellow are traps." },
  word: { title: "Read the Sign", rule: 'Fire only when the sign says exactly "FIRE".' },
  bell: { title: "Church Bell", rule: "Listen. Fire on the bell — not on any other sound." },
};

const WORD_DECOYS = ["FIRE?", "FIRM", "FIVE", "HIRE", "FIRS", "WIRE", "FIR", "FILE", "TIRE"] as const;
const SOUND_DECOYS: { sound: CueSound; text: string }[] = [
  { sound: "crow", text: "a crow caws" },
  { sound: "clunk", text: "a door creaks" },
  { sound: "whistle", text: "someone whistles" },
];

/** Builds the timeline of cues for one round. */
export function makePlan(kind: RoundKind, r: Rand): Plan {
  const realAt = Math.round(r.range(1500, 5000));
  const cues: Cue[] = [];
  if (kind === "draw") {
    cues.push({ at: realAt, real: true, text: "DRAW!" });
  } else if (kind === "color") {
    let t = r.range(450, 900);
    let last: Lamp | null = null;
    while (t < realAt - 420) {
      const lamp: Lamp = last === "red" ? "yellow" : last === "yellow" ? "red" : r.next() < 0.5 ? "red" : "yellow";
      cues.push({ at: Math.round(t), real: false, text: lamp.toUpperCase(), lamp });
      last = lamp;
      t += r.range(480, 1150);
    }
    cues.push({ at: realAt, real: true, text: "GREEN", lamp: "green" });
  } else if (kind === "word") {
    let t = r.range(450, 900);
    let last = "";
    while (t < realAt - 420) {
      let w: string = r.pick(WORD_DECOYS);
      if (w === last) w = WORD_DECOYS[(WORD_DECOYS.indexOf(w as (typeof WORD_DECOYS)[number]) + 1) % WORD_DECOYS.length];
      cues.push({ at: Math.round(t), real: false, text: w });
      last = w;
      t += r.range(520, 1200);
    }
    cues.push({ at: realAt, real: true, text: "FIRE" });
  } else {
    const decoys = r.int(0, 2);
    const order = r.shuffle(SOUND_DECOYS);
    let t = r.range(600, 1100);
    for (let i = 0; i < decoys && t < realAt - 500; i++) {
      const d = order[i];
      cues.push({ at: Math.round(t), real: false, text: d.text, sound: d.sound });
      t += r.range(700, 1500);
    }
    cues.push({ at: realAt, real: true, text: "DING!", sound: "bell" });
  }
  return { kind, cues, realAt };
}

/** Realistic-ish CPU reaction time in ms. */
export function cpuReaction(kind: RoundKind, skill: number, r: Rand): number {
  // Average of three uniforms -> bell-ish curve between 0 and 1.
  const b = (r.next() + r.next() + r.next()) / 3;
  let ms = 228 + b * 165 + skill;
  if (kind !== "draw") ms += r.range(15, 45);
  // Occasional slow reaction.
  if (r.next() < 0.06) ms += r.range(40, 110);
  return Math.round(Math.max(205, Math.min(520, ms)));
}

export class Duel {
  phase: Phase = "idle";
  clock = 0;
  phaseStart = 0;
  round = 0;
  kind: RoundKind = "draw";
  plan: Plan | null = null;
  /** Index of the latest cue shown (within plan.cues), -1 = none yet. */
  cueIndex = -1;
  signalClock = 0;
  restarted = false;
  lastWinners: number[] = [];
  voidReason: "jammed" | "noshot" | null = null;
  champion = -1;
  players: DuelPlayer[];
  private bag: RoundKind[] = [];

  constructor(
    cpuFlags: boolean[],
    private r: Rand,
  ) {
    this.players = cpuFlags.map((cpu) => ({
      cpu,
      skill: cpu ? Math.round(r.range(-8, 28)) : 0,
      points: 0,
      jammed: false,
      shot: null,
      won: false,
      best: null,
      falseStarts: 0,
      validShots: 0,
      cpuReaction: 0,
      cpuFalseAt: -1,
    }));
  }

  get elapsed() {
    return this.clock - this.phaseStart;
  }

  get currentCue(): Cue | null {
    if (!this.plan || this.cueIndex < 0) return null;
    return this.plan.cues[this.cueIndex];
  }

  private nextKind(): RoundKind {
    if (this.round === 1) return "draw";
    if (this.bag.length === 0) {
      let b = this.r.shuffle<RoundKind>(["color", "word", "bell", "draw"]);
      // Avoid the same kind twice in a row across bags.
      if (b[0] === this.kind) b = [...b.slice(1), b[0]];
      this.bag = b;
    }
    return this.bag.shift()!;
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.phaseStart = this.clock;
  }

  private resetRoundPlayers() {
    for (const p of this.players) {
      p.jammed = false;
      p.shot = null;
      p.won = false;
    }
  }

  private prepareRound(kind: RoundKind) {
    this.kind = kind;
    this.plan = makePlan(kind, this.r);
    this.cueIndex = -1;
    this.lastWinners = [];
    this.voidReason = null;
    this.resetRoundPlayers();
    for (const p of this.players) {
      if (!p.cpu) continue;
      p.cpuReaction = cpuReaction(kind, p.skill, this.r);
      p.cpuFalseAt = -1;
      const decoys = this.plan.cues.filter((c) => !c.real);
      if (kind === "draw") {
        if (this.r.next() < 0.025) p.cpuFalseAt = Math.round(this.r.range(900, Math.max(1000, this.plan.realAt - 150)));
      } else {
        const chance = kind === "word" ? 0.055 : kind === "color" ? 0.045 : 0.06;
        for (const d of decoys) {
          if (this.r.next() < chance) {
            const at = d.at + Math.round(this.r.range(190, 330));
            if (at < this.plan.realAt) p.cpuFalseAt = at;
            break;
          }
        }
      }
    }
  }

  private startRound(events: DuelEvent[], restarted: boolean) {
    if (!restarted) this.round += 1;
    this.restarted = restarted;
    this.prepareRound(restarted ? this.kind : this.nextKind());
    this.setPhase("announce");
    events.push({ type: "announce", round: this.round, kind: this.kind, restarted });
  }

  /** Cancel the round in progress (used on pause). Returns true if something was cancelled. */
  cancelRound(): boolean {
    if (this.phase !== "announce" && this.phase !== "wait" && this.phase !== "signal") return false;
    this.resetRoundPlayers();
    this.cueIndex = -1;
    this.restarted = true;
    this.prepareRound(this.kind);
    this.setPhase("announce");
    return true;
  }

  /** A player pulled the trigger during the standoff -> jammed. */
  jam(i: number, events: DuelEvent[]) {
    const p = this.players[i];
    if (this.phase !== "wait" || p.jammed) return;
    p.jammed = true;
    p.falseStarts += 1;
    events.push({ type: "jam", player: i });
    if (this.players.every((q) => q.jammed)) {
      this.voidReason = "jammed";
      this.setPhase("void");
      events.push({ type: "void", reason: "jammed" });
    }
  }

  /** A valid shot during the signal phase with a measured reaction time. */
  shoot(i: number, reaction: number, events: DuelEvent[]) {
    const p = this.players[i];
    if (this.phase !== "signal" || p.jammed || p.shot !== null) return;
    const ms = Math.max(0, Math.round(reaction));
    p.shot = ms;
    p.validShots += 1;
    if (p.best === null || ms < p.best) p.best = ms;
    events.push({ type: "shot", player: i, reaction: ms });
  }

  /** Human press: routed to jam or shoot depending on phase. */
  press(i: number, reaction: number, events: DuelEvent[]) {
    if (this.phase === "wait") this.jam(i, events);
    else if (this.phase === "signal") this.shoot(i, reaction, events);
  }

  update(dtMs: number): DuelEvent[] {
    const events: DuelEvent[] = [];
    this.clock += dtMs;
    switch (this.phase) {
      case "idle":
        this.startRound(events, false);
        break;
      case "announce":
        if (this.elapsed >= ANNOUNCE_MS) {
          this.setPhase("wait");
          events.push({ type: "wait" });
        }
        break;
      case "wait": {
        const plan = this.plan!;
        const t = this.elapsed;
        // CPU false starts.
        this.players.forEach((p, i) => {
          if (p.cpu && !p.jammed && p.cpuFalseAt >= 0 && t >= p.cpuFalseAt) this.jam(i, events);
        });
        if (this.phase !== "wait") break;
        while (this.cueIndex + 1 < plan.cues.length && plan.cues[this.cueIndex + 1].at <= t) {
          this.cueIndex += 1;
          const cue = plan.cues[this.cueIndex];
          if (cue.real) {
            // Signal time is when the cue was due, keeping CPU timing exact.
            this.phase = "signal";
            this.phaseStart = this.phaseStart + cue.at;
            this.signalClock = this.phaseStart;
            events.push({ type: "signal", cue });
            break;
          }
          events.push({ type: "cue", cue });
        }
        break;
      }
      case "signal": {
        const t = this.elapsed;
        this.players.forEach((p, i) => {
          if (p.cpu && !p.jammed && p.shot === null && t >= p.cpuReaction) this.shoot(i, p.cpuReaction, events);
        });
        const active = this.players.filter((p) => !p.jammed);
        const shots = active.filter((p) => p.shot !== null).map((p) => p.shot!);
        const first = shots.length ? Math.min(...shots) : null;
        const allShot = active.every((p) => p.shot !== null);
        if (allShot || t >= SIGNAL_TIMEOUT_MS || (first !== null && t >= first + LATE_WINDOW_MS)) {
          if (first === null) {
            this.voidReason = "noshot";
            this.setPhase("void");
            events.push({ type: "void", reason: "noshot" });
          } else {
            const winners: number[] = [];
            this.players.forEach((p, i) => {
              if (!p.jammed && p.shot === first) {
                winners.push(i);
                p.points += 1;
                p.won = true;
              }
            });
            this.lastWinners = winners;
            this.setPhase("result");
            events.push({ type: "result", winners, best: first });
          }
        }
        break;
      }
      case "result":
        if (this.elapsed >= RESULT_MS) {
          const top = Math.max(...this.players.map((p) => p.points));
          if (top >= TARGET_POINTS) {
            const leaders = this.players.map((p, i) => (p.points === top ? i : -1)).filter((i) => i >= 0);
            // Simultaneous winners at match point (identical ms) -> pick the one with the better best time.
            leaders.sort((a, b) => (this.players[a].best ?? 9e9) - (this.players[b].best ?? 9e9));
            this.champion = leaders[0];
            this.setPhase("done");
            events.push({ type: "done", winner: this.champion });
          } else {
            this.startRound(events, false);
          }
        }
        break;
      case "void":
        if (this.elapsed >= VOID_MS) this.startRound(events, false);
        break;
      case "done":
        break;
    }
    return events;
  }

  /** Rank per player (0 = first), ties share. */
  placements(): number[] {
    return this.players.map((p) => {
      let rank = this.players.filter((q) => q.points > p.points).length;
      // The champion is always alone on top even if a tie in points happened.
      if (this.champion >= 0 && p.points === this.players[this.champion].points) {
        rank = this.players.indexOf(p) === this.champion ? 0 : 1;
      }
      return rank;
    });
  }
}

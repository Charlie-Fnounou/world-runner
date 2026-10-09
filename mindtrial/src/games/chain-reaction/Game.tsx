"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Flag, MousePointer2, Play, RotateCcw, RotateCw, Square, Trash2 } from "lucide-react";
import { FitCanvas, type FitCanvasHandle } from "@/components/game/FitCanvas";
import { useGameLoop } from "@/lib/loop";
import { noise, sfx, tone } from "@/lib/sound";
import type { GameProps } from "@/lib/types";
import { BLUE, INK, PAPER, RED, drawBodies, drawDropper, drawFx, drawPaper, drawPart, drawTarget, drawWalls } from "./draw";
import { LEVELS, type Level } from "./levels";
import {
  BOMB_R,
  BUMPER_R,
  DOMINO_H,
  DOMINO_W,
  RAMP_R,
  SPRING_R,
  SUBSTEP,
  WORLD_H,
  WORLD_W,
  allTargetsHit,
  buildWorld,
  distToSeg,
  placementOk,
  segEnds,
  staticSegs,
  step,
  surfaceBelow,
  updateCosmetics,
  type Part,
  type PartKind,
  type World,
} from "./physics";

const KINDS: PartKind[] = ["ramp", "bumper", "domino", "bomb", "spring"];
const KIND_LABEL: Record<PartKind, string> = { ramp: "Ramp", bumper: "Bumper", domino: "Domino", bomb: "Bomb", spring: "Spring" };
const KIND_TIP: Record<PartKind, string> = {
  ramp: "A rigid plank. Rotate it to steer the ball.",
  bumper: "Kicks anything that touches it away from its centre.",
  domino: "Stands on the surface below and topples when struck.",
  bomb: "Explodes when a ball or domino hits it. Sets off nearby bombs.",
  spring: "Launches the ball in the direction it faces.",
};
const ROT_STEP = Math.PI / 12;
const BASE_POINTS = 1000;
const PART_BONUS = 150;
const CLEAN_BONUS = 250;
const MAX_RUN_TIME = 30;

type Mode = "build" | "run" | "cleared";
type Tool = "select" | PartKind;

interface LevelResult {
  bonus: number;
  clean: number;
  total: number;
  unused: number;
  best: boolean;
}

interface Best {
  score: number;
  parts: number;
}

function fixedPartsOf(level: Level): Part[] {
  return (level.fixed ?? []).map((p, i) => ({ ...p, id: 1000 + i, fixed: true }));
}

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function wrapAngle(kind: PartKind, a: number) {
  // Ramps are symmetric, so keep them within ±90°; springs can face anywhere.
  if (kind === "ramp") {
    while (a > Math.PI / 2 + 1e-6) a -= Math.PI;
    while (a < -Math.PI / 2 - 1e-6) a += Math.PI;
  } else {
    while (a > Math.PI + 1e-6) a -= Math.PI * 2;
    while (a <= -Math.PI + 1e-6) a += Math.PI * 2;
  }
  return Math.round(a / ROT_STEP) * ROT_STEP;
}

function hitTest(p: Part, x: number, y: number): number {
  switch (p.kind) {
    case "ramp":
    case "spring": {
      const [ax, ay, bx, by] = segEnds(p);
      return distToSeg(x, y, ax, ay, bx, by) - (p.kind === "ramp" ? RAMP_R : SPRING_R) - 10;
    }
    case "bumper":
      return Math.hypot(x - p.x, y - p.y) - BUMPER_R - 6;
    case "bomb":
      return Math.hypot(x - p.x, y - p.y) - BOMB_R - 8;
    default:
      return distToSeg(x, y, p.x, p.y, p.x, p.y - DOMINO_H) - DOMINO_W / 2 - 10;
  }
}

function PartIcon({ kind }: { kind: PartKind }) {
  const common = { width: 26, height: 26, viewBox: "0 0 26 26", "aria-hidden": true } as const;
  switch (kind) {
    case "ramp":
      return (
        <svg {...common}>
          <line x1="3" y1="8" x2="23" y2="18" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "bumper":
      return (
        <svg {...common}>
          <circle cx="13" cy="13" r="9" fill={RED} stroke={INK} strokeWidth="2" />
          <circle cx="13" cy="13" r="5" fill="none" stroke={PAPER} strokeWidth="1.5" />
        </svg>
      );
    case "domino":
      return (
        <svg {...common}>
          <rect x="9" y="2" width="8" height="22" rx="2" fill={BLUE} />
          <circle cx="13" cy="7" r="1.3" fill={PAPER} />
          <circle cx="13" cy="19" r="1.3" fill={PAPER} />
        </svg>
      );
    case "bomb":
      return (
        <svg {...common}>
          <path d="M16 8 Q19 3 23 4" stroke="#8a6a3a" strokeWidth="2" fill="none" />
          <circle cx="23" cy="4" r="2" fill="#ffb02e" />
          <circle cx="12" cy="15" r="8" fill={INK} />
          <circle cx="9" cy="12" r="2" fill="rgba(244,236,223,0.6)" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M6 16 L20 18 L6 20 L20 22" stroke={INK} strokeWidth="1.6" fill="none" />
          <line x1="3" y1="13" x2="23" y2="13" stroke={RED} strokeWidth="4" strokeLinecap="round" />
          <path d="M13 9 L10 5 M13 9 L16 5" stroke={BLUE} strokeWidth="1.6" />
        </svg>
      );
  }
}

export default function ChainReaction({ paused, reducedMotion, onFinish }: GameProps) {
  const fitRef = useRef<FitCanvasHandle>(null);

  const [levelIdx, setLevelIdx] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [mode, setModeState] = useState<Mode>("build");
  const [parts, setPartsState] = useState<Part[]>([]);
  const [tool, setToolState] = useState<Tool>("select");
  const [selectedId, setSelectedState] = useState<number | null>(null);
  const [stalled, setStalled] = useState(false);
  const [starsLit, setStarsLit] = useState(0);
  const [bests, setBests] = useState<(Best | null)[]>(() => LEVELS.map(() => null));
  const [runs, setRuns] = useState(0);
  const [result, setResult] = useState<LevelResult | null>(null);

  const level = LEVELS[levelIdx];

  // Mirrors of state for the render loop / global listeners.
  const levelRef = useRef(0);
  const modeRef = useRef<Mode>("build");
  const partsRef = useRef<Part[]>([]);
  const toolRef = useRef<Tool>("select");
  const selRef = useRef<number | null>(null);
  const worldRef = useRef<World | null>(null);
  const layouts = useRef(new Map<number, Part[]>());
  const runsThisLevel = useRef(0);
  const ghostAngle = useRef<Record<PartKind, number>>({ ramp: Math.PI / 12, spring: 0, bumper: 0, domino: 0, bomb: 0 });
  const pointer = useRef({ x: 0, y: 0, inside: false });
  const drag = useRef<{ id: number; dx: number; dy: number; x: number; y: number; valid: boolean; moved: boolean } | null>(null);
  const fx = useRef({ clock: 0, acc: 0, clearT: 0, shake: 0, lastBounce: 0, lastClack: 0, hits: 0, stalled: false });
  const nextId = useRef(1);
  const finished = useRef(false);

  const setMode = useCallback((m: Mode) => {
    modeRef.current = m;
    setModeState(m);
  }, []);
  const setParts = useCallback((p: Part[]) => {
    partsRef.current = p;
    setPartsState(p);
  }, []);
  const setTool = useCallback((t: Tool) => {
    toolRef.current = t;
    setToolState(t);
  }, []);
  const setSelected = useCallback((id: number | null) => {
    selRef.current = id;
    setSelectedState(id);
  }, []);

  const remainingOf = useCallback(
    (kind: PartKind, list: Part[]) => (LEVELS[levelRef.current].inventory[kind] ?? 0) - list.filter((p) => p.kind === kind).length,
    [],
  );

  /** Build a candidate part at a position (dominoes snap onto the surface below). */
  const candidate = useCallback((kind: PartKind, x: number, y: number, angle: number, id: number): Part => {
    const lvl = LEVELS[levelRef.current];
    if (kind === "domino") {
      const others = [...fixedPartsOf(lvl), ...partsRef.current.filter((p) => p.id !== id)];
      const top = surfaceBelow(x, y, staticSegs(lvl.walls, others));
      return { id, kind, x, y: top ?? y, angle: 0 };
    }
    return { id, kind, x, y, angle: kind === "ramp" || kind === "spring" ? angle : 0 };
  }, []);

  const isValid = useCallback((cand: Part) => {
    const lvl = LEVELS[levelRef.current];
    return placementOk(lvl, [...fixedPartsOf(lvl), ...partsRef.current], cand);
  }, []);

  // ── run / reset ─────────────────────────────────────────────────────────
  const startRun = useCallback(() => {
    const lvl = LEVELS[levelRef.current];
    worldRef.current = buildWorld(lvl, [...fixedPartsOf(lvl), ...partsRef.current], 7);
    drag.current = null;
    const f = fx.current;
    f.acc = 0;
    f.clearT = 0;
    f.hits = 0;
    f.stalled = false;
    runsThisLevel.current++;
    setRuns((r) => r + 1);
    setStalled(false);
    setStarsLit(0);
    setSelected(null);
    setMode("run");
    tone({ freq: 330, to: 660, duration: 0.16, type: "triangle", volume: 0.09 });
  }, [setMode, setSelected]);

  const resetRun = useCallback(() => {
    worldRef.current = null;
    fx.current.stalled = false;
    setStalled(false);
    setStarsLit(0);
    setResult(null);
    setMode("build");
    tone({ freq: 440, to: 220, duration: 0.14, type: "triangle", volume: 0.07 });
  }, [setMode]);

  const toggleRun = useCallback(() => {
    if (modeRef.current === "build") startRun();
    else if (modeRef.current === "run") resetRun();
  }, [startRun, resetRun]);

  const goToLevel = useCallback(
    (idx: number) => {
      layouts.current.set(levelRef.current, partsRef.current);
      levelRef.current = idx;
      setLevelIdx(idx);
      setParts(layouts.current.get(idx) ?? []);
      worldRef.current = null;
      runsThisLevel.current = 0;
      fx.current.stalled = false;
      setStalled(false);
      setStarsLit(0);
      setResult(null);
      setSelected(null);
      setTool("select");
      setMode("build");
      sfx.click();
    },
    [setMode, setParts, setSelected, setTool],
  );

  const finishRun = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const cleared = bests.filter((b): b is Best => !!b);
    const total = cleared.reduce((s, b) => s + b.score, 0);
    const partsUsed = cleared.reduce((s, b) => s + b.parts, 0);
    const starTotal = LEVELS.reduce((s, l, i) => s + (bests[i] ? l.targets.length : 0), 0);
    const all = cleared.length === LEVELS.length;
    onFinish({
      headline: all ? "Machine complete!" : cleared.length ? `Cleared ${cleared.length} of ${LEVELS.length}` : "Back to the drawing board",
      subline: all ? "Every contraption ticks. Rube Goldberg would be proud." : cleared.length ? "Some machines still wait for their spark." : "Not a single star lit — yet.",
      score: total,
      scoreLabel: `${fmt(total)} pts`,
      stats: [
        { label: "Levels cleared", value: `${cleared.length}/${LEVELS.length}` },
        { label: "Parts used", value: String(partsUsed) },
        { label: "Stars lit", value: String(starTotal) },
        { label: "Runs", value: String(runs) },
      ],
    });
  }, [bests, onFinish, runs]);

  const clearLevel = useCallback(() => {
    const used = partsRef.current.length;
    const unused = KINDS.reduce((s, k) => s + Math.max(0, remainingOf(k, partsRef.current)), 0);
    const bonus = unused * PART_BONUS;
    const clean = runsThisLevel.current === 1 ? CLEAN_BONUS : 0;
    const total = BASE_POINTS + bonus + clean;
    const idx = levelRef.current;
    const prevBest = bests[idx];
    const isBest = !prevBest || total > prevBest.score;
    setBests((prev) => {
      const next = prev.slice();
      const old = next[idx];
      if (!old || total > old.score) {
        next[idx] = { score: total, parts: used };
      }
      return next;
    });
    setUnlocked((u) => Math.max(u, Math.min(LEVELS.length - 1, idx + 1)));
    setResult({ bonus, clean, total, unused, best: isBest });
    setMode("cleared");
    sfx.win();
    // Confetti.
    const w = worldRef.current;
    if (w) {
      const n = reducedMotion ? 30 : 110;
      const colors = [RED, BLUE, INK, "#ffb02e"];
      for (let i = 0; i < n; i++) {
        w.sparks.push({
          x: WORLD_W * (0.1 + Math.random() * 0.8),
          y: -10 - Math.random() * 120,
          vx: (Math.random() - 0.5) * 200,
          vy: 100 + Math.random() * 250,
          life: 1.6 + Math.random() * 1.4,
          max: 3,
          color: colors[i % colors.length],
          size: 4 + Math.random() * 5,
        });
      }
    }
  }, [bests, reducedMotion, remainingOf, setMode]);

  // ── editing ─────────────────────────────────────────────────────────────
  const removePart = useCallback(
    (id: number) => {
      if (modeRef.current !== "build") return;
      const p = partsRef.current.find((q) => q.id === id);
      if (!p) return;
      setParts(partsRef.current.filter((q) => q.id !== id));
      if (selRef.current === id) setSelected(null);
      tone({ freq: 320, to: 180, duration: 0.1, type: "triangle", volume: 0.08 });
    },
    [setParts, setSelected],
  );

  const rotate = useCallback(
    (dir: number) => {
      if (modeRef.current !== "build") return;
      const id = selRef.current;
      const sel = id !== null ? partsRef.current.find((p) => p.id === id) : undefined;
      if (sel && (sel.kind === "ramp" || sel.kind === "spring")) {
        const next = { ...sel, angle: wrapAngle(sel.kind, sel.angle + dir * ROT_STEP) };
        if (!isValid(next)) {
          tone({ freq: 160, duration: 0.08, type: "square", volume: 0.04 });
          return;
        }
        setParts(partsRef.current.map((p) => (p.id === sel.id ? next : p)));
        tone({ freq: 900 + dir * 80, duration: 0.03, type: "square", volume: 0.035 });
        return;
      }
      const t = toolRef.current;
      if (t === "ramp" || t === "spring") {
        ghostAngle.current[t] = wrapAngle(t, ghostAngle.current[t] + dir * ROT_STEP);
        tone({ freq: 900 + dir * 80, duration: 0.03, type: "square", volume: 0.035 });
      }
    },
    [isValid, setParts],
  );

  const pickTool = useCallback(
    (k: PartKind) => {
      if (modeRef.current !== "build") return;
      if (remainingOf(k, partsRef.current) <= 0) {
        tone({ freq: 160, duration: 0.08, type: "square", volume: 0.04 });
        return;
      }
      setTool(toolRef.current === k ? "select" : k);
      setSelected(null);
      sfx.click();
    },
    [remainingOf, setSelected, setTool],
  );

  // ── pointer ─────────────────────────────────────────────────────────────
  const local = (e: React.PointerEvent | React.WheelEvent) => fitRef.current?.toLocal(e) ?? { x: 0, y: 0 };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    const { x, y } = local(e);
    pointer.current = { x, y, inside: true };
    if (modeRef.current !== "build") return;
    e.preventDefault();
    const list = partsRef.current;
    // Topmost part under the pointer.
    let hit: Part | null = null;
    let bestD = 0;
    for (const p of list) {
      const d = hitTest(p, x, y);
      if (d < 0 && (hit === null || d < bestD)) {
        hit = p;
        bestD = d;
      }
    }
    if (e.button === 2) {
      if (hit) removePart(hit.id);
      return;
    }
    const t = toolRef.current;
    if (t !== "select") {
      if (remainingOf(t, list) <= 0) {
        setTool("select");
        return;
      }
      const id = nextId.current++;
      const cand = candidate(t, x, y, ghostAngle.current[t], id);
      if (!isValid(cand)) {
        tone({ freq: 160, duration: 0.1, type: "square", volume: 0.05 });
        return;
      }
      setParts([...list, cand]);
      setSelected(id);
      setTool("select");
      tone({ freq: 520, duration: 0.06, type: "triangle", volume: 0.1 });
      tone({ freq: 780, duration: 0.06, type: "triangle", volume: 0.07, delay: 0.05 });
      return;
    }
    if (hit) {
      setSelected(hit.id);
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { id: hit.id, dx: hit.x - x, dy: hit.y - y, x: hit.x, y: hit.y, valid: true, moved: false };
      tone({ freq: 700, duration: 0.03, type: "square", volume: 0.03 });
    } else {
      setSelected(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = local(e);
    pointer.current = { x, y, inside: true };
    const d = drag.current;
    if (!d || paused || modeRef.current !== "build") return;
    const p = partsRef.current.find((q) => q.id === d.id);
    if (!p) return;
    const cand = candidate(p.kind, x + d.dx, y + (p.kind === "domino" ? 0 : d.dy), p.angle, p.id);
    if (Math.hypot(cand.x - p.x, cand.y - p.y) > 2) d.moved = true;
    d.x = cand.x;
    d.y = cand.y;
    d.valid = isValid(cand);
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    if (d.valid) {
      setParts(partsRef.current.map((p) => (p.id === d.id ? { ...p, x: d.x, y: d.y } : p)));
      tone({ freq: 600, duration: 0.04, type: "triangle", volume: 0.07 });
    } else {
      tone({ freq: 160, duration: 0.1, type: "square", volume: 0.05 });
    }
  };

  // ── keyboard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (e.repeat) return;
        toggleRun();
      } else if (e.code === "KeyR") {
        rotate(1);
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (selRef.current !== null) {
          e.preventDefault();
          removePart(selRef.current);
        }
      } else if (/^Digit[1-5]$/.test(e.code)) {
        pickTool(KINDS[Number(e.code.slice(5)) - 1]);
      } else if ((e.code === "Enter" || e.code === "NumpadEnter") && modeRef.current === "cleared") {
        e.preventDefault();
        if (levelRef.current < LEVELS.length - 1) goToLevel(levelRef.current + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, toggleRun, rotate, removePart, pickTool, goToLevel]);

  function render() {
    const ctx = fitRef.current?.ctx;
    if (!ctx) return;
    const f = fx.current;
    const lvl = LEVELS[levelRef.current];
    const fixedList = fixedPartsOf(lvl);
    const w = worldRef.current;
    const m = modeRef.current;
    const t = f.clock;
    ctx.save();
    if (f.shake > 0) {
      const k = (f.shake / 0.35) * 7;
      ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
    }
    drawPaper(ctx);
    drawWalls(ctx, lvl.walls);

    const live = w && m !== "build";
    const targets = live ? w.targets : lvl.targets.map((p) => ({ ...p, hit: false, t: 0 }));
    targets.forEach((tg, i) => drawTarget(ctx, tg.x, tg.y, tg.hit, tg.t, t, i));

    drawDropper(ctx, lvl.start.x, lvl.start.y, !live, t);

    const all = [...fixedList, ...partsRef.current];
    const d = drag.current;
    for (const p of all) {
      if (live) {
        if (p.kind === "bomb") {
          const c = w.circs.find((q) => q.partId === p.id);
          if (!c || !c.alive) continue;
          drawPart(ctx, p, { armed: c.fuse >= 0, time: t });
        } else if (p.kind === "bumper") {
          const c = w.circs.find((q) => q.partId === p.id);
          drawPart(ctx, p, { anim: c?.anim ?? 0, time: t });
        } else if (p.kind === "spring") {
          const s = w.segs.find((q) => q.partId === p.id);
          drawPart(ctx, p, { anim: s?.anim ?? 0, time: t });
        } else if (p.kind === "domino") {
          const dm = w.dominoes.find((q) => q.partId === p.id);
          drawPart(ctx, p, { th: dm?.th ?? 0, time: t });
        } else drawPart(ctx, p, { time: t });
      } else {
        const dragging = d && d.id === p.id && d.moved;
        const shown = dragging ? { ...p, x: d.x, y: d.y } : p;
        drawPart(ctx, shown, { selected: selRef.current === p.id, invalid: dragging ? !d.valid : false, time: t });
      }
    }

    if (live) {
      drawBodies(ctx, w.bodies);
      drawFx(ctx, w.sparks, w.shocks);
    } else {
      // Ghost of the part about to be placed.
      const tool = toolRef.current;
      const ptr = pointer.current;
      if (tool !== "select" && ptr.inside) {
        const cand = candidate(tool, ptr.x, ptr.y, ghostAngle.current[tool], -1);
        drawPart(ctx, cand, { ghost: true, invalid: !isValid(cand), time: t });
      }
    }
    ctx.restore();
  }

  // ── loop ────────────────────────────────────────────────────────────────
  useGameLoop((dt) => {
    const f = fx.current;
    f.clock += dt;
    f.shake = Math.max(0, f.shake - dt);
    const w = worldRef.current;
    const m = modeRef.current;
    if (w && (m === "run" || m === "cleared")) {
      f.acc = Math.min(f.acc + dt, SUBSTEP * 24);
      while (f.acc >= SUBSTEP) {
        f.acc -= SUBSTEP;
        step(w);
      }
      // Sounds.
      for (const ev of w.events) {
        switch (ev.type) {
          case "bounce":
            if (f.clock - f.lastBounce > 0.05) {
              f.lastBounce = f.clock;
              tone({ freq: 140 + Math.min(ev.strength, 1200) * 0.25, duration: 0.06, type: "triangle", volume: Math.min(0.09, 0.02 + ev.strength / 15000) });
            }
            break;
          case "clack":
          case "knock":
            if (f.clock - f.lastClack > 0.035) {
              f.lastClack = f.clock;
              tone({ freq: 700 + Math.random() * 500, duration: 0.03, type: "square", volume: Math.min(0.06, 0.015 + ev.strength / 12000) });
            }
            break;
          case "bumper":
            tone({ freq: 480, to: 960, duration: 0.12, type: "square", volume: 0.06 });
            break;
          case "spring":
            tone({ freq: 180, to: 900, duration: 0.25, type: "triangle", volume: 0.12 });
            break;
          case "boom":
            sfx.boom();
            if (!reducedMotion) f.shake = 0.35;
            break;
          case "star": {
            const notes = [784, 988, 1175, 1397];
            const n = notes[Math.min(notes.length - 1, ev.count - 1)];
            tone({ freq: n, duration: 0.14, type: "triangle", volume: 0.12 });
            tone({ freq: n * 1.5, duration: 0.18, type: "sine", volume: 0.07, delay: 0.07 });
            break;
          }
        }
      }
      w.events.length = 0;
      updateCosmetics(w, dt);
      if (m === "run") {
        if (w.hits !== f.hits) {
          f.hits = w.hits;
          setStarsLit(w.hits);
        }
        if (allTargetsHit(w)) {
          f.clearT += dt;
          if (f.clearT > 0.7) clearLevel();
        } else if (!f.stalled && (w.idle > 1.5 || w.time > MAX_RUN_TIME)) {
          f.stalled = true;
          setStalled(true);
          noise(0.12, 0.03);
        }
      }
    }
    render();
  }, !paused);

  // ── derived HUD values ──────────────────────────────────────────────────
  const remaining = (k: PartKind) => (level.inventory[k] ?? 0) - parts.filter((p) => p.kind === k).length;
  const selectedPart = parts.find((p) => p.id === selectedId) ?? null;
  const canRotate = mode === "build" && ((selectedPart && (selectedPart.kind === "ramp" || selectedPart.kind === "spring")) || tool === "ramp" || tool === "spring");
  const totalScore = bests.reduce((s, b) => s + (b?.score ?? 0), 0);
  const isLast = levelIdx === LEVELS.length - 1;
  const inventoryKinds = KINDS.filter((k) => (level.inventory[k] ?? 0) > 0);

  return (
    <div className="relative flex h-full w-full select-none flex-col" style={{ background: PAPER, color: INK }}>
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-3 px-3 pt-1 sm:px-5">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: BLUE }}>
            Level {String(levelIdx + 1).padStart(2, "0")} / {String(LEVELS.length).padStart(2, "0")}
          </p>
          <h2 className="font-serif text-2xl italic leading-tight sm:text-3xl">{level.name}</h2>
          <p className="hidden max-w-xl text-sm opacity-70 sm:block">{level.hint}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">Score</p>
          <p className="font-display text-2xl font-black tabular-nums leading-tight">{fmt(totalScore)}</p>
          <p className="font-mono text-xs tabular-nums" style={{ color: RED }}>
            ★ {mode === "build" ? 0 : starsLit}/{level.targets.length}
          </p>
        </div>
      </div>

      {/* Stage */}
      <div className="relative min-h-0 flex-1 px-2 py-1 sm:px-4">
        <FitCanvas
          ref={fitRef}
          width={WORLD_W}
          height={WORLD_H}
          className={`rounded-lg ${mode === "build" ? (tool === "select" ? "cursor-default" : "cursor-crosshair") : "cursor-wait"}`}
          style={{ boxShadow: `0 0 0 2px ${INK}, 6px 7px 0 0 ${INK}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => {
            if (!drag.current) pointer.current.inside = false;
          }}
          onContextMenu={(e) => e.preventDefault()}
          onWheel={(e) => {
            if (!paused) rotate(e.deltaY > 0 ? 1 : -1);
          }}
          aria-label="Chain Reaction machine. Place parts, then run."
        />

        {mode === "run" && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2">
            <div
              className="animate-pop whitespace-nowrap rounded-full px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider shadow"
              style={stalled ? { background: INK, color: PAPER } : { background: PAPER, border: `2px solid ${INK}` }}
            >
              {stalled ? "The machine stopped — Space to reset & tweak" : "Running… Space to reset"}
            </div>
          </div>
        )}

        {mode === "cleared" && result && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
            <div className="w-full max-w-sm animate-pop rounded-3xl p-6 shadow-2xl" style={{ background: INK, color: PAPER }}>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">Level {levelIdx + 1} cleared</p>
              <p className="mt-1 font-display text-4xl font-black leading-none" style={{ color: RED }}>
                +{fmt(result.total)}
              </p>
              {result.best && (
                <p className="mt-2 inline-block rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ background: PAPER, color: INK }}>
                  Best for this level
                </p>
              )}
              <dl className="mt-4 space-y-1 font-mono text-sm">
                <div className="flex justify-between">
                  <dt className="opacity-70">Machine works</dt>
                  <dd>{fmt(BASE_POINTS)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="opacity-70">Unused parts ×{result.unused}</dt>
                  <dd>{fmt(result.bonus)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="opacity-70">First-try bonus</dt>
                  <dd>{result.clean ? fmt(result.clean) : "—"}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className="btn flex-1 py-2" onClick={resetRun} style={{ color: PAPER }}>
                  <RotateCcw size={16} /> Retry
                </button>
                {isLast ? (
                  <button type="button" autoFocus className="btn flex-1 py-2" onClick={finishRun} style={{ background: RED, color: INK, borderColor: RED }}>
                    <Flag size={16} /> Finish run
                  </button>
                ) : (
                  <button type="button" autoFocus className="btn flex-1 py-2" onClick={() => goToLevel(levelIdx + 1)} style={{ background: RED, color: INK, borderColor: RED }}>
                    Next level <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="shrink-0 px-2 pb-2 pt-1 sm:px-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
          <button
            type="button"
            onClick={() => {
              setTool("select");
              sfx.click();
            }}
            disabled={mode !== "build"}
            aria-pressed={tool === "select"}
            title="Select & move parts"
            className="flex h-11 shrink-0 items-center gap-1 rounded-xl px-2.5 text-sm font-semibold transition disabled:opacity-40"
            style={{ border: `2px solid ${INK}`, background: tool === "select" && mode === "build" ? "rgba(46,107,255,0.14)" : "transparent" }}
          >
            <MousePointer2 size={16} />
          </button>
          {inventoryKinds.map((k) => {
            const left = remaining(k);
            const active = tool === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => pickTool(k)}
                disabled={mode !== "build" || left <= 0}
                aria-pressed={active}
                title={`${KIND_LABEL[k]} (${KINDS.indexOf(k) + 1}) — ${KIND_TIP[k]}`}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl pl-1.5 pr-2.5 text-sm font-semibold transition disabled:opacity-40"
                style={{
                  border: `2px solid ${active ? BLUE : INK}`,
                  background: active ? "rgba(46,107,255,0.14)" : "transparent",
                  boxShadow: active ? `0 3px 0 0 ${BLUE}` : `0 3px 0 0 ${INK}`,
                }}
              >
                <PartIcon kind={k} />
                <span>{KIND_LABEL[k]}</span>
                <span className="rounded-md px-1 font-mono text-xs tabular-nums" style={{ background: left > 0 ? INK : "transparent", color: left > 0 ? PAPER : INK }}>
                  ×{left}
                </span>
              </button>
            );
          })}
          <span className="mx-1 h-8 w-px shrink-0" style={{ background: "rgba(27,27,27,0.2)" }} />
          <button type="button" onClick={() => rotate(-1)} disabled={!canRotate} title="Rotate left (wheel)" aria-label="Rotate left" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-30" style={{ border: `2px solid ${INK}` }}>
            <RotateCcw size={17} />
          </button>
          <button type="button" onClick={() => rotate(1)} disabled={!canRotate} title="Rotate right (R)" aria-label="Rotate right" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-30" style={{ border: `2px solid ${INK}` }}>
            <RotateCw size={17} />
          </button>
          <button
            type="button"
            onClick={() => selectedId !== null && removePart(selectedId)}
            disabled={mode !== "build" || !selectedPart}
            title="Remove selected (Delete / right-click)"
            aria-label="Remove selected part"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-30"
            style={{ border: `2px solid ${INK}` }}
          >
            <Trash2 size={17} />
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
            <button
              type="button"
              onClick={toggleRun}
              disabled={mode === "cleared"}
              className="flex h-11 items-center gap-2 rounded-full px-5 font-display text-base font-extrabold transition hover:-translate-y-0.5 disabled:opacity-40"
              style={{ background: mode === "build" ? RED : INK, color: mode === "build" ? INK : PAPER, border: `2px solid ${INK}`, boxShadow: `0 4px 0 0 ${INK}` }}
            >
              {mode === "build" ? <Play size={16} fill="currentColor" /> : <Square size={14} fill="currentColor" />}
              {mode === "build" ? "Run" : "Reset"}
              <span className="hidden font-mono text-[10px] opacity-60 sm:inline">SPACE</span>
            </button>
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">Levels</span>
          {LEVELS.map((l, i) => {
            const open = i <= unlocked;
            const done = !!bests[i];
            const current = i === levelIdx;
            return (
              <button
                key={l.id}
                type="button"
                disabled={!open || mode === "run" || current}
                onClick={() => goToLevel(i)}
                title={open ? `${l.name}${bests[i] ? ` — best ${fmt(bests[i]!.score)}` : ""}` : "Locked"}
                className="h-7 w-7 rounded-full font-mono text-xs font-bold transition disabled:cursor-default"
                style={{
                  background: current ? INK : done ? RED : "transparent",
                  color: current ? PAPER : INK,
                  border: `1.5px ${open ? "solid" : "dashed"} ${INK}`,
                  opacity: open ? 1 : 0.35,
                }}
              >
                {i + 1}
              </button>
            );
          })}
          <button type="button" onClick={finishRun} className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition hover:bg-black/5" style={{ border: `1.5px solid ${INK}` }}>
            <Flag size={13} /> End run
          </button>
        </div>
      </div>
    </div>
  );
}

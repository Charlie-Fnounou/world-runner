"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { GameProps } from "@/lib/types";
import { useGameLoop } from "@/lib/loop";
import { useKeys } from "@/lib/input";
import { clamp, randomSeed } from "@/lib/random";
import { sfx, tone } from "@/lib/sound";
import { OBJECTS } from "./objects";
import { FONTS } from "./draw";
import { REVEAL_HOLD, REVEAL_SECONDS, RULER_W, START_Z, pxPerDecade, render, rulerWidth, type Phase, type Sim } from "./render";
import {
  CHECKPOINTS,
  FOCUS_Z,
  Z_MAX,
  Z_MIN,
  formatLength,
  gateZ,
  guessOptions,
  nearestObject,
  pointsFor,
  pow10Label,
  trueExponent,
} from "./scale";

const C = { bg: "#0b0d1f", ink: "#eef0ff", accent: "#9b7bff", accent2: "#5ef2d6" };
interface UI {
  phase: Phase;
  focus: number;
  cp: number; // checkpoint index (into CHECKPOINTS) the card refers to
  options: number[];
  chosen: number | null;
  score: number;
  perfect: number;
  errors: number[];
  lastGain: number;
  moved: boolean;
}

export default function ImpossibleScale({ paused, reducedMotion, onFinish }: GameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seed] = useState(() => randomSeed());
  const keys = useKeys(!paused);
  const posRef = useRef(new Float64Array(OBJECTS.length));
  const finishedRef = useRef(false);
  const simRef = useRef<Sim>({
    z: START_Z,
    target: START_Z,
    vel: 0,
    t: 0,
    w: 800,
    h: 600,
    dpr: 1,
    phase: "explore",
    next: 0,
    reveal: OBJECTS.map(() => 0),
    revealTimer: 0,
    doneTimer: 0,
    hold: 0,
    maxZ: START_Z,
    focus: 0,
    pointers: new Map(),
    pinchDist: 0,
    dragMode: "none",
    dragMoved: 0,
    dragStartY: 0,
    lastMoveT: 0,
    pausedRef: false,
  });
  const [ui, setUi] = useState<UI>({ phase: "explore", focus: 0, cp: 0, options: [], chosen: null, score: 0, perfect: 0, errors: [], lastGain: 0, moved: false });
  const uiRef = useRef(ui);
  const commitUi = useCallback((patch: Partial<UI>) => {
    uiRef.current = { ...uiRef.current, ...patch };
    setUi(uiRef.current);
  }, []);

  useEffect(() => {
    simRef.current.pausedRef = paused;
    if (paused) {
      simRef.current.hold = 0;
      simRef.current.pointers.clear();
      simRef.current.dragMode = "none";
    }
  }, [paused]);

  // Resolve fonts for canvas text.
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const d = cs.getPropertyValue("--font-bricolage").trim();
    const m = cs.getPropertyValue("--font-jetbrains").trim();
    if (d) FONTS.display = `${d}, ui-sans-serif, sans-serif`;
    if (m) FONTS.mono = `${m}, ui-monospace, monospace`;
  }, []);

  // Canvas sizing (full-bleed, DPR-crisp).
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      const s = simRef.current;
      s.w = Math.max(1, r.width);
      s.h = Math.max(1, r.height);
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(s.w * s.dpr);
      canvas.height = Math.round(s.h * s.dpr);
      canvas.style.width = `${s.w}px`;
      canvas.style.height = `${s.h}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const allowedMax = () => {
    const s = simRef.current;
    return s.next < CHECKPOINTS.length ? gateZ(CHECKPOINTS[s.next]) : Z_MAX;
  };

  const canZoom = () => simRef.current.phase === "explore" && !simRef.current.pausedRef;

  const nudge = useCallback((dz: number) => {
    const s = simRef.current;
    if (s.phase !== "explore" || s.pausedRef) return;
    s.target = clamp(s.target + dz, Z_MIN, Z_MAX);
  }, []);

  // Wheel + trackpad pinch (ctrlKey). Needs a non-passive listener to preventDefault.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = simRef.current;
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 16;
      else if (e.deltaMode === 2) d *= s.h;
      d = clamp(d, -240, 240);
      nudge(d * (e.ctrlKey ? 0.012 : 0.0028));
      s.vel = 0;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [nudge]);

  const onPointerDown = (e: React.PointerEvent) => {
    const s = simRef.current;
    if (s.pausedRef) return;
    if ((e.target as HTMLElement).closest("[data-ui]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    s.pointers.set(e.pointerId, { x, y });
    s.vel = 0;
    if (s.pointers.size === 2) {
      const [a, b] = [...s.pointers.values()];
      s.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      s.dragMode = "canvas";
    } else if (s.pointers.size === 1) {
      s.dragMode = x > s.w - rulerWidth(s.w) ? "ruler" : "canvas";
      s.dragMoved = 0;
      s.dragStartY = y;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = simRef.current;
    const p = s.pointers.get(e.pointerId);
    if (!p || s.pausedRef) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dy = y - p.y;
    p.x = x;
    p.y = y;
    if (s.pointers.size >= 2) {
      const [a, b] = [...s.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (s.pinchDist > 0 && d > 0) nudge(-Math.log10(d / s.pinchDist) * 1.6);
      s.pinchDist = d;
      return;
    }
    s.dragMoved += Math.abs(dy);
    const dz = s.dragMode === "ruler" ? -dy / pxPerDecade(s.h) : (-dy / s.h) * 3.2;
    nudge(dz);
    // fling velocity (orders per second), smoothed
    const now = performance.now();
    const dt = Math.max(0.008, (now - s.lastMoveT) / 1000);
    s.lastMoveT = now;
    if (canZoom()) s.vel = s.vel * 0.6 + (dz / dt) * 0.4;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const s = simRef.current;
    const p = s.pointers.get(e.pointerId);
    s.pointers.delete(e.pointerId);
    if (!p) return;
    if (s.dragMode === "ruler" && s.dragMoved < 6 && s.pointers.size === 0) {
      // tap on the ruler: jump to that magnitude
      nudge((s.h / 2 - p.y) / pxPerDecade(s.h));
      s.vel = 0;
    }
    if (performance.now() - s.lastMoveT > 90) s.vel = 0;
    s.vel = clamp(s.vel, -6, 6);
    if (s.pointers.size === 0) s.dragMode = "none";
    if (s.pointers.size === 1) {
      const [only] = [...s.pointers.values()];
      s.dragStartY = only.y;
    }
    s.pinchDist = 0;
  };

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const u = uiRef.current;
    const s = simRef.current;
    const avgErr = u.errors.length ? u.errors.reduce((a, b) => a + b, 0) / u.errors.length : 0;
    const max = CHECKPOINTS.length * 100;
    const headline = u.score >= max * 0.85 ? "Cosmic intuition." : u.score >= max * 0.55 ? "A fine sense of scale." : u.score >= max * 0.3 ? "Scale is slippery." : "The universe is weird.";
    onFinish({
      headline,
      subline: `You zoomed from ${OBJECTS[0].name.toLowerCase()} to the edge of everything.`,
      score: u.score,
      scoreLabel: `${u.score} pts`,
      stats: [
        { label: "Checkpoints", value: `${u.errors.length}/${CHECKPOINTS.length}` },
        { label: "Perfect guesses", value: String(u.perfect) },
        { label: "Orders travelled", value: String(Math.round(s.maxZ - START_Z)) },
        { label: "Avg miss", value: `${avgErr.toFixed(1)} orders` },
      ],
    });
  }, [onFinish]);

  const answer = useCallback(
    (optIndex: number) => {
      const s = simRef.current;
      const u = uiRef.current;
      if (s.phase !== "guess" || s.pausedRef) return;
      const obj = CHECKPOINTS[s.next];
      const chosenExp = u.options[optIndex];
      if (chosenExp === undefined) return;
      const diff = Math.abs(chosenExp - trueExponent(obj));
      const gain = pointsFor(diff);
      if (diff === 0) sfx.good();
      else if (gain > 0) tone({ freq: 620, duration: 0.14, type: "triangle", volume: 0.1 });
      else sfx.bad();
      tone({ freq: 220, to: 880, duration: 1.2, type: "sine", volume: 0.05, delay: 0.15 });
      s.phase = "reveal";
      s.revealTimer = 0;
      s.target = FOCUS_Z[obj];
      s.vel = 0;
      commitUi({
        phase: "reveal",
        chosen: optIndex,
        score: u.score + gain,
        perfect: u.perfect + (diff === 0 ? 1 : 0),
        errors: [...u.errors, diff],
        lastGain: gain,
      });
    },
    [commitUi],
  );

  // Answer keys 1–4.
  useEffect(() => {
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const map: Record<string, number> = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
      if (e.code in map && simRef.current.phase === "guess") {
        e.preventDefault();
        answer(map[e.code]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, answer]);

  useGameLoop((dt) => {
    const s = simRef.current;
    const k = keys.current;
    s.t += dt;

    // ---- input
    if (s.phase === "explore") {
      let dir = s.hold;
      if (k.down.has("ArrowUp") || k.down.has("KeyW")) dir += 1;
      if (k.down.has("ArrowDown") || k.down.has("KeyS")) dir -= 1;
      if (dir) s.target = clamp(s.target + dir * 1.7 * dt, Z_MIN, Z_MAX);
      if (s.pointers.size === 0 && Math.abs(s.vel) > 0.01) {
        s.target = clamp(s.target + s.vel * dt, Z_MIN, Z_MAX);
        s.vel *= Math.exp(-3.2 * dt);
      }
    }
    k.consume();

    const hi = s.phase === "explore" || s.phase === "guess" ? allowedMax() : Z_MAX;
    if (s.target > hi) {
      s.target = hi;
      s.vel = 0;
    }
    const ease = s.phase === "reveal" ? 3.2 : 9;
    s.z += (s.target - s.z) * (1 - Math.exp(-ease * dt));
    s.maxZ = Math.max(s.maxZ, s.z);
    if (!uiRef.current.moved && Math.abs(s.z - START_Z) > 0.6) commitUi({ moved: true });

    // ---- flow
    if (s.phase === "explore" && s.next < CHECKPOINTS.length && s.z >= hi - 0.03) {
      s.phase = "guess";
      s.vel = 0;
      s.hold = 0;
      tone({ freq: 880, duration: 0.08, type: "triangle", volume: 0.08 });
      tone({ freq: 660, duration: 0.12, type: "triangle", volume: 0.08, delay: 0.08 });
      commitUi({ phase: "guess", cp: s.next, options: guessOptions(CHECKPOINTS[s.next], seed), chosen: null });
    } else if (s.phase === "reveal") {
      const obj = CHECKPOINTS[s.next];
      s.reveal[obj] = Math.min(1, s.reveal[obj] + dt / REVEAL_SECONDS);
      s.revealTimer += dt;
      if (s.revealTimer >= REVEAL_SECONDS + REVEAL_HOLD + (reducedMotion ? 0 : 0.4)) {
        s.next += 1;
        if (s.next >= CHECKPOINTS.length) {
          s.phase = "done";
          s.doneTimer = 0;
          sfx.win();
          commitUi({ phase: "done" });
        } else {
          s.phase = "explore";
          commitUi({ phase: "explore", chosen: null });
        }
      }
    } else if (s.phase === "done") {
      s.doneTimer += dt;
      if (s.doneTimer > 3) finish();
    }

    // ---- focus card
    const visible = (i: number) => !OBJECTS[i].teaser || s.reveal[i] > 0.3;
    const near = nearestObject(s.z, visible);
    const focus = near.dist < 0.7 ? near.i : -1;
    if (focus !== s.focus) {
      s.focus = focus;
      commitUi({ focus });
    }

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) render(ctx, s, posRef.current, reducedMotion);
  }, !paused);

  const cpObj = CHECKPOINTS[ui.cp];
  const focusObj = ui.focus >= 0 ? OBJECTS[ui.focus] : null;
  const showCard = ui.phase === "guess" || ui.phase === "reveal";
  const correctExp = cpObj !== undefined ? trueExponent(cpObj) : 0;

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overflow-hidden select-none"
      style={{ background: C.bg, color: C.ink, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* Focus card */}
      <div className="pointer-events-none absolute top-3 left-3 max-w-[min(360px,calc(100%-110px))] sm:top-4 sm:left-4">
        {focusObj && (
          <div key={focusObj.id} className="animate-rise rounded-2xl p-3 sm:p-4" style={{ background: "rgba(11,13,31,0.72)", backdropFilter: "blur(6px)", border: "1px solid rgba(155,123,255,0.35)" }}>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: C.accent2 }}>
              {formatLength(focusObj.size)} · ≈ {pow10Label(Math.round(Math.log10(focusObj.size)))}
              {focusObj.real && (
                <span className="rounded-full px-1.5 py-px text-[9px]" style={{ background: C.accent, color: C.bg }}>
                  real
                </span>
              )}
            </div>
            <div className="mt-1 font-display text-lg leading-tight font-extrabold sm:text-xl">{focusObj.name}</div>
            <p className="mt-1 hidden font-serif text-[15px] leading-snug italic opacity-80 sm:block">{focusObj.blurb}</p>
          </div>
        )}
      </div>

      {/* Score */}
      <div className="pointer-events-none absolute top-3 text-right sm:top-4" style={{ right: RULER_W + 8 }}>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-60">Score</div>
        <div className="font-display text-2xl leading-none font-black tabular-nums" style={{ color: C.accent }}>
          {ui.score}
        </div>
        <div className="mt-1 flex justify-end gap-1">
          {CHECKPOINTS.map((_, i) => (
            <span key={i} className="block h-1.5 w-1.5 rotate-45" style={{ background: i < ui.errors.length ? C.accent2 : "rgba(238,240,255,0.2)" }} />
          ))}
        </div>
      </div>

      {/* Hint */}
      {!ui.moved && ui.phase === "explore" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-6 sm:bottom-24">
          <div className="animate-pop rounded-full px-4 py-2 text-center text-sm" style={{ background: "rgba(155,123,255,0.18)", border: "1px solid rgba(155,123,255,0.4)" }}>
            Zoom out: scroll, pinch, drag up, or hold <span className="kbd">↑</span>
          </div>
        </div>
      )}

      {/* Zoom buttons */}
      {ui.phase === "explore" && (
        <div data-ui className="absolute bottom-12 flex flex-col gap-2 sm:bottom-14" style={{ right: RULER_W + 8 }}>
          {[
            { dir: 1, label: "Zoom out", icon: <ZoomOut size={20} /> },
            { dir: -1, label: "Zoom in", icon: <ZoomIn size={20} /> },
          ].map((b) => (
            <button
              key={b.dir}
              type="button"
              aria-label={b.label}
              title={b.label}
              className="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90"
              style={{ background: "rgba(238,240,255,0.1)", border: "1px solid rgba(238,240,255,0.25)" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                if (!simRef.current.pausedRef) simRef.current.hold = b.dir;
              }}
              onPointerUp={() => (simRef.current.hold = 0)}
              onPointerCancel={() => (simRef.current.hold = 0)}
              onLostPointerCapture={() => (simRef.current.hold = 0)}
            >
              {b.icon}
            </button>
          ))}
        </div>
      )}

      {/* Guess card */}
      {showCard && cpObj !== undefined && (
        <div data-ui className="absolute inset-x-0 bottom-0 flex justify-center p-3 sm:p-5" style={{ paddingRight: 66 }} onPointerDown={(e) => e.stopPropagation()}>
          <div className="w-full max-w-xl animate-rise rounded-3xl p-4 shadow-2xl sm:p-5" style={{ background: C.ink, color: C.bg }}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-60">
                Checkpoint {ui.cp + 1} of {CHECKPOINTS.length}
              </span>
              {ui.phase === "reveal" && (
                <span className="animate-pop font-display text-lg font-black" style={{ color: ui.lastGain >= 100 ? "#1fae94" : ui.lastGain > 0 ? C.accent : "#e5484d" }}>
                  {ui.lastGain > 0 ? `+${ui.lastGain} pts` : "0 pts"}
                </span>
              )}
            </div>
            <h2 className="mt-1 font-display text-xl leading-tight font-black sm:text-2xl">
              {ui.phase === "guess" ? <>How big is {OBJECTS[cpObj].name.replace(/^(A|An|The) /, (m) => m.toLowerCase())}?</> : OBJECTS[cpObj].name}
            </h2>
            <p className="mt-1 font-serif text-base leading-snug italic opacity-75">
              {ui.phase === "guess" ? OBJECTS[cpObj].teaser : `${formatLength(OBJECTS[cpObj].size)} — ${OBJECTS[cpObj].blurb}`}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ui.options.map((e, i) => {
                const right = e === correctExp;
                const chosen = ui.chosen === i;
                const revealed = ui.phase === "reveal";
                const bg = revealed ? (right ? C.accent2 : chosen ? "#ffd6d8" : "transparent") : "transparent";
                return (
                  <button
                    key={e}
                    type="button"
                    disabled={revealed}
                    onClick={() => answer(i)}
                    className="relative flex flex-col items-start rounded-2xl border-2 px-3 py-2 text-left transition enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5"
                    style={{ borderColor: revealed && !right && !chosen ? "rgba(11,13,31,0.15)" : C.bg, background: bg, opacity: revealed && !right && !chosen ? 0.45 : 1 }}
                  >
                    <span className="absolute top-1.5 right-2 font-mono text-[10px] opacity-50">{i + 1}</span>
                    <span className="font-display text-lg leading-tight font-black">≈ {formatLength(10 ** e)}</span>
                    <span className="font-mono text-[11px] opacity-60">{pow10Label(e)}</span>
                  </button>
                );
              })}
            </div>
            {ui.phase === "guess" && <p className="mt-2 text-center font-mono text-[10px] opacity-50">Closer guesses score more · 100 / 60 / 25 · keys 1–4</p>}
          </div>
        </div>
      )}

      {/* Finale */}
      {ui.phase === "done" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="animate-pop text-center">
            <div className="font-mono text-xs tracking-[0.3em] uppercase" style={{ color: C.accent2 }}>
              {Math.round(Z_MAX - START_Z)} orders of magnitude later
            </div>
            <div className="mt-2 font-display text-4xl font-black sm:text-6xl">The edge of everything.</div>
          </div>
        </div>
      )}
    </div>
  );
}

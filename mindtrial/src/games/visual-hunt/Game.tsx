"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameProps } from "@/lib/types";
import { useGameLoop } from "@/lib/loop";
import { randomSeed } from "@/lib/random";
import { sfx, tone } from "@/lib/sound";
import { Glyph } from "./Glyph";
import { LOW_TIME, MAX_TIME, START_TIME, WRONG_PENALTY, findBonus, fmtSec, headlineFor } from "./logic";
import { THEMES, capacity, layout, makeStage, themeOrder, type Stage } from "./scene";

const BG = "#fdf0f3";
const INK = "#2a0a14";
const ACCENT = "#e8175d";
const TEAL = "#00a88f";

type Phase = "hunt" | "found" | "timeout" | "done";
interface Pop {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  until: number;
}
interface Mark {
  i: number;
  nonce: number;
  until: number;
}

const FOUND_PAUSE = 0.75;
const TIMEOUT_PAUSE = 2.4;

export default function VisualHunt({ paused, reducedMotion, onFinish }: GameProps) {
  const [runSeed] = useState(() => randomSeed());
  const order = useMemo(() => themeOrder(runSeed), [runSeed]);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [phase, setPhase] = useState<Phase>("hunt");
  const [cleared, setCleared] = useState(0);
  const [pops, setPops] = useState<Pop[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);

  const areaRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const boxRef = useRef<{ w: number; h: number } | null>(null);
  const phaseRef = useRef<Phase>("hunt");
  const phaseT = useRef(0);
  const pool = useRef(START_TIME);
  const stageT = useRef(0);
  const clock = useRef(0);
  const findTimes = useRef<number[]>([]);
  const wrongClicks = useRef(0);
  const clearedRef = useRef(0);
  const finished = useRef(false);
  const lastTick = useRef(-1);
  const nonce = useRef(0);
  const popsRef = useRef<Pop[]>([]);
  const marksRef = useRef<Mark[]>([]);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    phaseT.current = 0;
    setPhase(p);
  }, []);

  const buildStage = useCallback(
    (num: number) => {
      const b = boxRef.current ?? { w: 600, h: 400 };
      const st = makeStage(num, order[(num - 1) % order.length], (runSeed + num * 7919) >>> 0, capacity(b.w, b.h));
      stageRef.current = st;
      stageT.current = 0;
      marksRef.current = [];
      setMarks([]);
      setStage(st);
    },
    [order, runSeed],
  );

  // Measure the play area; the first stage is built once we know how much room there is.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return;
      const b = { w: r.width, h: r.height };
      boxRef.current = b;
      setBox(b);
      if (!stageRef.current) buildStage(1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [buildStage]);

  const addPop = useCallback((x: number, y: number, text: string, color: string) => {
    nonce.current += 1;
    popsRef.current = [...popsRef.current, { id: nonce.current, x, y, text, color, until: clock.current + 0.9 }];
    setPops(popsRef.current);
  }, []);

  const cells = useMemo(() => (stage && box ? layout(stage, box.w, box.h) : []), [stage, box]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    go("done");
    const n = clearedRef.current;
    const ft = findTimes.current;
    const avg = ft.length ? ft.reduce((a, b) => a + b, 0) / ft.length : 0;
    onFinish({
      headline: headlineFor(n),
      subline:
        n > 0
          ? `You cleared ${n} scene${n === 1 ? "" : "s"}; the last one hid among ${stageRef.current?.items.length ?? 0} lookalikes.`
          : "The odd one slipped past. Look for the outlier in shape, colour, then details.",
      score: n,
      scoreLabel: `Stage ${n}`,
      stats: [
        { label: "Avg find time", value: ft.length ? fmtSec(avg) : "—" },
        { label: "Fastest find", value: ft.length ? fmtSec(Math.min(...ft)) : "—" },
        { label: "Wrong clicks", value: String(wrongClicks.current) },
        { label: "Items in last scene", value: String(stageRef.current?.items.length ?? 0) },
      ],
    });
  }, [go, onFinish]);

  const pick = useCallback(
    (i: number) => {
      const st = stageRef.current;
      if (pausedRef.current || phaseRef.current !== "hunt" || !st) return;
      const c = cells[i];
      if (i === st.odd) {
        const t = stageT.current;
        findTimes.current.push(t);
        const bonus = findBonus(st.items.length, t);
        pool.current = Math.min(MAX_TIME, pool.current + bonus);
        if (c) addPop(c.cx, c.cy - c.size / 2, `+${bonus.toFixed(1)}s`, TEAL);
        clearedRef.current += 1;
        setCleared(clearedRef.current);
        sfx.good();
        go("found");
      } else {
        wrongClicks.current += 1;
        pool.current = Math.max(0, pool.current - WRONG_PENALTY);
        nonce.current += 1;
        marksRef.current = [...marksRef.current.filter((m) => m.i !== i), { i, nonce: nonce.current, until: clock.current + 0.5 }];
        setMarks(marksRef.current);
        if (c) addPop(c.cx, c.cy - c.size / 2, `−${WRONG_PENALTY}s`, ACCENT);
        sfx.bad();
      }
    },
    [cells, addPop, go],
  );

  useGameLoop((dt) => {
    clock.current += dt;
    phaseT.current += dt;
    const ph = phaseRef.current;
    if (ph === "hunt" && stageRef.current) {
      pool.current -= dt;
      stageT.current += dt;
      if (pool.current < LOW_TIME) {
        const sec = Math.ceil(pool.current);
        if (sec !== lastTick.current) {
          lastTick.current = sec;
          if (pool.current > 0) sfx.tick();
        }
      }
      if (pool.current <= 0) {
        pool.current = 0;
        tone({ freq: 330, to: 90, duration: 0.6, type: "sawtooth", volume: 0.09 });
        go("timeout");
      }
    } else if (ph === "found" && phaseT.current >= FOUND_PAUSE) {
      lastTick.current = -1;
      buildStage(clearedRef.current + 1);
      go("hunt");
    } else if (ph === "timeout" && phaseT.current >= TIMEOUT_PAUSE) {
      finish();
    }

    // Paint the time bar directly (no React render per frame).
    const frac = Math.max(0, Math.min(1, pool.current / MAX_TIME));
    const low = pool.current < LOW_TIME;
    if (barRef.current) {
      barRef.current.style.transform = `scaleX(${frac})`;
      barRef.current.style.background = low ? ACCENT : TEAL;
    }
    if (timeRef.current) {
      timeRef.current.textContent = pool.current.toFixed(1);
      timeRef.current.style.color = low ? ACCENT : INK;
    }

    if (popsRef.current.some((p) => p.until <= clock.current)) {
      popsRef.current = popsRef.current.filter((p) => p.until > clock.current);
      setPops(popsRef.current);
    }
    if (marksRef.current.some((m) => m.until <= clock.current)) {
      marksRef.current = marksRef.current.filter((m) => m.until > clock.current);
      setMarks(marksRef.current);
    }
  }, !paused);

  const stageNum = cleared + (phase === "found" ? 0 : 1);
  const odd = stage ? cells[stage.odd] : undefined;
  const themeLabel = stage ? THEMES[stage.theme].label : "";

  return (
    <div className="relative flex h-full w-full touch-manipulation select-none flex-col overflow-hidden" style={{ background: BG, color: INK }}>
      <style>{CSS}</style>

      {/* HUD */}
      <div className="relative z-10 px-3 pt-2 sm:px-6 sm:pt-3">
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">Stage</div>
              <div className="font-display text-3xl font-black leading-none tabular-nums sm:text-4xl" style={{ color: ACCENT }}>
                {stageNum}
              </div>
            </div>
            {stage && (
              <span
                className="mb-0.5 rounded-full border-2 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider"
                style={{ borderColor: INK }}
              >
                {themeLabel} · {stage.items.length}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">Time</div>
            <div className="font-display text-3xl font-black leading-none tabular-nums sm:text-4xl">
              <span ref={timeRef}>{START_TIME.toFixed(1)}</span>
              <span className="text-base opacity-60">s</span>
            </div>
          </div>
        </div>
        <div className="relative mt-2 h-3.5 overflow-hidden rounded-full border-2" style={{ borderColor: INK, background: "#fff" }}>
          <div ref={barRef} className="absolute inset-0 origin-left" style={{ background: TEAL, transform: `scaleX(${START_TIME / MAX_TIME})` }} />
        </div>
        <p className="mt-1.5 text-center font-serif text-lg italic leading-tight sm:text-xl">
          {phase === "found" ? (
            <span style={{ color: TEAL }}>Found it!</span>
          ) : phase === "timeout" || phase === "done" ? (
            <span style={{ color: ACCENT }}>Time! It was right there.</span>
          ) : (
            "Find the one that's different."
          )}
        </p>
      </div>

      {/* Play area */}
      <div className="relative z-0 m-2 min-h-0 flex-1 rounded-[24px] border-2 sm:m-4" style={{ borderColor: INK, background: "#fff9fb" }}>
        <div ref={areaRef} className="absolute inset-2 sm:inset-3">
          {stage &&
            cells.map((c, i) => {
              const look = stage.items[i].look;
              const mark = marks.find((m) => m.i === i);
              const dim = (phase === "timeout" || phase === "done" || phase === "found") && i !== stage.odd;
              return (
                <button
                  key={`${stage.stage}-${i}`}
                  type="button"
                  tabIndex={-1}
                  aria-label={`Item ${i + 1}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    pick(i);
                  }}
                  className="absolute cursor-pointer outline-none"
                  style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
                >
                  <div
                    className={`absolute ${reducedMotion ? "" : "vh-in"}`}
                    style={{
                      left: c.cx - c.x - c.size / 2,
                      top: c.cy - c.y - c.size / 2,
                      width: c.size,
                      height: c.size,
                      opacity: dim ? 0.3 : 1,
                      transition: "opacity .3s",
                      animationDelay: `${Math.min(0.25, i * 0.006)}s`,
                    }}
                  >
                    <div key={mark ? mark.nonce : 0} className={`h-full w-full ${mark && !reducedMotion ? "vh-shake" : ""}`}>
                      <svg viewBox="-50 -50 100 100" className="h-full w-full overflow-visible">
                        <Glyph look={look} />
                        {mark && <circle r="52" fill="none" stroke={ACCENT} strokeWidth="5" strokeDasharray="8 6" />}
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}

          {/* Reveal ring */}
          {odd && (phase === "found" || phase === "timeout" || phase === "done") && (
            <div
              className="pointer-events-none absolute"
              style={{ left: odd.cx - odd.size * 0.72, top: odd.cy - odd.size * 0.72, width: odd.size * 1.44, height: odd.size * 1.44 }}
            >
              <div
                className={`h-full w-full rounded-full ${reducedMotion ? "" : phase === "found" ? "vh-ring" : "vh-pulse"}`}
                style={{
                  border: `${Math.max(3, odd.size * 0.07)}px solid ${phase === "found" ? TEAL : ACCENT}`,
                  boxShadow: `0 0 0 ${Math.max(3, odd.size * 0.06)}px ${phase === "found" ? TEAL : ACCENT}33`,
                }}
              />
            </div>
          )}

          {pops.map((p) => (
            <div
              key={p.id}
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-full font-display text-xl font-black ${reducedMotion ? "" : "vh-pop"}`}
              style={{ left: p.x, top: p.y, color: p.color, textShadow: "0 2px 0 #fff, 0 -2px 0 #fff, 2px 0 0 #fff, -2px 0 0 #fff" }}
            >
              {p.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CSS = `
@keyframes vh-shake { 0%,100% { transform: translateX(0) rotate(0) } 20% { transform: translateX(-12%) rotate(-6deg) } 40% { transform: translateX(10%) rotate(5deg) } 60% { transform: translateX(-7%) rotate(-3deg) } 80% { transform: translateX(4%) } }
.vh-shake { animation: vh-shake .4s ease-in-out; }
@keyframes vh-in { from { transform: scale(.4); opacity: 0 } to { transform: scale(1); opacity: 1 } }
.vh-in { animation: vh-in .28s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes vh-ring { from { transform: scale(1.8); opacity: 0 } to { transform: scale(1); opacity: 1 } }
.vh-ring { animation: vh-ring .35s cubic-bezier(.2,1.3,.4,1) both; }
@keyframes vh-pulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.15); opacity: .55 } }
.vh-pulse { animation: vh-pulse .8s ease-in-out infinite; }
@keyframes vh-pop { from { transform: translate(-50%, -60%); opacity: 1 } to { transform: translate(-50%, -220%); opacity: 0 } }
.vh-pop { animation: vh-pop .9s ease-out both; }
`;

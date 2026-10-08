"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types";
import { useGameLoop } from "@/lib/loop";
import { randomSeed, rng } from "@/lib/random";
import { sfx, tone } from "@/lib/sound";
import {
  fmtTime,
  headlineFor,
  isGrowLevel,
  lengthFor,
  numpadLabel,
  numpadTile,
  planLevel,
  tileColor,
  tileFreq,
  type EventKind,
  type LevelPlan,
} from "./logic";

const BG = "#120d24";
const INK = "#efe8ff";
const MINT = "#7cf7c9";
const PINK = "#ff6bd6";
const WRONG = "#ff5470";

type Phase = "brief" | "banner" | "show" | "input" | "success" | "fail" | "done";
type Lit = { tile: number; kind: EventKind | "tap" | "wrong" | "answer"; n?: number };
type Brief = { title: string; body: string; kind: "decoy" | "reverse" };

const ANSWER_DELAY = 0.9;
const ANSWER_STEP = 0.42;
const ANSWER_ON = 0.32;

function playTile(i: number, size: number, volume = 0.14) {
  const f = tileFreq(i, size);
  tone({ freq: f, duration: 0.32, type: "sine", volume });
  tone({ freq: f * 2, duration: 0.18, type: "triangle", volume: volume * 0.25 });
}

function playDecoy() {
  tone({ freq: 311, to: 160, duration: 0.3, type: "sawtooth", volume: 0.05 });
  tone({ freq: 220, to: 113, duration: 0.3, type: "square", volume: 0.03 });
}

function bannerFor(plan: LevelPlan): { title: string; sub: string; dur: number; tone: "normal" | "reverse" | "decoy" | "grow" } {
  const title = `Level ${plan.level}`;
  if (plan.reverse && plan.decoys > 0)
    return { title, sub: `Reverse it — and ignore ${plan.decoys} pink imp${plan.decoys > 1 ? "s" : ""}`, dur: 2.1, tone: "reverse" };
  if (plan.reverse) return { title, sub: "Reverse! Tap it backwards", dur: 1.8, tone: "reverse" };
  if (plan.decoys > 0)
    return { title, sub: `Watch out: ${plan.decoys} pink imp${plan.decoys > 1 ? "s" : ""} hiding`, dur: 1.6, tone: "decoy" };
  if (isGrowLevel(plan.level)) return { title, sub: `The grid grows to ${plan.size}×${plan.size}`, dur: 1.7, tone: "grow" };
  return { title, sub: `${plan.seq.length} ghosts to remember`, dur: 1.05, tone: "normal" };
}

export default function GhostMemory({ paused, reducedMotion, onFinish }: GameProps) {
  const [rand] = useState(() => rng(randomSeed()));
  const [plan, setPlan] = useState<LevelPlan>(() => planLevel(1, [], 3, rand));
  const [phase, setPhase] = useState<Phase>("banner");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [showLit, setShowLit] = useState<Lit | null>(null);
  const [flashes, setFlashes] = useState<(Lit & { until: number })[]>([]);
  const [progress, setProgress] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [failInfo, setFailInfo] = useState<{ wrong: number; expected: number } | null>(null);

  const planRef = useRef(plan);
  const phaseRef = useRef<Phase>("banner");
  const phaseT = useRef(0);
  const clock = useRef(0);
  const nextEv = useRef(0);
  const litKey = useRef("");
  const progressRef = useRef(0);
  const flashesRef = useRef<(Lit & { until: number })[]>([]);
  const pausedRef = useRef(paused);
  const seen = useRef({ decoy: false, reverse: false });
  const taps = useRef(0);
  const finished = useRef(false);
  const cursorRef = useRef<number | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    phaseT.current = 0;
    setPhase(p);
  }, []);

  const addFlash = useCallback((l: Lit, dur: number) => {
    flashesRef.current = [...flashesRef.current.filter((f) => f.tile !== l.tile), { ...l, until: clock.current + dur }];
    setFlashes(flashesRef.current);
  }, []);

  const startLevel = useCallback(
    (p: LevelPlan) => {
      planRef.current = p;
      setPlan(p);
      progressRef.current = 0;
      setProgress(0);
      nextEv.current = 0;
      litKey.current = "";
      setShowLit(null);
      if (cursorRef.current !== null && cursorRef.current >= p.size * p.size) {
        cursorRef.current = Math.floor((p.size * p.size) / 2);
        setCursor(cursorRef.current);
      }
      if (p.decoys > 0 && !seen.current.decoy) {
        seen.current.decoy = true;
        setBrief({
          kind: "decoy",
          title: "Beware the pink imps",
          body: "From now on a pink, horned imp may pop up between the ghosts. It is a decoy: do NOT tap it. Only repeat the glowing ghosts.",
        });
        go("brief");
      } else if (p.reverse && !seen.current.reverse) {
        seen.current.reverse = true;
        setBrief({
          kind: "reverse",
          title: "Reverse levels",
          body: "When the REVERSE banner shows, watch the sequence as usual, then tap it backwards: last ghost first, first ghost last.",
        });
        go("brief");
      } else {
        go("banner");
        tone({ freq: 392, to: 523, duration: 0.25, type: "triangle", volume: 0.08 });
      }
    },
    [go],
  );

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    go("done");
    const p = planRef.current;
    const completed = p.level - 1;
    onFinish({
      headline: headlineFor(completed),
      subline:
        completed > 0
          ? `You repeated a ${lengthFor(completed)}-step sequence before the ghosts caught you.`
          : "Every ghost hunter starts somewhere. Try again!",
      score: completed,
      scoreLabel: `Level ${completed}`,
      stats: [
        { label: "Longest sequence", value: completed > 0 ? `${lengthFor(completed)} steps` : "—" },
        { label: "Total taps", value: String(taps.current) },
        { label: "Time", value: fmtTime(clock.current) },
        { label: "Grid reached", value: `${p.size}×${p.size}` },
      ],
    });
  }, [go, onFinish]);

  const tap = useCallback(
    (i: number) => {
      if (pausedRef.current || phaseRef.current !== "input") return;
      const p = planRef.current;
      if (i < 0 || i >= p.size * p.size) return;
      taps.current += 1;
      const want = p.expected[progressRef.current];
      if (i === want) {
        playTile(i, p.size);
        addFlash({ tile: i, kind: "tap" }, 0.24);
        progressRef.current += 1;
        setProgress(progressRef.current);
        if (progressRef.current >= p.expected.length) {
          go("success");
          sfx.good();
        }
      } else {
        sfx.bad();
        addFlash({ tile: i, kind: "wrong" }, 0.9);
        setFailInfo({ wrong: i, expected: want });
        go("fail");
      }
    },
    [addFlash, go],
  );

  const dismissBrief = useCallback(() => {
    if (pausedRef.current || phaseRef.current !== "brief") return;
    setBrief(null);
    sfx.click();
    go("banner");
  }, [go]);

  useGameLoop((dt) => {
    const ph = phaseRef.current;
    if (ph === "done") return;
    clock.current += dt;
    phaseT.current += dt;
    const p = planRef.current;

    if (ph === "banner") {
      if (phaseT.current >= bannerFor(p).dur) go("show");
    } else if (ph === "show") {
      const t = phaseT.current * 1000;
      while (nextEv.current < p.events.length && p.events[nextEv.current].start <= t) {
        const ev = p.events[nextEv.current];
        if (ev.kind === "step") playTile(ev.tile, p.size);
        else playDecoy();
        nextEv.current += 1;
      }
      const active = p.events.find((e) => e.start <= t && t < e.end);
      const key = active ? `${active.tile}:${active.kind}:${active.start}` : "";
      if (key !== litKey.current) {
        litKey.current = key;
        setShowLit(active ? { tile: active.tile, kind: active.kind } : null);
      }
      if (t >= p.duration) {
        setShowLit(null);
        litKey.current = "";
        go("input");
      }
    } else if (ph === "success") {
      if (phaseT.current >= 0.85) startLevel(planLevel(p.level + 1, p.seq, p.size, rand));
    } else if (ph === "fail") {
      const t = phaseT.current - ANSWER_DELAY;
      const idx = t >= 0 ? Math.floor(t / ANSWER_STEP) : -1;
      const within = idx >= 0 && idx < p.expected.length && t - idx * ANSWER_STEP < ANSWER_ON;
      const key = within ? `a${idx}` : "";
      if (key !== litKey.current) {
        litKey.current = key;
        if (within) {
          playTile(p.expected[idx], p.size, 0.09);
          setShowLit({ tile: p.expected[idx], kind: "answer", n: idx + 1 });
        } else setShowLit(null);
      }
      if (t > p.expected.length * ANSWER_STEP + 1.1) finish();
    }

    if (flashesRef.current.length && flashesRef.current.some((f) => f.until <= clock.current)) {
      flashesRef.current = flashesRef.current.filter((f) => f.until > clock.current);
      setFlashes(flashesRef.current);
    }
  }, !paused);

  // Keyboard: numpad-layout digits for 3×3, arrows + Space/Enter for any grid.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || pausedRef.current) return;
      const ph = phaseRef.current;
      const p = planRef.current;
      if (ph === "brief") {
        if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") {
          e.preventDefault();
          if (!e.repeat) dismissBrief();
        }
        return;
      }
      const moves: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      if (moves[e.code]) {
        e.preventDefault();
        const n = p.size;
        const cur = cursorRef.current ?? Math.floor((n * n) / 2);
        const [dr, dc] = cursorRef.current === null ? [0, 0] : moves[e.code];
        const r = Math.min(n - 1, Math.max(0, Math.floor(cur / n) + dr));
        const c = Math.min(n - 1, Math.max(0, (cur % n) + dc));
        cursorRef.current = r * n + c;
        setCursor(cursorRef.current);
        return;
      }
      if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        if (!e.repeat && cursorRef.current !== null) tap(cursorRef.current);
        return;
      }
      if (p.size === 3) {
        const t = numpadTile(e.code);
        if (t >= 0) {
          e.preventDefault();
          if (!e.repeat) tap(t);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tap, dismissBrief]);

  const cells = plan.size * plan.size;
  const litFor = (i: number): Lit | null => {
    const f = flashes.find((x) => x.tile === i);
    if (f) return f;
    if (showLit && showLit.tile === i) return showLit;
    return null;
  };
  const banner = bannerFor(plan);
  const status =
    phase === "brief"
      ? "A new twist…"
      : phase === "banner"
        ? "Get ready…"
        : phase === "show"
          ? plan.decoys > 0
            ? "Watch the ghosts — skip the imps"
            : "Watch the ghosts…"
          : phase === "input"
            ? plan.reverse
              ? "Your turn — BACKWARDS!"
              : "Your turn!"
            : phase === "success"
              ? "Boo-tiful!"
              : "Wrong ghost! Here's the sequence";

  return (
    <div
      className="relative flex h-full w-full touch-manipulation select-none flex-col overflow-hidden"
      style={{ background: `radial-gradient(120% 90% at 50% 40%, #2a1d55 0%, ${BG} 62%)`, color: INK }}
    >
      <style>{CSS}</style>
      <Sky reducedMotion={reducedMotion} />

      {/* HUD */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">Level</div>
          <div className="font-display text-3xl font-black leading-none" style={{ color: MINT, textShadow: `0 0 18px ${MINT}88` }}>
            {plan.level}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {plan.reverse && <Badge color={MINT}>Reverse</Badge>}
          {plan.decoys > 0 && <Badge color={PINK}>Imps ×{plan.decoys}</Badge>}
          <Badge color={INK}>
            {plan.size}×{plan.size}
          </Badge>
        </div>
      </div>

      <div className="relative z-10 mt-1 px-4 text-center">
        <p
          className="font-display text-lg font-bold sm:text-xl"
          style={{ color: phase === "fail" ? WRONG : phase === "input" && plan.reverse ? MINT : INK }}
        >
          {status}
        </p>
      </div>

      {/* Grid */}
      <div className="relative z-10 min-h-0 flex-1 px-3 py-2 sm:px-6" style={{ containerType: "size" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="grid"
            style={{
              width: "min(100cqw - 1.5rem, 100cqh - 1rem, 640px)",
              height: "min(100cqw - 1.5rem, 100cqh - 1rem, 640px)",
              gridTemplateColumns: `repeat(${plan.size}, minmax(0, 1fr))`,
              gap: plan.size === 3 ? "4%" : plan.size === 4 ? "3%" : "2.4%",
            }}
          >
            {Array.from({ length: cells }, (_, i) => (
              <Tile
                key={`${plan.size}-${i}`}
                index={i}
                size={plan.size}
                lit={litFor(i)}
                interactive={phase === "input"}
                cursor={cursor === i}
                missed={phase === "fail" && failInfo?.expected === i && !showLit}
                reducedMotion={reducedMotion}
                onTap={tap}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="relative z-10 flex min-h-12 flex-wrap items-center justify-center gap-1.5 px-4 pb-4">
        {plan.expected.map((_, i) => {
          const done = i < progress;
          return (
            <span
              key={i}
              className="block h-3 w-3 rounded-full transition-all duration-200 sm:h-3.5 sm:w-3.5"
              style={{
                background: done ? MINT : "transparent",
                border: `2px solid ${done ? MINT : "rgba(239,232,255,0.35)"}`,
                boxShadow: done ? `0 0 10px ${MINT}` : undefined,
                transform: done && !reducedMotion ? "scale(1.15)" : undefined,
              }}
            />
          );
        })}
      </div>

      {phase === "banner" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div
            key={plan.level}
            className={`rounded-3xl px-8 py-5 text-center backdrop-blur-sm ${reducedMotion ? "" : "animate-pop"}`}
            style={{
              background: "rgba(18,13,36,0.78)",
              border: `2px solid ${banner.tone === "reverse" ? MINT : banner.tone === "decoy" ? PINK : "rgba(239,232,255,0.25)"}`,
              boxShadow: `0 0 40px ${banner.tone === "decoy" ? PINK : MINT}44`,
            }}
          >
            <div className="font-display text-5xl font-black sm:text-6xl" style={{ color: MINT, textShadow: `0 0 24px ${MINT}` }}>
              {banner.tone === "reverse" ? "REVERSE" : banner.title}
            </div>
            <div className="mt-1 font-serif text-xl italic sm:text-2xl" style={{ color: banner.tone === "decoy" ? PINK : INK }}>
              {banner.tone === "reverse" ? `${banner.title} · ${banner.sub}` : banner.sub}
            </div>
          </div>
        </div>
      )}

      {phase === "brief" && brief && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div
            className={`w-full max-w-md rounded-3xl p-6 text-center ${reducedMotion ? "" : "animate-pop"}`}
            style={{ background: "#1d1540", border: `2px solid ${brief.kind === "decoy" ? PINK : MINT}`, boxShadow: `0 0 50px ${brief.kind === "decoy" ? PINK : MINT}55` }}
          >
            <div className="mx-auto h-24 w-24">
              {brief.kind === "decoy" ? <GhostSvg kind="decoy" color={PINK} /> : <ReverseIcon />}
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">New twist</p>
            <h3 className="mt-1 font-display text-3xl font-black" style={{ color: brief.kind === "decoy" ? PINK : MINT }}>
              {brief.title}
            </h3>
            <p className="mt-3 text-[15px] leading-snug opacity-90">{brief.body}</p>
            <button
              type="button"
              onClick={dismissBrief}
              className="btn mt-5"
              style={{ background: brief.kind === "decoy" ? PINK : MINT, color: BG, borderColor: brief.kind === "decoy" ? PINK : MINT }}
            >
              Got it
            </button>
            <p className="mt-2 font-mono text-[11px] opacity-50">or press Space</p>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
@keyframes gm-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6%) } }
@keyframes gm-pop { 0% { transform: translateY(18%) scale(.7); opacity: 0 } 60% { transform: translateY(-6%) scale(1.06); opacity: 1 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes gm-shake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-7%) } 75% { transform: translateX(7%) } }
@keyframes gm-drift { from { transform: translateX(-10%) } to { transform: translateX(10%) } }
@keyframes gm-twinkle { 0%,100% { opacity: .2 } 50% { opacity: .9 } }
.gm-pop { animation: gm-pop .26s cubic-bezier(.2,1.3,.4,1) both; }
.gm-shake { animation: gm-shake .25s ease-in-out 2; }
.gm-idle { animation: gm-float 3.2s ease-in-out infinite; }
.gm-drift { animation: gm-drift 14s ease-in-out infinite alternate; }
.gm-twinkle { animation: gm-twinkle 2.6s ease-in-out infinite; }
`;

const STARS = [
  [6, 8], [14, 22], [23, 6], [31, 15], [44, 4], [52, 19], [63, 9], [71, 25], [78, 5], [88, 14], [94, 28], [9, 40],
  [96, 46], [4, 70], [92, 74], [12, 88], [86, 92], [48, 95],
];

function Sky({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {STARS.map(([x, y], i) => (
        <span
          key={i}
          className={`absolute block rounded-full ${reducedMotion ? "" : "gm-twinkle"}`}
          style={{ left: `${x}%`, top: `${y}%`, width: i % 3 ? 2 : 3, height: i % 3 ? 2 : 3, background: INK, animationDelay: `${(i * 0.37) % 2.6}s`, opacity: 0.5 }}
        />
      ))}
      <div
        className="absolute rounded-full"
        style={{ right: "6%", top: "7%", width: "11vmin", height: "11vmin", background: "#fff7d6", boxShadow: "0 0 60px #fff7d688", opacity: 0.85 }}
      />
      <div
        className="absolute rounded-full"
        style={{ right: "4.4%", top: "5.6%", width: "9vmin", height: "9vmin", background: "#2a1d55", opacity: 0.9 }}
      />
      <div
        className={`absolute -bottom-[10%] left-[-20%] h-[35%] w-[140%] rounded-[50%] ${reducedMotion ? "" : "gm-drift"}`}
        style={{ background: `radial-gradient(closest-side, ${MINT}1f, transparent)` }}
      />
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider"
      style={{ borderColor: color, color, boxShadow: `0 0 10px ${color}44` }}
    >
      {children}
    </span>
  );
}

function Tile({
  index,
  size,
  lit,
  interactive,
  cursor,
  missed,
  reducedMotion,
  onTap,
}: {
  index: number;
  size: number;
  lit: Lit | null;
  interactive: boolean;
  cursor: boolean;
  missed: boolean;
  reducedMotion: boolean;
  onTap: (i: number) => void;
}) {
  const color = lit?.kind === "decoy" ? PINK : lit?.kind === "wrong" ? WRONG : tileColor(index);
  const on = !!lit;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={size === 3 ? `Tile ${numpadLabel(index)}` : `Tile ${index + 1}`}
      onPointerDown={(e) => {
        e.preventDefault();
        onTap(index);
      }}
      className={`relative aspect-square overflow-visible rounded-[22%] outline-none transition-[background,box-shadow,transform] duration-150 ${interactive ? "cursor-pointer active:scale-95" : "cursor-default"} ${lit?.kind === "wrong" && !reducedMotion ? "gm-shake" : ""}`}
      style={{
        background: on
          ? `radial-gradient(circle at 50% 45%, ${color}55, ${color}18 70%)`
          : interactive
            ? "rgba(239,232,255,0.075)"
            : "rgba(239,232,255,0.045)",
        boxShadow: on
          ? `0 0 0 2px ${color}, 0 0 28px ${color}99, inset 0 0 24px ${color}44`
          : cursor
            ? `0 0 0 2px ${MINT}`
            : missed
              ? `0 0 0 2px ${MINT}aa`
              : "inset 0 0 0 1.5px rgba(239,232,255,0.12)",
      }}
    >
      <div className="absolute inset-[12%]">
        {on ? (
          <div key={`${lit.kind}-${lit.n ?? 0}`} className={`h-full w-full ${reducedMotion ? "" : "gm-pop"}`} style={{ filter: `drop-shadow(0 0 10px ${color})` }}>
            <GhostSvg kind={lit.kind === "decoy" ? "decoy" : lit.kind === "wrong" ? "wrong" : "awake"} color={color} />
          </div>
        ) : (
          <div className={`h-full w-full ${reducedMotion ? "" : "gm-idle"}`} style={{ opacity: interactive ? 0.32 : 0.18, animationDelay: `${(index * 0.29) % 3.2}s` }}>
            <GhostSvg kind="sleep" color={INK} />
          </div>
        )}
      </div>
      {lit?.kind === "answer" && lit.n !== undefined && (
        <span
          className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-black"
          style={{ background: MINT, color: BG, boxShadow: `0 0 12px ${MINT}` }}
        >
          {lit.n}
        </span>
      )}
      {size === 3 && (
        <span className="absolute bottom-[6%] right-[9%] hidden font-mono text-[11px] opacity-30 sm:block">{numpadLabel(index)}</span>
      )}
    </button>
  );
}

function GhostSvg({ kind, color }: { kind: "sleep" | "awake" | "decoy" | "wrong"; color: string }) {
  const body = "M18 90 V48 a32 32 0 0 1 64 0 V90 l-10.7 -9 l-10.7 9 l-10.6 -9 l-10.7 9 l-10.6 -9 Z";
  if (kind === "decoy") {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <path d="M24 30 L18 6 L38 22 Z M76 30 L82 6 L62 22 Z" fill={color} stroke={BG} strokeWidth="3" strokeLinejoin="round" />
        <path d="M18 92 V50 a32 32 0 0 1 64 0 V92 l-8 -12 l-8 12 l-8 -12 l-8 12 l-8 -12 l-8 12 l-8 -12 Z" fill={color} stroke={BG} strokeWidth="3" strokeLinejoin="round" />
        <path d="M30 40 L45 47 M70 40 L55 47" stroke={BG} strokeWidth="5" strokeLinecap="round" />
        <circle cx="39" cy="54" r="5" fill={BG} />
        <circle cx="61" cy="54" r="5" fill={BG} />
        <path d="M38 70 L44 65 L50 70 L56 65 L62 70" stroke={BG} strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "sleep") {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <path d={body} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
        <path d="M34 52 q6 5 12 0 M54 52 q6 5 12 0" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  const wrong = kind === "wrong";
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <path d={body} fill={color} stroke={BG} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="35" cy="34" rx="7" ry="4" fill="#fff" opacity="0.45" transform="rotate(-25 35 34)" />
      {wrong ? (
        <path d="M33 45 l10 10 M43 45 l-10 10 M57 45 l10 10 M67 45 l-10 10" stroke={BG} strokeWidth="5" strokeLinecap="round" />
      ) : (
        <>
          <ellipse cx="39" cy="51" rx="6" ry="8" fill={BG} />
          <ellipse cx="61" cy="51" rx="6" ry="8" fill={BG} />
          <circle cx="41" cy="48" r="2.2" fill="#fff" />
          <circle cx="63" cy="48" r="2.2" fill="#fff" />
          <circle cx="29" cy="63" r="5" fill={PINK} opacity="0.55" />
          <circle cx="71" cy="63" r="5" fill={PINK} opacity="0.55" />
        </>
      )}
      {wrong ? (
        <path d="M40 72 q10 -8 20 0" stroke={BG} strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <ellipse cx="50" cy="67" rx="5" ry="6" fill={BG} />
      )}
    </svg>
  );
}

function ReverseIcon() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" style={{ filter: `drop-shadow(0 0 10px ${MINT})` }}>
      <path d="M78 38 A30 30 0 1 0 80 62" fill="none" stroke={MINT} strokeWidth="8" strokeLinecap="round" />
      <path d="M66 26 L80 38 L62 46" fill="none" stroke={MINT} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <text x="50" y="58" textAnchor="middle" fontSize="18" fontWeight="900" fill={INK} fontFamily="var(--font-mono)">
        3·2·1
      </text>
    </svg>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types";
import { useGameLoop } from "@/lib/loop";
import { rng, randomSeed } from "@/lib/random";
import { sfx, tone } from "@/lib/sound";
import { GlyphView } from "./Glyph";
import {
  TOTAL_QUESTIONS,
  familyFor,
  generatePuzzle,
  levelFor,
  timeLimitFor,
  type Family,
  type Item,
  type Puzzle,
} from "./puzzles";

const C = { bg: "#eaf2ff", ink: "#0a1a3a", accent: "#2457ff", accent2: "#ff8a00", bad: "#e5322d" };
const LIVES = 3;
const FEEDBACK_SECONDS = 3.2;

type Phase = "question" | "feedback";

interface Run {
  q: number;
  puzzle: Puzzle;
  lives: number;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  answered: number;
  totalTime: number;
  phase: Phase;
  chosen: number | null; // -1 = timeout
  gain: number;
  bonus: number;
}

const FAMILY_LABEL: Record<Family, string> = {
  number: "Number sequence",
  shape: "Shape sequence",
  matrix: "Matrix",
};

const FAMILY_PROMPT: Record<Family, string> = {
  number: "What comes next?",
  shape: "Which shape comes next?",
  matrix: "Which tile completes the grid?",
};

export default function PatternBreaker({ paused, reducedMotion, onFinish }: GameProps) {
  const [gen] = useState(() => {
    const r = rng(randomSeed());
    return { r, history: [] as Family[] };
  });
  const [run, setRun] = useState<Run>(() => {
    const fam = familyFor(0, 1, gen.r, gen.history);
    gen.history.push(fam);
    return {
      q: 0,
      puzzle: generatePuzzle(fam, 1, gen.r),
      lives: LIVES,
      score: 0,
      streak: 0,
      bestStreak: 0,
      correct: 0,
      answered: 0,
      totalTime: 0,
      phase: "question",
      chosen: null,
      gain: 0,
      bonus: 0,
    };
  });
  const [secs, setSecs] = useState(() => Math.ceil(timeLimitFor(1)));
  const [shake, setShake] = useState(0);

  const elapsedRef = useRef(0);
  const feedbackRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const runRef = useRef(run);
  const finishedRef = useRef(false);

  /** Update the ref immediately (the rAF loop reads it) and schedule a render. */
  const commit = useCallback((next: Run) => {
    runRef.current = next;
    setRun(next);
  }, []);

  const level = levelFor(run.q);

  const finish = useCallback(
    (r: Run) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const won = r.lives > 0;
      const acc = r.answered ? Math.round((r.correct / r.answered) * 100) : 0;
      onFinish({
        headline: won ? "Pattern master." : `Broken at level ${levelFor(r.q)}.`,
        subline: won
          ? `All ${TOTAL_QUESTIONS} rules cracked with ${r.lives} ${r.lives === 1 ? "life" : "lives"} to spare.`
          : `You solved ${r.correct} of ${r.answered} puzzles before the patterns won.`,
        score: r.score,
        scoreLabel: `${r.score.toLocaleString("en")} pts`,
        stats: [
          { label: "Solved", value: `${r.correct}/${r.answered}` },
          { label: "Accuracy", value: `${acc}%` },
          { label: "Best streak", value: String(r.bestStreak) },
          { label: "Avg time", value: r.answered ? `${(r.totalTime / r.answered).toFixed(1)} s` : "—" },
          { label: "Level", value: String(levelFor(r.q)) },
        ],
      });
    },
    [onFinish],
  );

  const answer = useCallback(
    (choice: number) => {
      const r = runRef.current;
      if (r.phase !== "question" || finishedRef.current) return;
      const lv = levelFor(r.q);
      const lim = timeLimitFor(lv);
      const t = Math.min(elapsedRef.current, lim);
      const ok = choice === r.puzzle.answer;
      const remaining = Math.max(0, lim - t);
      const bonus = ok ? Math.round((remaining / lim) * 60 * lv) : 0;
      const gain = ok ? 100 * lv + bonus : 0;
      feedbackRef.current = 0;
      if (ok) {
        sfx.good();
        if (r.streak + 1 >= 3) tone({ freq: 1320, duration: 0.1, type: "triangle", delay: 0.2, volume: 0.08 });
      } else {
        sfx.bad();
        setShake((s) => s + 1);
      }
      const streak = ok ? r.streak + 1 : 0;
      commit({
        ...r,
        phase: "feedback",
        chosen: choice,
        gain,
        bonus,
        score: r.score + gain,
        lives: ok ? r.lives : r.lives - 1,
        streak,
        bestStreak: Math.max(r.bestStreak, streak),
        correct: r.correct + (ok ? 1 : 0),
        answered: r.answered + 1,
        totalTime: r.totalTime + t,
      });
    },
    [commit],
  );

  const advance = useCallback(() => {
    const r = runRef.current;
    if (r.phase !== "feedback" || finishedRef.current) return;
    if (r.lives <= 0 || r.q + 1 >= TOTAL_QUESTIONS) {
      if (r.lives > 0) sfx.win();
      finish(r);
      return;
    }
    const q = r.q + 1;
    const lv = levelFor(q);
    const fam = familyFor(q, lv, gen.r, gen.history);
    gen.history.push(fam);
    elapsedRef.current = 0;
    setSecs(Math.ceil(timeLimitFor(lv)));
    if (lv > levelFor(r.q)) tone({ freq: 520, to: 1040, duration: 0.25, type: "triangle", volume: 0.08 });
    commit({ ...r, q, puzzle: generatePuzzle(fam, lv, gen.r), phase: "question", chosen: null, gain: 0, bonus: 0 });
  }, [finish, gen, commit]);

  useGameLoop((dt) => {
    const r = runRef.current;
    if (finishedRef.current) return;
    if (r.phase === "question") {
      const lim = timeLimitFor(levelFor(r.q));
      const before = elapsedRef.current;
      elapsedRef.current = before + dt;
      const left = Math.max(0, lim - elapsedRef.current);
      if (barRef.current) barRef.current.style.transform = `scaleX(${left / lim})`;
      const s = Math.ceil(left);
      if (s !== Math.ceil(Math.max(0, lim - before))) {
        setSecs(s);
        if (s <= 3 && s > 0) sfx.tick();
      }
      if (left <= 0) answer(-1);
    } else {
      feedbackRef.current += dt;
      if (feedbackRef.current >= FEEDBACK_SECONDS) advance();
    }
  }, !paused);

  // Keyboard: 1–4 to choose, Space / Enter to continue.
  useEffect(() => {
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const map: Record<string, number> = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
      if (e.code in map) {
        e.preventDefault();
        answer(map[e.code]);
      } else if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, answer, advance]);

  const { puzzle, phase, chosen } = run;
  const timedOut = phase === "feedback" && chosen === -1;
  const wasRight = phase === "feedback" && chosen === puzzle.answer;
  const urgent = phase === "question" && secs <= 3;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden select-none" style={{ background: C.bg, color: C.ink }}>
      {/* Swiss poster backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-[8vmin] -bottom-[14vmin] font-display font-black leading-none opacity-[0.06]" style={{ fontSize: "62vmin" }}>
          {String(level).padStart(2, "0")}
        </div>
        <div className="absolute top-0 bottom-0 left-[8%] w-px" style={{ background: C.ink, opacity: 0.08 }} />
        <div className="absolute top-0 bottom-0 right-[8%] w-px" style={{ background: C.ink, opacity: 0.08 }} />
        <div className="absolute -left-[10vmin] top-[30%] h-[22vmin] w-[22vmin] rounded-full" style={{ background: C.accent2, opacity: 0.16 }} />
      </div>

      {/* HUD */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-end justify-between gap-3 px-4 pt-2 sm:px-6 sm:pt-3">
        <div className="flex items-end gap-3 sm:gap-5">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-60">Level</div>
            <div className="font-display text-3xl leading-none font-black sm:text-4xl" style={{ color: C.accent }}>
              {String(level).padStart(2, "0")}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-60">Puzzle</div>
            <div className="font-display text-xl leading-none font-bold tabular-nums sm:text-2xl">
              {run.q + 1}
              <span className="opacity-40">/{TOTAL_QUESTIONS}</span>
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-60">Lives</div>
            <div className="mt-1 flex gap-1" aria-label={`${run.lives} lives`}>
              {Array.from({ length: LIVES }, (_, i) => (
                <span
                  key={i}
                  className="block h-4 w-4 transition-all duration-300 sm:h-5 sm:w-5"
                  style={{
                    background: i < run.lives ? C.accent2 : "transparent",
                    border: `2px solid ${i < run.lives ? C.accent2 : C.ink}`,
                    opacity: i < run.lives ? 1 : 0.25,
                    transform: i < run.lives ? "none" : "scale(0.7) rotate(45deg)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-60">
            Score{run.streak >= 2 && <span style={{ color: C.accent2 }}> · streak {run.streak}</span>}
          </div>
          <div className="font-display text-3xl leading-none font-black tabular-nums sm:text-4xl">{run.score.toLocaleString("en")}</div>
        </div>
      </div>

      {/* Timer */}
      <div className="relative z-10 mx-auto mt-2 flex w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <div className="relative h-2.5 flex-1 overflow-hidden" style={{ background: "rgba(10,26,58,0.1)" }}>
          <div
            ref={barRef}
            className="absolute inset-0 origin-left"
            style={{ background: urgent ? C.accent2 : C.accent, transform: phase === "feedback" ? "scaleX(0)" : undefined }}
          />
        </div>
        <div className="w-10 text-right font-mono text-sm font-bold tabular-nums" style={{ color: urgent ? C.accent2 : C.ink }}>
          {phase === "question" ? `${secs}s` : "—"}
        </div>
      </div>

      {/* Puzzle */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-3 py-3 sm:gap-5 sm:px-6">
        <div className="text-center">
          <div className="font-mono text-[11px] tracking-[0.3em] uppercase" style={{ color: C.accent }}>
            {FAMILY_LABEL[puzzle.family]}
          </div>
          <h2 className="font-display text-xl font-black tracking-tight sm:text-3xl">{FAMILY_PROMPT[puzzle.family]}</h2>
        </div>

        <div
          key={`${run.q}-${shake}`}
          className={!reducedMotion && phase === "feedback" && !wasRight ? "pb-shake" : "animate-rise"}
        >
          {puzzle.family === "matrix" ? (
            <MatrixView puzzle={puzzle} reveal={phase === "feedback"} />
          ) : (
            <SequenceView puzzle={puzzle} reveal={phase === "feedback"} />
          )}
        </div>

        {/* Options */}
        <div className="grid w-full max-w-3xl grid-cols-4 gap-2 sm:gap-4">
          {puzzle.options.map((opt, i) => {
            const isAns = i === puzzle.answer;
            const isChosen = i === chosen;
            let bg = "#ffffff";
            let border = C.ink;
            let fg = C.ink;
            let opacity = 1;
            if (phase === "feedback") {
              if (isAns) {
                bg = C.accent;
                border = C.accent;
                fg = "#ffffff";
              } else if (isChosen) {
                bg = "#ffffff";
                border = C.bad;
                fg = C.bad;
              } else opacity = 0.35;
            }
            return (
              <button
                key={`${run.q}-${i}`}
                type="button"
                disabled={phase !== "question"}
                onClick={() => answer(i)}
                className="group relative flex aspect-square flex-col items-center justify-center border-[3px] transition-all duration-200 enabled:hover:-translate-y-1 enabled:active:translate-y-0.5"
                style={{
                  background: bg,
                  borderColor: border,
                  color: fg,
                  opacity,
                  boxShadow: phase === "question" ? `0 5px 0 0 ${C.ink}` : isAns ? `0 5px 0 0 ${C.ink}` : "none",
                  maxHeight: "min(22vh, 180px)",
                  justifySelf: "center",
                  width: "100%",
                  maxWidth: "min(22vh, 180px)",
                }}
              >
                <span
                  className="absolute top-1 left-1.5 font-mono text-[10px] font-bold sm:top-1.5 sm:left-2 sm:text-xs"
                  style={{ color: phase === "feedback" && isAns ? "#fff" : C.accent2 }}
                >
                  {i + 1}
                </span>
                <OptionFace item={opt} light={phase === "feedback" && isAns} />
                {phase === "feedback" && isChosen && !isAns && (
                  <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                    <line x1="12" y1="88" x2="88" y2="12" stroke={C.bad} strokeWidth="5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        <div className="flex min-h-[86px] w-full max-w-3xl items-start justify-center">
          {phase === "feedback" ? (
            <div className="animate-pop flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <div
                className="shrink-0 px-3 py-2 text-center font-display text-lg font-black tracking-tight sm:text-xl"
                style={{ background: wasRight ? C.accent : C.bad, color: "#fff" }}
              >
                {wasRight ? `+${run.gain}` : timedOut ? "Time!" : "Nope"}
                {wasRight && run.bonus > 0 && <span className="ml-2 font-mono text-xs font-normal opacity-80">incl. {run.bonus} speed</span>}
              </div>
              <p className="flex-1 border-l-4 py-1 pl-3 text-sm leading-snug sm:text-base" style={{ borderColor: C.accent2 }}>
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-60">The rule · </span>
                {puzzle.rule}
              </p>
              <button type="button" onClick={advance} className="btn shrink-0 py-2! text-sm" style={{ background: C.ink, color: C.bg, borderColor: C.ink }}>
                {run.lives <= 0 || run.q + 1 >= TOTAL_QUESTIONS ? "Finish" : "Next"} <span className="kbd hidden sm:inline-flex">Space</span>
              </button>
            </div>
          ) : (
            <p className="pt-2 font-mono text-[11px] tracking-[0.2em] uppercase opacity-50">
              Tap an answer · keys <span className="kbd">1</span>–<span className="kbd">4</span>
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pb-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(9px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(3px)} }
        .pb-shake { animation: pb-shake 0.42s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}

function numFontSize(v: number, base: number) {
  const len = String(v).length;
  return len <= 2 ? base : len === 3 ? base * 0.8 : len === 4 ? base * 0.64 : base * 0.52;
}

function OptionFace({ item, light }: { item: Item; light: boolean }) {
  if (item.t === "num") {
    return (
      <span className="font-display font-black tabular-nums leading-none" style={{ fontSize: `clamp(18px, ${numFontSize(item.v, 6)}vmin, ${numFontSize(item.v, 64)}px)` }}>
        {item.v}
      </span>
    );
  }
  return <GlyphView g={item.g} className="h-[82%] w-[82%]" bg={light ? C.accent : "#ffffff"} />;
}

function SequenceView({ puzzle, reveal }: { puzzle: Puzzle; reveal: boolean }) {
  const ans = puzzle.options[puzzle.answer];
  const n = puzzle.items.length + 1;
  const tile = `min(${Math.floor(88 / n)}vw, 15vh, 104px)`;
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {puzzle.items.map((it, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center border-2 bg-white" style={{ width: tile, height: tile, borderColor: C.ink }}>
            <TileFace item={it} n={n} />
          </div>
          <span className="font-mono text-[9px] opacity-40">{i + 1}</span>
        </div>
      ))}
      <div className="flex flex-col items-center gap-1">
        <div
          className="flex items-center justify-center border-[3px] transition-colors duration-300"
          style={{
            width: tile,
            height: tile,
            borderColor: reveal ? C.accent : C.accent2,
            borderStyle: reveal ? "solid" : "dashed",
            background: reveal ? "#fff" : "rgba(255,138,0,0.08)",
          }}
        >
          {reveal ? (
            <div className="animate-pop flex h-full w-full items-center justify-center">
              <TileFace item={ans} n={n} />
            </div>
          ) : (
            <span className="font-display text-3xl font-black sm:text-5xl" style={{ color: C.accent2 }}>
              ?
            </span>
          )}
        </div>
        <span className="font-mono text-[9px] opacity-40">{n}</span>
      </div>
    </div>
  );
}

function TileFace({ item, n }: { item: Item; n: number }) {
  if (item.t === "num") {
    const base = Math.min(88 / n, 15) * 0.42;
    return (
      <span className="font-display font-black tabular-nums leading-none" style={{ fontSize: `min(${numFontSize(item.v, base)}vw, ${numFontSize(item.v, 6.5)}vh, ${numFontSize(item.v, 44)}px)` }}>
        {item.v}
      </span>
    );
  }
  return <GlyphView g={item.g} className="h-[86%] w-[86%]" bg="#ffffff" />;
}

function MatrixView({ puzzle, reveal }: { puzzle: Puzzle; reveal: boolean }) {
  const ans = puzzle.options[puzzle.answer];
  const cell = "min(19vw, 12.5vh, 112px)";
  return (
    <div className="grid grid-cols-3 border-[3px]" style={{ borderColor: C.ink, background: C.ink, gap: 3 }}>
      {[...puzzle.items, null].map((it, i) => (
        <div key={i} className="flex items-center justify-center" style={{ width: cell, height: cell, background: it ? "#fff" : reveal ? "#fff" : "#fff3e6" }}>
          {it ? (
            <TileFace item={it} n={4} />
          ) : reveal ? (
            <div className="animate-pop flex h-full w-full items-center justify-center" style={{ outline: `3px solid ${C.accent}`, outlineOffset: -6 }}>
              <TileFace item={ans} n={4} />
            </div>
          ) : (
            <span className="font-display text-4xl font-black" style={{ color: C.accent2 }}>
              ?
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

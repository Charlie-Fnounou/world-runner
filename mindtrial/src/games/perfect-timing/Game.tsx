"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameProps, PlayerConfig } from "@/lib/types";
import { useGameLoop } from "@/lib/loop";
import { randomSeed } from "@/lib/random";
import { sfx, tone } from "@/lib/sound";
import {
  CAP_MS,
  READY_S,
  ROUNDS,
  clockVisibility,
  fmtClock,
  fmtInt,
  fmtSigned,
  makeTargets,
  outcome,
  placementsFromTotals,
  rate,
  rulerPos,
  soloHeadline,
  type RoundOutcome,
} from "./logic";

const BG = "#fff3d6";
const INK = "#1a1300";
const ACCENT = "#ff3d7f";

type Phase = "ready" | "running" | "reveal" | "done";

/** Seconds a reveal must be on screen before a key/tap may advance (so a late double-press can't skip it). */
const REVEAL_LOCK_S = 0.8;
/** Party / multiplayer: the reveal auto-advances after this many seconds. */
const MULTI_AUTO_S = 9;

const TIER_COLORS = [ACCENT, "#ff7a2f", "#d39b00", "#8a7a55", "#6b6250"];

function cueOf(t: number) {
  return t < 0.8 ? 0 : t < 1.6 ? 1 : 2;
}

/**
 * PAUSE POLICY: precise timing uses performance.now() / event.timeStamp, so
 * the rAF loop being stopped does not freeze the clock by itself. Pausing in
 * the middle of a running round would also wreck the player's internal count,
 * so the fairest option is to void the round: when the game is paused while
 * the clock is running, the round is aborted and restarts from "Ready" (same
 * target, everyone's stops cleared) as soon as play resumes. The lead-in and
 * reveal phases are driven by the loop's dt and simply freeze while paused.
 */
export default function PerfectTiming({ players, paused, reducedMotion, onFinish }: GameProps) {
  const multi = players.length > 1;

  const [targets] = useState(() => makeTargets(randomSeed()));
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [cue, setCue] = useState(0);
  const [locked, setLocked] = useState<boolean[]>(() => players.map(() => false));
  const [history, setHistory] = useState<RoundOutcome[][]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [canAdvance, setCanAdvance] = useState(false);
  const [autoLeft, setAutoLeft] = useState(MULTI_AUTO_S);

  const phaseRef = useRef<Phase>("ready");
  const roundRef = useRef(0);
  const readyT = useRef(0);
  const revealT = useRef(0);
  const startAt = useRef(0);
  const stops = useRef<(number | null)[]>([]);
  const pausedRef = useRef(paused);
  const interrupted = useRef(false);
  const finished = useRef(false);
  const historyRef = useRef<RoundOutcome[][]>([]);
  const clockEl = useRef<HTMLSpanElement>(null);
  const hintEl = useRef<HTMLDivElement>(null);

  // Clicking "Start" leaves focus on whatever was last focused; make sure Space
  // never activates a shell button behind our back.
  useEffect(() => {
    const a = document.activeElement as HTMLElement | null;
    if (a && a !== document.body) a.blur();
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused && phaseRef.current === "running") interrupted.current = true;
  }, [paused]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    phaseRef.current = "done";
    setPhase("done");
    const hist = historyRef.current;
    const totals = players.map((_, i) => hist.reduce((s, r) => s + r[i].error, 0));
    if (!multi) {
      const errs = hist.map((r) => r[0].error);
      const best = Math.min(...errs);
      const bestIdx = errs.indexOf(best);
      const late = hist.filter((r) => (r[0].signed ?? 1) > 0).length;
      onFinish({
        headline: soloHeadline(totals[0]),
        subline: `Best stop: ${rate(best).word.toLowerCase()} (${fmtInt(best)} ms in round ${bestIdx + 1}).`,
        score: Math.round(totals[0]),
        scoreLabel: `${fmtInt(totals[0])} ms`,
        stats: [
          { label: "Best round", value: `${fmtInt(best)} ms · R${bestIdx + 1}` },
          { label: "Average error", value: `${fmtInt(totals[0] / ROUNDS)} ms` },
          { label: "Rounds", value: errs.map((e) => fmtInt(e)).join(" / ") },
          { label: "Tendency", value: `${late} late · ${ROUNDS - late} early` },
        ],
      });
      return;
    }
    const placements = placementsFromTotals(totals);
    const winners = players.filter((_, i) => placements[i] === 0);
    let closest = { err: Infinity, who: "" };
    hist.forEach((r) =>
      r.forEach((o, i) => {
        if (o.signed !== null && o.error < closest.err) closest = { err: o.error, who: players[i].name };
      }),
    );
    onFinish({
      headline:
        winners.length === 1 ? `${winners[0].name} wins!` : `${winners.map((w) => w.name).join(" & ")} tie!`,
      subline: `Lowest total error over ${ROUNDS} rounds takes it.`,
      placements,
      stats: [
        ...players.map((p, i) => ({ label: p.name, value: `${fmtInt(totals[i])} ms` })),
        ...(closest.who ? [{ label: "Closest stop", value: `${closest.who} · ${fmtInt(closest.err)} ms` }] : []),
      ],
    });
  }, [players, multi, onFinish]);

  const closeRound = useCallback(() => {
    if (phaseRef.current !== "running") return;
    const target = targets[roundRef.current];
    const res = stops.current.map((s) => outcome(s, target));
    historyRef.current = [...historyRef.current, res];
    setHistory(historyRef.current);
    phaseRef.current = "reveal";
    revealT.current = 0;
    setCanAdvance(false);
    setAutoLeft(MULTI_AUTO_S);
    setPhase("reveal");
    const best = Math.min(...res.map((r) => r.error));
    const tier = rate(best).tier;
    if (tier === 0) sfx.win();
    else if (tier <= 1) sfx.good();
    else if (tier === 2) tone({ freq: 520, to: 620, duration: 0.18, type: "triangle" });
    else sfx.bad();
  }, [targets]);

  const stopPlayer = useCallback(
    (i: number, ts: number) => {
      if (phaseRef.current !== "running" || pausedRef.current || interrupted.current) return;
      if (stops.current[i] !== null) return;
      const now = performance.now();
      // Event timestamps share performance.now()'s time origin in modern browsers;
      // fall back to "now" if a browser reports something odd.
      const at = ts > 0 && Math.abs(now - ts) < 1000 ? ts : now;
      const elapsed = Math.max(0, at - startAt.current);
      stops.current[i] = elapsed;
      setLocked(stops.current.map((s) => s !== null));
      tone({ freq: 380 + i * 120, duration: 0.07, type: "square", volume: 0.07 });
      if (stops.current.every((s) => s !== null)) closeRound();
    },
    [closeRound],
  );

  const advance = useCallback(() => {
    if (phaseRef.current !== "reveal" || pausedRef.current || revealT.current < REVEAL_LOCK_S) return;
    if (roundRef.current + 1 >= ROUNDS) {
      finish();
      return;
    }
    roundRef.current += 1;
    setRound(roundRef.current);
    readyT.current = 0;
    setCue(0);
    phaseRef.current = "ready";
    setPhase("ready");
    setLocked(players.map(() => false));
    sfx.click();
  }, [finish, players]);

  const beginRun = useCallback(() => {
    phaseRef.current = "running";
    stops.current = players.map(() => null);
    setLocked(players.map(() => false));
    setNotice(null);
    setPhase("running");
    startAt.current = performance.now();
    tone({ freq: 880, duration: 0.16, type: "triangle", volume: 0.16 });
  }, [players]);

  const restartRound = useCallback(() => {
    phaseRef.current = "ready";
    readyT.current = 0;
    stops.current = players.map(() => null);
    setCue(0);
    setLocked(players.map(() => false));
    setPhase("ready");
    setNotice("Paused mid-round: this round restarts, same target.");
  }, [players]);

  useGameLoop((dt) => {
    const ph = phaseRef.current;
    if (ph === "ready") {
      const before = cueOf(readyT.current);
      readyT.current += dt;
      const now = cueOf(readyT.current);
      if (now !== before) {
        setCue(now);
        tone({ freq: 440, duration: 0.08, type: "square", volume: 0.06 });
      }
      if (readyT.current >= READY_S) beginRun();
    } else if (ph === "running") {
      if (interrupted.current) {
        interrupted.current = false;
        restartRound();
        return;
      }
      const elapsed = performance.now() - startAt.current;
      const v = clockVisibility(elapsed, roundRef.current);
      const node = clockEl.current;
      if (node) {
        node.textContent = v > 0 ? fmtClock(elapsed) : "?.??";
        node.style.opacity = String(v);
        node.style.filter = `blur(${((1 - v) * 18).toFixed(1)}px)`;
        node.style.transform = reducedMotion ? "" : `scale(${(1 + (1 - v) * 0.12).toFixed(3)})`;
      }
      if (hintEl.current) hintEl.current.style.opacity = v <= 0 ? "1" : "0";
      if (elapsed >= targets[roundRef.current] + CAP_MS) closeRound();
    } else if (ph === "reveal") {
      revealT.current += dt;
      if (revealT.current >= REVEAL_LOCK_S && !canAdvance) setCanAdvance(true);
      if (multi) {
        const left = Math.max(0, Math.ceil(MULTI_AUTO_S - revealT.current));
        if (left !== autoLeft) setAutoLeft(left);
        if (revealT.current >= MULTI_AUTO_S) advance();
      }
    }
  }, !paused);

  // Keyboard: own listener so we get precise event.timeStamp and can ignore key repeat.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      let idx = -1;
      if (multi) idx = players.findIndex((p) => !p.cpu && p.controls.action.includes(e.code));
      else if (
        e.code === "Space" ||
        e.code === "Enter" ||
        e.code === "NumpadEnter" ||
        players[0].controls.action.includes(e.code)
      )
        idx = 0;
      if (idx < 0) return;
      e.preventDefault();
      // A held key only produces repeats, so it can never count for a new round.
      if (e.repeat || pausedRef.current) return;
      if (phaseRef.current === "running") stopPlayer(idx, e.timeStamp);
      else if (phaseRef.current === "reveal") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [multi, players, stopPlayer, advance]);

  const onStagePointer = (e: React.PointerEvent) => {
    if (paused) return;
    if (phase === "running" && !multi) stopPlayer(0, e.timeStamp);
    else if (phase === "reveal") advance();
  };

  const totals = players.map((_, i) => history.reduce((s, r) => s + r[i].error, 0));
  const target = targets[round];
  const last = phase === "reveal" ? history[history.length - 1] : undefined;
  const isLastRound = round + 1 >= ROUNDS;

  return (
    <div
      className="relative flex h-full w-full touch-manipulation select-none flex-col overflow-hidden"
      style={{ background: BG, color: INK }}
      onPointerDown={onStagePointer}
    >
      <style>{CSS}</style>
      <Backdrop round={round} />

      {/* HUD */}
      <div className="relative z-10 flex items-start justify-between gap-3 px-4 pt-3 sm:px-6 sm:pt-4">
        <RoundStrip round={round} history={history} players={players} multi={multi} />
        {!multi ? (
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60">Total error</div>
            <div className="font-display text-2xl font-black tabular-nums leading-none sm:text-3xl">
              {fmtInt(totals[0])}
              <span className="ml-1 text-sm font-bold opacity-60">ms</span>
            </div>
          </div>
        ) : (
          <TargetTag target={target} small />
        )}
      </div>

      {/* Main */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">
        {phase === "ready" && (
          <div key={`ready-${round}`} className="flex flex-col items-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">
              Round {round + 1} of {ROUNDS} · Target
            </p>
            <div
              className={`font-display font-black leading-[0.82] tracking-tighter tabular-nums ${reducedMotion ? "" : "animate-pop"}`}
              style={{ fontSize: multi ? "clamp(4rem, 18vmin, 11rem)" : "clamp(5rem, 26vmin, 16rem)" }}
            >
              {fmtClock(target)}
              <span className="ml-1 align-top text-[0.32em]" style={{ color: ACCENT }}>
                s
              </span>
            </div>
            <div className="mt-3 h-12 font-serif text-4xl italic sm:text-5xl" style={{ color: ACCENT }}>
              {cue === 0 ? "Feel it." : cue === 1 ? "Ready…" : "Set…"}
            </div>
            {notice && (
              <p className="mt-2 rounded-full px-3 py-1 font-mono text-xs" style={{ background: INK, color: BG }}>
                {notice}
              </p>
            )}
          </div>
        )}

        {phase === "running" && (
          <div className="flex flex-col items-center">
            {!multi && <TargetTag target={target} />}
            <div className="relative mt-2">
              <span
                ref={clockEl}
                aria-hidden
                className="block font-display font-black leading-[0.82] tracking-tighter tabular-nums will-change-[opacity,filter]"
                style={{ fontSize: multi ? "clamp(4rem, 18vmin, 11rem)" : "clamp(5rem, 26vmin, 16rem)" }}
              >
                0.00
              </span>
              <div
                ref={hintEl}
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300"
                style={{ opacity: 0 }}
              >
                <div className="flex gap-3">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className={`block h-4 w-4 rounded-full sm:h-6 sm:w-6 ${reducedMotion ? "" : "pt-beat"}`}
                      style={{ background: ACCENT, animationDelay: `${d * 0.33}s` }}
                    />
                  ))}
                </div>
                <p className="mt-4 font-serif text-3xl italic sm:text-4xl">keep counting…</p>
              </div>
            </div>
            {!multi && (
              <p className="mt-6 font-mono text-xs uppercase tracking-[0.25em] opacity-70">
                Tap anywhere · <span className="kbd">Space</span> to stop
              </p>
            )}
          </div>
        )}

        {phase === "reveal" && last && !multi && (
          <SoloReveal key={`rev-${round}`} o={last[0]} target={target} reducedMotion={reducedMotion} />
        )}
        {phase === "reveal" && last && multi && (
          <div key={`mrev-${round}`} className="w-full max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">
              Round {round + 1} · Target {fmtClock(target)} s
            </p>
            <Ruler
              reducedMotion={reducedMotion}
              markers={last
                .map((o, i) => ({ signed: o.signed, color: players[i].color, label: players[i].name }))
                .filter((m): m is { signed: number; color: string; label: string } => m.signed !== null)}
            />
          </div>
        )}
      </div>

      {multi && (
        <Lanes
          players={players}
          phase={phase}
          locked={locked}
          last={last}
          totals={totals}
          onLane={(i, e) => {
            e.stopPropagation();
            if (paused) return;
            if (phase === "running") stopPlayer(i, e.timeStamp);
            else if (phase === "reveal") advance();
          }}
        />
      )}

      {/* Footer prompt */}
      <div className="relative z-10 flex h-10 shrink-0 items-center justify-center px-4 font-mono text-[11px] uppercase tracking-[0.2em] sm:h-12 sm:text-xs">
        {phase === "reveal" && (
          <span className="transition-opacity duration-300" style={{ opacity: canAdvance ? 1 : 0 }}>
            {multi
              ? `${isLastRound ? "Final standings" : "Next round"} in ${autoLeft}s · any player key or tap`
              : `${isLastRound ? "See results" : "Next round"} · tap or Space`}
          </span>
        )}
        {phase === "ready" && <span className="opacity-60">Clock starts after “Set”. It hides fast.</span>}
        {phase === "running" && multi && <span className="opacity-60">Everyone stops their own clock</span>}
      </div>
      <Marquee reducedMotion={reducedMotion} />
    </div>
  );
}

const CSS = `
@keyframes pt-beat { 0%,100% { transform: scale(.6); opacity:.35 } 50% { transform: scale(1); opacity:1 } }
.pt-beat { animation: pt-beat 1s ease-in-out infinite; }
@keyframes pt-slide { from { transform: translateX(320px); } }
.pt-slide { animation: pt-slide .7s cubic-bezier(.2,1.2,.3,1) both; }
@keyframes pt-stamp { 0% { transform: scale(1.8) rotate(-8deg); opacity:0 } 60% { transform: scale(.94) rotate(-3deg); opacity:1 } 100% { transform: scale(1) rotate(-3deg); opacity:1 } }
.pt-stamp { animation: pt-stamp .45s cubic-bezier(.2,1.3,.4,1) both; }
@keyframes pt-lock { 0% { transform: scale(.7) } 60% { transform: scale(1.08) } 100% { transform: scale(1) } }
.pt-lock { animation: pt-lock .3s ease-out both; }
`;

function Backdrop({ round }: { round: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -right-[6vmin] -bottom-[14vmin] font-display font-black leading-none"
        style={{
          fontSize: "52vmin",
          color: "transparent",
          WebkitTextStroke: `2px ${INK}`,
          opacity: 0.08,
        }}
      >
        0{round + 1}
      </div>
      <div
        className="absolute -left-[12vmin] -top-[12vmin] rounded-full"
        style={{ width: "34vmin", height: "34vmin", background: ACCENT, opacity: 0.12 }}
      />
      <div className="absolute inset-x-0 top-[38%] h-px" style={{ background: INK, opacity: 0.07 }} />
    </div>
  );
}

function Marquee({ reducedMotion }: { reducedMotion: boolean }) {
  const words = "STOP THE CLOCK ✶ FEEL THE SECONDS ✶ TRUST YOUR GUT ✶ ";
  return (
    <div className="relative z-10 h-7 shrink-0 overflow-hidden" style={{ background: INK, color: BG }} aria-hidden>
      <div
        className={`flex h-full w-max items-center whitespace-nowrap font-display text-sm font-black tracking-wider ${reducedMotion ? "" : "animate-marquee"}`}
      >
        <span className="px-2">{words.repeat(6)}</span>
        <span className="px-2">{words.repeat(6)}</span>
      </div>
    </div>
  );
}

function TargetTag({ target, small = false }: { target: number; small?: boolean }) {
  return (
    <div
      className={`inline-flex items-baseline gap-2 rounded-full font-display font-black ${small ? "px-3 py-1 text-lg" : "px-4 py-1.5 text-2xl sm:text-3xl"}`}
      style={{ background: ACCENT, color: INK, boxShadow: `0 3px 0 ${INK}` }}
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]">Target</span>
      <span className="tabular-nums">{fmtClock(target)} s</span>
    </div>
  );
}

function RoundStrip({
  round,
  history,
  players,
  multi,
}: {
  round: number;
  history: RoundOutcome[][];
  players: PlayerConfig[];
  multi: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: ROUNDS }, (_, i) => {
        const r = history[i];
        const current = i === round && !r;
        let fill = "transparent";
        let text = String(i + 1);
        let color = INK;
        if (r) {
          if (multi) {
            const best = Math.min(...r.map((o) => o.error));
            const w = r.findIndex((o) => o.error === best);
            fill = players[w].color;
          } else {
            fill = TIER_COLORS[rate(r[0].error).tier];
            text = r[0].error >= 1000 ? `${(r[0].error / 1000).toFixed(1)}s` : String(r[0].error);
            color = BG;
          }
        }
        return (
          <div
            key={i}
            className="flex h-8 min-w-8 items-center justify-center rounded-md border-2 px-1 font-mono text-[11px] font-bold tabular-nums sm:h-9 sm:min-w-11 sm:text-xs"
            style={{
              borderColor: INK,
              background: fill,
              color: r && multi ? INK : color,
              opacity: !r && !current ? 0.35 : 1,
              boxShadow: current ? `0 3px 0 ${ACCENT}` : undefined,
            }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}

function SoloReveal({ o, target, reducedMotion }: { o: RoundOutcome; target: number; reducedMotion: boolean }) {
  const r = rate(o.error);
  return (
    <div className="flex w-full max-w-3xl flex-col items-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">
        {o.stopMs === null ? "You never stopped" : "You stopped at"}
      </p>
      <div
        className="font-display font-black leading-[0.82] tracking-tighter tabular-nums"
        style={{ fontSize: "clamp(4.5rem, 22vmin, 13rem)" }}
      >
        {o.stopMs === null ? "—" : fmtClock(o.stopMs)}
        <span className="ml-1 align-top text-[0.32em]" style={{ color: ACCENT }}>
          s
        </span>
      </div>
      <div
        className={`mt-1 inline-block rounded-xl px-4 py-1 font-serif text-4xl italic sm:text-6xl ${reducedMotion ? "" : "pt-stamp"}`}
        style={{ background: TIER_COLORS[r.tier], color: r.tier >= 3 ? BG : INK, transform: "rotate(-3deg)" }}
      >
        {r.word}
      </div>
      <p className="mt-3 font-display text-lg font-bold sm:text-xl">
        Target {fmtClock(target)} s ·{" "}
        <span style={{ color: ACCENT }}>
          {o.signed === null ? `${fmtInt(CAP_MS)} ms (capped)` : fmtSigned(o.signed)}
        </span>{" "}
        {o.signed !== null && o.signed !== 0 && <span className="opacity-60">{o.signed > 0 ? "late" : "early"}</span>}
      </p>
      {o.signed !== null && <Ruler reducedMotion={reducedMotion} markers={[{ signed: o.signed, color: ACCENT, label: "You" }]} />}
    </div>
  );
}

const RULER_TICKS = [0, 20, 75, 200, 500, 1000];

function Ruler({
  markers,
  reducedMotion,
}: {
  markers: { signed: number; color: string; label: string }[];
  reducedMotion: boolean;
}) {
  const cx = 320;
  const half = 290;
  const x = (s: number) => cx + rulerPos(s) * half;
  const label = (ms: number) => (ms === 0 ? "0" : ms >= 1000 ? "1s" : String(ms));
  // Stack labels that would collide.
  const sorted = markers
    .map((m, i) => ({ ...m, i, px: x(m.signed) }))
    .sort((a, b) => a.px - b.px)
    .map((m, k, arr) => {
      let row = 0;
      for (let j = k - 1; j >= 0; j--) if (Math.abs(arr[j].px - m.px) < 70) row++;
      return { ...m, row: row % 3 };
    });
  return (
    <svg viewBox="0 0 640 132" className="mt-4 w-full" role="img" aria-label="How far off each stop was">
      {/* Rating bands */}
      <rect x={x(-200)} y={70} width={x(200) - x(-200)} height={20} fill={INK} opacity={0.06} />
      <rect x={x(-75)} y={70} width={x(75) - x(-75)} height={20} fill={ACCENT} opacity={0.25} />
      <rect x={x(-20)} y={70} width={x(20) - x(-20)} height={20} fill={ACCENT} opacity={0.6} />
      <line x1={cx - half} x2={cx + half} y1={90} y2={90} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      {RULER_TICKS.flatMap((t) => (t === 0 ? [0] : [-t, t])).map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={t === 0 ? 62 : 82} y2={98} stroke={INK} strokeWidth={t === 0 ? 4 : 2} />
          <text x={x(t)} y={114} textAnchor="middle" fontSize={12} fontFamily="var(--font-mono)" fill={INK} opacity={0.7}>
            {label(Math.abs(t))}
          </text>
        </g>
      ))}
      <text x={cx - half} y={128} fontSize={11} fontFamily="var(--font-mono)" fill={INK} opacity={0.5}>
        ← EARLY
      </text>
      <text x={cx + half} y={128} textAnchor="end" fontSize={11} fontFamily="var(--font-mono)" fill={INK} opacity={0.5}>
        LATE →
      </text>
      {sorted.map((m) => {
        const off = Math.abs(m.signed) > 1000;
        const ly = 50 - m.row * 18;
        return (
          <g
            key={m.i}
            className={reducedMotion ? undefined : "pt-slide"}
            style={{ transform: `translateX(${m.px}px)`, animationDelay: `${m.i * 0.08}s` }}
          >
            <line x1={0} x2={0} y1={ly + 4} y2={86} stroke={m.color} strokeWidth={2} strokeDasharray="3 3" />
            <path d="M -9 70 L 9 70 L 0 88 Z" fill={m.color} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            <text
              x={0}
              y={ly}
              textAnchor={m.px < 60 ? "start" : m.px > 580 ? "end" : "middle"}
              fontSize={14}
              fontWeight={800}
              fontFamily="var(--font-display)"
              fill={INK}
            >
              {m.label}
              {off ? (m.signed > 0 ? " »" : " «") : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Lanes({
  players,
  phase,
  locked,
  last,
  totals,
  onLane,
}: {
  players: PlayerConfig[];
  phase: Phase;
  locked: boolean[];
  last?: RoundOutcome[];
  totals: number[];
  onLane: (i: number, e: React.PointerEvent) => void;
}) {
  const n = players.length;
  const cols = n === 2 ? "grid-cols-2" : n === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4";
  const bestErr = last ? Math.min(...last.map((o) => o.error)) : -1;
  return (
    <div className={`relative z-10 grid shrink-0 gap-2 px-3 sm:gap-3 sm:px-6 ${cols}`}>
      {players.map((p, i) => {
        const o = last?.[i];
        const isLocked = locked[i];
        const lit = phase === "running" && isLocked;
        return (
          <div
            key={p.index}
            onPointerDown={(e) => onLane(i, e)}
            className="relative flex min-h-[104px] flex-col justify-between overflow-hidden rounded-2xl border-[3px] p-2.5 sm:min-h-[132px] sm:p-3"
            style={{
              borderColor: INK,
              background: lit ? p.color : `color-mix(in srgb, ${p.color} 16%, ${BG})`,
              boxShadow: `0 4px 0 ${INK}`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 font-display text-base font-black sm:text-lg">
                <span className="h-3 w-3 shrink-0 rounded-full border-2" style={{ background: p.color, borderColor: INK }} />
                <span className="truncate">{p.name}</span>
              </span>
              <span className="kbd shrink-0 bg-white/60">{p.controls.actionLabel}</span>
            </div>
            <div className="text-center">
              {phase === "ready" && <p className="font-mono text-xs uppercase tracking-widest opacity-60">Get ready</p>}
              {phase === "running" &&
                (isLocked ? (
                  <p className="pt-lock font-display text-2xl font-black uppercase sm:text-3xl">Locked ✓</p>
                ) : (
                  <p className="font-mono text-xs uppercase tracking-widest opacity-80">
                    Press <span className="kbd">{p.controls.actionLabel}</span> or tap
                  </p>
                ))}
              {phase === "reveal" && o && (
                <div className="pt-lock">
                  <p className="font-display text-2xl font-black tabular-nums leading-none sm:text-3xl">
                    {o.stopMs === null ? "No stop" : `${fmtClock(o.stopMs)} s`}
                  </p>
                  <p className="mt-1 font-mono text-xs font-bold">
                    {o.signed === null ? `+${fmtInt(CAP_MS)} ms cap` : fmtSigned(o.signed)} ·{" "}
                    <span style={{ color: o.error === bestErr ? ACCENT : undefined }}>{rate(o.error).word}</span>
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider opacity-70">
              <span>Total</span>
              <span className="tabular-nums">{fmtInt(totals[i])} ms</span>
            </div>
            {phase === "reveal" && o && o.error === bestErr && (
              <span
                className="absolute right-2 top-9 rotate-6 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase"
                style={{ background: ACCENT, color: INK }}
              >
                Closest
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

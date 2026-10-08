"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { ArrowLeft, Keyboard, Maximize2, Minimize2, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";
import type { GameMeta, GameProps, GameResult, PlayerConfig } from "@/lib/types";
import { makeRoster } from "@/lib/players";
import { countPlay, getRecord, submitScore, type RecordEntry } from "@/lib/records";
import { formatRecord } from "@/lib/format";
import { isMuted, onMuteChange, setMuted, sfx } from "@/lib/sound";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { t } from "@/lib/i18n";
import { ControlsLegend } from "./ControlsLegend";
import { Standings } from "./Standings";

type Phase = "intro" | "countdown" | "playing" | "over";

export interface PartyHook {
  round: number;
  totalRounds: number;
  players: PlayerConfig[];
  onDone: (result: GameResult) => void;
  onQuit: () => void;
}

interface Props {
  meta: GameMeta;
  Game: ComponentType<GameProps>;
  /** Present when running inside Party Mode. */
  party?: PartyHook;
}

/**
 * Wraps every game with the shared flow: start screen → (countdown) →
 * play (with pause / restart) → end screen → replay or back to catalog.
 */
export function GameShell({ meta, Game, party }: Props) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("intro");
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [record, setRecord] = useState<RecordEntry | undefined>(undefined);
  const [humans, setHumans] = useState(meta.players.min);
  const [count, setCount] = useState(3);
  const [muted, setMutedState] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);

  const multiplayer = meta.players.max > 1;
  const players: PlayerConfig[] = useMemo(() => {
    if (party) return party.players;
    if (humans === 1 && meta.cpuOpponents) return makeRoster(1, meta.cpuFill ?? 2);
    return makeRoster(humans);
  }, [party, humans, meta.cpuOpponents, meta.cpuFill]);

  useEffect(() => {
    setRecord(getRecord(meta.slug));
    setMutedState(isMuted());
    return onMuteChange(setMutedState);
  }, [meta.slug]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const begin = useCallback(() => {
    finishedRef.current = false;
    setResult(null);
    setNewBest(false);
    setPaused(false);
    setRunId((r) => r + 1);
    sfx.click();
    if (meta.category === "arcade" && !reducedMotion) {
      setCount(3);
      setPhase("countdown");
    } else {
      setPhase("playing");
    }
  }, [meta.category, reducedMotion]);

  // 3-2-1 countdown for arcade games so everyone can find their keys.
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      sfx.good();
      setPhase("playing");
      return;
    }
    sfx.tick();
    const id = setTimeout(() => setCount((c) => c - 1), 650);
    return () => clearTimeout(id);
  }, [phase, count]);

  const onFinish = useCallback(
    (r: GameResult) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      let best = false;
      if (!party && meta.record && typeof r.score === "number" && players.filter((p) => !p.cpu).length === 1) {
        best = submitScore(meta.slug, r.score, meta.record.better);
        setRecord(getRecord(meta.slug));
      }
      countPlay(meta.slug);
      setNewBest(best);
      setResult(r);
      setPhase("over");
      if (best || r.placements) sfx.win();
    },
    [meta.record, meta.slug, party, players],
  );

  const togglePause = useCallback(() => {
    if (phase !== "playing") return;
    setPaused((p) => !p);
  }, [phase]);

  const restart = useCallback(() => {
    begin();
  }, [begin]);

  // Shell keyboard shortcuts: Esc/P pause, Enter to start from overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.tagName === "SELECT")) return;
      if (e.code === "Escape" || e.code === "KeyP") {
        if (phase === "playing") {
          e.preventDefault();
          togglePause();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, togglePause]);

  // Auto-pause when the tab is hidden.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phase === "playing") setPaused(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase]);

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => {});
  };

  const { theme } = meta;
  const style = {
    "--g-bg": theme.bg,
    "--g-ink": theme.ink,
    "--g-accent": theme.accent,
    "--g-accent2": theme.accent2,
    background: theme.bg,
    color: theme.ink,
  } as React.CSSProperties;

  const gameRunning = phase === "playing" && !paused;
  const showGame = phase !== "intro" || runId > 0;

  return (
    <div ref={rootRef} style={style} className="relative flex h-dvh flex-col overflow-hidden">
      {/* Top bar */}
      <header className="z-30 flex shrink-0 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-5">
        {party ? (
          <button onClick={party.onQuit} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold opacity-80 transition hover:bg-white/10 hover:opacity-100">
            <ArrowLeft size={16} /> Quit party
          </button>
        ) : (
          <Link href="/#games" className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold opacity-80 transition hover:bg-white/10 hover:opacity-100">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">{t.shell.backToCatalog}</span>
          </Link>
        )}
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h1 className="truncate font-display text-lg font-extrabold tracking-tight sm:text-xl">{meta.title}</h1>
          {party && (
            <span className="font-mono text-xs uppercase tracking-widest opacity-70">
              Round {party.round}/{party.totalRounds}
            </span>
          )}
          {!party && meta.record && record && (
            <span className="hidden items-center gap-1 font-mono text-xs opacity-70 md:flex">
              <Trophy size={13} /> {t.shell.best}: {formatRecord(meta, record.best)}
            </span>
          )}
        </div>
        {phase === "playing" && (
          <>
            <IconButton label={paused ? t.shell.resume : t.shell.pause} onClick={togglePause}>
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </IconButton>
            <IconButton label={t.shell.restart} onClick={restart}>
              <RotateCcw size={18} />
            </IconButton>
          </>
        )}
        <IconButton label={muted ? t.shell.unmute : t.shell.mute} onClick={() => setMuted(!muted)}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </IconButton>
        <IconButton label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen} className="hidden sm:inline-flex">
          {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </IconButton>
      </header>

      {/* Stage */}
      <main className="relative min-h-0 flex-1">
        {showGame && (
          <div className="absolute inset-0" aria-hidden={phase !== "playing"}>
            <Game
              key={runId}
              mode={party ? "party" : "solo"}
              players={players}
              paused={!gameRunning}
              reducedMotion={reducedMotion}
              onFinish={onFinish}
            />
          </div>
        )}

        {phase === "intro" && (
          <Overlay>
            <IntroCard
              meta={meta}
              party={party}
              multiplayer={multiplayer}
              humans={humans}
              setHumans={setHumans}
              players={players}
              record={record}
              onStart={begin}
            />
          </Overlay>
        )}

        {phase === "countdown" && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div key={count} className="animate-pop font-display text-[22vmin] font-black leading-none drop-shadow-[0_6px_0_rgba(0,0,0,0.35)]" style={{ color: theme.accent }}>
              {count > 0 ? count : "GO"}
            </div>
          </div>
        )}

        {phase === "playing" && paused && (
          <Overlay>
            <div className="w-full max-w-sm animate-pop rounded-3xl p-8 text-center" style={{ background: theme.ink, color: theme.bg }}>
              <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">{t.shell.paused}</p>
              <p className="mt-2 font-display text-4xl font-black">Take a breath.</p>
              <div className="mt-6 flex flex-col gap-3">
                <button autoFocus className="btn" style={{ background: theme.accent, color: theme.ink, borderColor: theme.ink }} onClick={() => setPaused(false)}>
                  <Play size={18} /> {t.shell.resume}
                </button>
                <button className="btn" onClick={restart}>
                  <RotateCcw size={18} /> {t.shell.restart}
                </button>
                {party ? (
                  <button className="btn" onClick={party.onQuit}>
                    Quit party
                  </button>
                ) : (
                  <Link className="btn" href="/#games">
                    <ArrowLeft size={18} /> {t.shell.backToCatalog}
                  </Link>
                )}
              </div>
              <p className="mt-4 font-mono text-xs opacity-60">
                <span className="kbd">Esc</span> or <span className="kbd">P</span> to resume
              </p>
            </div>
          </Overlay>
        )}

        {phase === "over" && result && (
          <Overlay>
            <EndCard
              meta={meta}
              result={result}
              players={players}
              newBest={newBest}
              record={record}
              party={party}
              onReplay={begin}
            />
          </Overlay>
        )}
      </main>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full opacity-80 transition hover:bg-white/15 hover:opacity-100 ${className}`}
    >
      {children}
    </button>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-[3px] sm:items-center">
      {children}
    </div>
  );
}

function IntroCard({
  meta,
  party,
  multiplayer,
  humans,
  setHumans,
  players,
  record,
  onStart,
}: {
  meta: GameMeta;
  party?: PartyHook;
  multiplayer: boolean;
  humans: number;
  setHumans: (n: number) => void;
  players: PlayerConfig[];
  record?: RecordEntry;
  onStart: () => void;
}) {
  const { theme } = meta;
  const startRef = useRef<HTMLButtonElement>(null);
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    startRef.current?.focus();
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  const options = Array.from({ length: meta.players.max - meta.players.min + 1 }, (_, i) => meta.players.min + i);

  return (
    <div className="my-auto w-full max-w-2xl animate-rise overflow-hidden rounded-[28px] shadow-2xl" style={{ background: theme.ink, color: theme.bg }}>
      <div className="p-6 sm:p-8">
        {party ? (
          <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">
            Round {party.round} of {party.totalRounds}
          </p>
        ) : (
          <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">
            {meta.category === "experiment" ? "Experiment" : meta.category === "brain" ? "Brain challenge" : "Arcade"} · {meta.duration}
          </p>
        )}
        <h2 className="mt-2 font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">{meta.title}</h2>
        <p className="mt-2 font-serif text-xl italic opacity-80 sm:text-2xl">{meta.tagline}</p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.25em] opacity-60">{t.shell.howToPlay}</h3>
            <ol className="mt-3 space-y-2 text-[15px] leading-snug">
              {meta.instructions.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: theme.accent, color: theme.ink }}>
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.25em] opacity-60">{t.shell.controls}</h3>
            {multiplayer && (party || humans > 1 || meta.category === "arcade") ? (
              <ControlsLegend players={players} />
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {meta.controls.map((c) => (
                  <li key={c.keys} className="flex items-center justify-between gap-3">
                    <span className="kbd">{c.keys}</span>
                    <span className="text-right opacity-80">{c.action}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3">
                  <span className="kbd">Esc</span>
                  <span className="text-right opacity-80">{t.shell.pause}</span>
                </li>
              </ul>
            )}
          </div>
        </div>

        {!party && multiplayer && (
          <div className="mt-6">
            <h3 className="font-mono text-xs uppercase tracking-[0.25em] opacity-60">{t.shell.players}</h3>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={t.shell.players}>
              {options.map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={humans === n}
                  onClick={() => setHumans(n)}
                  className="rounded-full border-2 px-4 py-1.5 text-sm font-bold transition"
                  style={humans === n ? { background: theme.accent, color: theme.ink, borderColor: theme.accent } : { borderColor: "currentColor", opacity: 0.75 }}
                >
                  {n === 1 && meta.cpuOpponents ? `1 ${t.shell.vsCpu}` : n === 1 ? "Solo" : `${n} players`}
                </button>
              ))}
            </div>
          </div>
        )}

        {!meta.touch && coarse && (
          <p className="mt-5 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm">
            <Keyboard size={16} /> {t.shell.keyboardRequired}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-6 sm:px-8 sm:pb-8">
        <span className="font-mono text-xs opacity-70">
          {!party && meta.record && (record ? `${t.shell.best}: ${formatRecord(meta, record.best)}` : t.shell.noBest)}
        </span>
        <button ref={startRef} onClick={onStart} className="btn text-lg" style={{ background: theme.accent, color: theme.ink, borderColor: theme.accent, boxShadow: `0 4px 0 0 ${theme.accent2 === theme.ink ? "#000" : theme.accent2}` }}>
          <Play size={20} fill="currentColor" /> {t.shell.start}
        </button>
      </div>
    </div>
  );
}

function EndCard({
  meta,
  result,
  players,
  newBest,
  record,
  party,
  onReplay,
}: {
  meta: GameMeta;
  result: GameResult;
  players: PlayerConfig[];
  newBest: boolean;
  record?: RecordEntry;
  party?: PartyHook;
  onReplay: () => void;
}) {
  const { theme } = meta;
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Small delay so a key held at the end of the game doesn't instantly replay.
    const id = setTimeout(() => btnRef.current?.focus(), 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="my-auto w-full max-w-xl animate-rise overflow-hidden rounded-[28px] shadow-2xl" style={{ background: theme.ink, color: theme.bg }}>
      <div className="p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">{meta.title} · Results</p>
        <h2 className="mt-2 font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">{result.headline}</h2>
        {result.subline && <p className="mt-2 font-serif text-xl italic opacity-80">{result.subline}</p>}

        {result.scoreLabel && (
          <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
            <span className="font-display text-6xl font-black tabular-nums leading-none" style={{ color: theme.accent }}>
              {result.scoreLabel}
            </span>
            {newBest ? (
              <span className="mb-1 inline-flex animate-pop items-center gap-1 rounded-full px-3 py-1 text-sm font-bold" style={{ background: theme.accent, color: theme.ink }}>
                <Trophy size={14} /> {t.shell.newBest}
              </span>
            ) : (
              meta.record &&
              record &&
              !party && (
                <span className="mb-1 font-mono text-sm opacity-70">
                  {t.shell.best}: {formatRecord(meta, record.best)}
                </span>
              )
            )}
          </div>
        )}

        {result.placements && <Standings players={players} placements={result.placements} className="mt-6" />}

        {result.stats && result.stats.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {result.stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10" style={{ background: "color-mix(in srgb, currentColor 7%, transparent)" }}>
                <dt className="font-mono text-[11px] uppercase tracking-wider opacity-60">{s.label}</dt>
                <dd className="mt-1 font-display text-xl font-bold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 px-6 pb-6 sm:px-8 sm:pb-8">
        {party ? (
          <button ref={btnRef} onClick={() => party.onDone(result)} className="btn text-lg" style={{ background: theme.accent, color: theme.ink, borderColor: theme.accent }}>
            {t.party.continue} →
          </button>
        ) : (
          <>
            <Link href="/#games" className="btn">
              <ArrowLeft size={18} /> {t.shell.backToCatalog}
            </Link>
            <button ref={btnRef} onClick={onReplay} className="btn" style={{ background: theme.accent, color: theme.ink, borderColor: theme.accent }}>
              <RotateCcw size={18} /> {t.shell.playAgain}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

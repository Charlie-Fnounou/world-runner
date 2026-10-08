"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { GameProps, GameResult, PlayerConfig } from "@/lib/types";
import { useGameLoop } from "@/lib/loop";
import { randomSeed, rng } from "@/lib/random";
import { sfx } from "@/lib/sound";
import { Duel, KIND_INFO, TARGET_POINTS, type Cue, type DuelEvent, type Phase, type RoundKind } from "./logic";
import { announceTwang, cueTick, drawCall, gunshot, jamClick, playCueSound } from "./sounds";

const INK = "#fff2df";
const ACCENT = "#ffb23e";
const ACCENT2 = "#ff3b1f";
const BG = "#2b1408";

interface PlayerView {
  points: number;
  jammed: boolean;
  shot: number | null;
  won: boolean;
  best: number | null;
  falseStarts: number;
}

interface View {
  phase: Phase;
  round: number;
  kind: RoundKind;
  cue: Cue | null;
  restarted: boolean;
  winners: number[];
  voidReason: "jammed" | "noshot" | null;
  champion: number;
  players: PlayerView[];
  /** Increments every cue so CSS animations replay. */
  cueSerial: number;
}

function snapshot(d: Duel, cueSerial: number): View {
  return {
    phase: d.phase,
    round: d.round,
    kind: d.kind,
    cue: d.currentCue,
    restarted: d.restarted,
    winners: d.lastWinners.slice(),
    voidReason: d.voidReason,
    champion: d.champion,
    players: d.players.map((p) => ({
      points: p.points,
      jammed: p.jammed,
      shot: p.shot,
      won: p.won,
      best: p.best,
      falseStarts: p.falseStarts,
    })),
    cueSerial,
  };
}

function eventTime(e: { timeStamp: number }) {
  const now = performance.now();
  const ts = e.timeStamp;
  // Modern browsers report timeStamp on the performance.now() timeline.
  return ts > 0 && ts <= now + 1 && now - ts < 1000 ? ts : now;
}

export default function SpeedDuel({ players, paused, reducedMotion, onFinish }: GameProps) {
  const duelRef = useRef<Duel | null>(null);
  const signalPerfRef = useRef(0);
  const pausedRef = useRef(paused);
  const refreshRef = useRef(false);
  const cueSerialRef = useRef(0);
  const finishedRef = useRef(false);
  const playersRef = useRef(players);
  const onFinishRef = useRef(onFinish);
  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
    playersRef.current = players;
    onFinishRef.current = onFinish;
  });

  const getDuel = useCallback(() => {
    if (!duelRef.current) {
      duelRef.current = new Duel(
        playersRef.current.map((p) => p.cpu),
        rng(randomSeed()),
      );
    }
    return duelRef.current;
  }, []);

  const finish = useCallback((d: Duel) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const ps = playersRef.current;
    const champ = ps[d.champion];
    const stats = ps.map((p, i) => {
      const s = d.players[i];
      return {
        label: `${p.name} · best / false starts`,
        value: `${s.best !== null ? `${s.best} ms` : "—"} / ${s.falseStarts}`,
      };
    });
    if (stats.length < 6) stats.push({ label: "Rounds", value: String(d.round) });
    const humans = ps.filter((p) => !p.cpu);
    const result: GameResult = {
      headline: `${champ.name} is the fastest in the West!`,
      subline: `First to ${TARGET_POINTS} — final score ${d.players.map((p) => p.points).join("–")}.`,
      placements: d.placements(),
      stats,
    };
    if (humans.length === 1) {
      const hb = d.players[ps.indexOf(humans[0])].best;
      if (hb !== null) {
        result.score = Math.round(hb);
        result.scoreLabel = `${Math.round(hb)} ms`;
      }
    }
    onFinishRef.current(result);
  }, []);

  /** Plays feedback for events; returns true if a signal appeared. */
  const handleEvents = useCallback(
    (d: Duel, events: DuelEvent[]) => {
      let signal = false;
      for (const ev of events) {
        switch (ev.type) {
          case "announce":
            announceTwang();
            break;
          case "cue":
            cueSerialRef.current += 1;
            if (ev.cue.sound) playCueSound(ev.cue.sound);
            else cueTick();
            break;
          case "signal":
            cueSerialRef.current += 1;
            signal = true;
            if (ev.cue.sound) playCueSound(ev.cue.sound);
            else if (d.kind === "draw") drawCall();
            else cueTick();
            break;
          case "shot":
            gunshot();
            break;
          case "jam":
            jamClick();
            break;
          case "result":
            setTimeout(() => sfx.good(), 180);
            break;
          case "void":
            sfx.bad();
            break;
          case "done":
            finish(d);
            break;
        }
      }
      return signal;
    },
    [finish],
  );

  // Cancel the running round when the game is paused; restart it on resume.
  useEffect(() => {
    if (!paused) return;
    const d = duelRef.current;
    if (d && d.cancelRound()) refreshRef.current = true;
  }, [paused]);

  useGameLoop((dt) => {
    const d = getDuel();
    const events = d.update(dt * 1000);
    if (events.length === 0 && !refreshRef.current) return;
    refreshRef.current = false;
    const signal = handleEvents(d, events);
    if (signal) {
      // Commit synchronously so the cue is painted this frame, then start the clock.
      flushSync(() => setView(snapshot(d, cueSerialRef.current)));
      signalPerfRef.current = performance.now();
    } else {
      setView(snapshot(d, cueSerialRef.current));
    }
  }, !paused);

  const press = useCallback(
    (i: number, time: number) => {
      if (pausedRef.current) return;
      const d = duelRef.current;
      if (!d || playersRef.current[i]?.cpu) return;
      if (d.phase !== "wait" && d.phase !== "signal") return;
      const events: DuelEvent[] = [];
      d.press(i, time - signalPerfRef.current, events);
      if (events.length) {
        handleEvents(d, events);
        setView(snapshot(d, cueSerialRef.current));
      }
    },
    [handleEvents],
  );

  // Keyboard: each human's action key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = eventTime(e);
      playersRef.current.forEach((p, i) => {
        if (!p.cpu && p.controls.action.includes(e.code)) {
          e.preventDefault();
          press(i, t);
        }
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const n = players.length;
  const phase = view?.phase ?? "idle";
  const kind = view?.kind ?? "draw";
  const flash = phase === "signal" && kind === "draw" && !reducedMotion;

  return (
    <div
      className="relative flex h-full w-full select-none flex-col overflow-hidden"
      style={{ background: BG, color: INK, touchAction: "manipulation" }}
    >
      <style>{CSS}</style>
      {/* Sky + signal */}
      <section className="relative min-h-0 flex-1 overflow-hidden">
        <Backdrop phase={phase} reducedMotion={reducedMotion} />
        {flash && <div key={view?.cueSerial} className="sd-flash pointer-events-none absolute inset-0" />}
        <div className="relative z-10 flex h-full flex-col items-center px-4 pt-2 text-center sm:pt-4">
          <div className="flex w-full items-center justify-between font-mono text-[11px] uppercase tracking-[0.25em] opacity-80 sm:text-xs">
            <span>{view && view.round > 0 ? `Round ${view.round}` : "Sundown"}</span>
            <span>First to {TARGET_POINTS}</span>
          </div>
          <div className="flex min-h-0 w-full flex-1 items-center justify-center">
            <Stage view={view} players={players} />
          </div>
        </div>
      </section>

      {/* Player zones */}
      <section
        className={`relative z-10 grid h-[44%] shrink-0 auto-rows-fr gap-[3px] p-[3px] ${
          n === 2 ? "grid-cols-2" : n === 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"
        }`}
        style={{ background: "#120702" }}
      >
        {players.map((p, i) => (
          <Zone
            key={p.index}
            player={p}
            view={view?.players[i] ?? null}
            phase={phase}
            facing={(n === 4 ? i % 2 === 0 : i < n / 2) ? 1 : -1}
            onPress={(e) => {
              e.preventDefault();
              press(i, eventTime(e));
            }}
          />
        ))}
      </section>
    </div>
  );
}

function Backdrop({ phase, reducedMotion }: { phase: Phase; reducedMotion: boolean }) {
  const tense = phase === "wait";
  return (
    <div className="absolute inset-0" aria-hidden>
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to bottom, ${BG} 0%, #5a200b 38%, #c9461a 70%, ${ACCENT} 100%)` }}
      />
      <div
        className="absolute left-1/2 rounded-full"
        style={{
          width: "min(70vmin, 520px)",
          height: "min(70vmin, 520px)",
          bottom: "-28%",
          transform: "translateX(-50%)",
          background: `radial-gradient(circle, #ffe2a3 0%, ${ACCENT} 45%, rgba(255,120,40,0) 70%)`,
          opacity: tense ? 0.95 : 0.75,
          transition: reducedMotion ? undefined : "opacity 0.6s",
        }}
      />
      <svg className="absolute bottom-0 left-0 h-[42%] w-full" viewBox="0 0 800 200" preserveAspectRatio="none">
        <path
          d="M0 200 L0 120 L60 120 L70 95 L150 95 L160 120 L260 128 L300 128 L310 80 L330 74 L420 74 L430 84 L440 130 L560 136 L600 136 L612 104 L700 104 L710 132 L800 132 L800 200 Z"
          fill="#3d1407"
          opacity="0.85"
        />
        <path d="M0 200 L0 160 Q200 140 400 156 T800 150 L800 200 Z" fill="#1d0a03" />
        {/* cacti */}
        <g fill="#1d0a03">
          <path d="M96 160 v-46 a7 7 0 0 1 14 0 v46 z M96 138 h-12 v-14 a5 5 0 0 1 10 0 v6 h2 z M110 132 h12 v-18 a5 5 0 0 0 -10 0 v10 h-2 z" />
          <path d="M690 158 v-34 a6 6 0 0 1 12 0 v34 z M690 142 h-9 v-10 a4 4 0 0 1 8 0 v4 h1 z" />
        </g>
      </svg>
    </div>
  );
}

function Stage({ view, players }: { view: View | null; players: PlayerConfig[] }) {
  if (!view || view.phase === "idle") {
    return <Poster small="Showdown at" big="SUNDOWN" />;
  }
  const info = KIND_INFO[view.kind];
  switch (view.phase) {
    case "announce":
      return (
        <div key={`a${view.round}-${view.restarted}`} className="animate-pop flex flex-col items-center">
          {view.restarted && (
            <div
              className="mb-3 -rotate-2 px-4 py-1 font-display text-sm font-black uppercase tracking-widest sm:text-base"
              style={{ background: ACCENT2, color: INK }}
            >
              Round restarted
            </div>
          )}
          <p className="font-mono text-xs uppercase tracking-[0.35em] opacity-80 sm:text-sm">Round {view.round}</p>
          <h2
            className="font-display font-black uppercase leading-[0.9] tracking-tight"
            style={{ fontSize: "clamp(2.2rem, 9vmin, 6rem)", color: ACCENT, textShadow: `0 4px 0 ${ACCENT2}` }}
          >
            {info.title}
          </h2>
          <p className="mt-2 max-w-md font-serif text-lg italic sm:text-2xl">{info.rule}</p>
        </div>
      );
    case "wait":
    case "signal":
      return <Signal view={view} />;
    case "result": {
      const w = view.winners.map((i) => players[i]);
      const ms = view.winners.length ? view.players[view.winners[0]].shot : null;
      return (
        <div key={`r${view.round}`} className="animate-pop flex flex-col items-center">
          <p className="font-mono text-xs uppercase tracking-[0.35em] opacity-80 sm:text-sm">Round {view.round} goes to</p>
          <h2
            className="font-display font-black uppercase leading-[0.9]"
            style={{ fontSize: "clamp(2.2rem, 9vmin, 6rem)", color: w[0]?.color ?? ACCENT, textShadow: "0 4px 0 rgba(0,0,0,0.45)" }}
          >
            {w.map((p) => p.name).join(" & ")}
          </h2>
          {ms !== null && (
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums sm:text-4xl" style={{ color: INK }}>
              {ms} ms
            </p>
          )}
        </div>
      );
    }
    case "void":
      return (
        <div key={`v${view.round}`} className="animate-pop flex flex-col items-center">
          <p className="font-mono text-xs uppercase tracking-[0.35em] opacity-80 sm:text-sm">Round void</p>
          <h2 className="font-display font-black uppercase leading-[0.95]" style={{ fontSize: "clamp(1.8rem, 7vmin, 4.5rem)", color: ACCENT }}>
            {view.voidReason === "jammed" ? "Everyone jumped the gun!" : "Nobody fired."}
          </h2>
        </div>
      );
    case "done": {
      const c = players[view.champion];
      return (
        <div className="animate-pop flex flex-col items-center">
          <p className="font-mono text-xs uppercase tracking-[0.35em] opacity-80">Wanted: dead or alive</p>
          <h2 className="font-display font-black uppercase leading-[0.9]" style={{ fontSize: "clamp(2rem, 8vmin, 5.5rem)", color: c?.color }}>
            {c?.name}
          </h2>
        </div>
      );
    }
    default:
      return null;
  }
}

function Poster({ small, big }: { small: string; big: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="font-serif text-2xl italic sm:text-3xl">{small}</p>
      <h2
        className="font-display font-black uppercase leading-[0.85] tracking-tight"
        style={{ fontSize: "clamp(2.8rem, 12vmin, 8rem)", color: ACCENT, textShadow: `0 5px 0 ${ACCENT2}` }}
      >
        {big}
      </h2>
    </div>
  );
}

function Signal({ view }: { view: View }) {
  const cue = view.cue;
  const live = view.phase === "signal";
  const ruleShort =
    view.kind === "color" ? "Fire on GREEN" : view.kind === "word" ? "Fire on “FIRE”" : view.kind === "bell" ? "Fire on the BELL" : "Wait for it…";

  if (view.kind === "draw") {
    return live ? (
      <h2
        key={view.cueSerial}
        className="sd-slam font-display font-black uppercase leading-none"
        style={{ fontSize: "clamp(4rem, 20vmin, 13rem)", color: INK, textShadow: `0 6px 0 ${ACCENT2}, 0 0 40px ${ACCENT}` }}
      >
        DRAW!
      </h2>
    ) : (
      <div className="flex flex-col items-center">
        <p className="sd-breathe font-display font-black uppercase tracking-[0.2em] opacity-70" style={{ fontSize: "clamp(1.6rem, 6vmin, 3.5rem)" }}>
          Steady…
        </p>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] opacity-60">{ruleShort}</p>
      </div>
    );
  }

  if (view.kind === "color") {
    const lamp = cue?.lamp;
    const fill = lamp === "green" ? "#4dff6a" : lamp === "yellow" ? "#ffd21f" : lamp === "red" ? "#ff2a1a" : "#3a1c10";
    return (
      <div className="flex flex-col items-center">
        <div className="rounded-[28px] p-3 sm:p-4" style={{ background: "#170803", boxShadow: "inset 0 0 0 3px #5a2a12" }}>
          <div
            key={view.cueSerial}
            className={lamp ? "sd-pop" : ""}
            style={{
              width: "clamp(90px, 22vmin, 190px)",
              height: "clamp(90px, 22vmin, 190px)",
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, #ffffffaa 0%, ${fill} 30%, ${fill} 70%, #00000055 100%)`,
              boxShadow: lamp ? `0 0 50px 10px ${fill}aa` : "inset 0 0 20px #000",
            }}
          />
        </div>
        <p className="mt-3 font-display text-lg font-black uppercase tracking-[0.2em] sm:text-2xl" style={{ color: lamp ? fill : INK, opacity: lamp ? 1 : 0.6 }}>
          {lamp ? lamp.toUpperCase() : "Watch the lamp"}
        </p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">{ruleShort}</p>
      </div>
    );
  }

  if (view.kind === "word") {
    return (
      <div className="flex flex-col items-center">
        <div
          className="relative px-8 py-4 sm:px-12 sm:py-6"
          style={{
            background: "linear-gradient(#8a4a22, #6b3516)",
            boxShadow: "0 6px 0 #3a1a08, inset 0 0 0 4px #4a220c",
            borderRadius: 8,
            minWidth: "min(80vw, 420px)",
          }}
        >
          <span
            key={view.cueSerial}
            className={`block font-display font-black uppercase leading-none ${cue ? "sd-pop" : ""}`}
            style={{ fontSize: "clamp(2.6rem, 13vmin, 8rem)", color: live ? INK : "#ffe1b8", textShadow: live ? `0 0 30px ${ACCENT}` : "0 3px 0 #3a1a08" }}
          >
            {cue ? cue.text : "· · ·"}
          </span>
        </div>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">{ruleShort}</p>
      </div>
    );
  }

  // Bell round: visual cue shown together with the sound, decoys get a caption.
  return (
    <div className="flex flex-col items-center">
      <svg
        key={live ? `b${view.cueSerial}` : "bell"}
        viewBox="0 0 100 100"
        className={live ? "sd-swing" : ""}
        style={{ width: "clamp(80px, 20vmin, 170px)", height: "clamp(80px, 20vmin, 170px)", transformOrigin: "50% 8%" }}
      >
        <rect x="46" y="2" width="8" height="10" rx="2" fill={live ? ACCENT : "#7a3a18"} />
        <path d="M20 78 Q22 30 50 22 Q78 30 80 78 Z" fill={live ? ACCENT : "#5a2a12"} stroke={live ? INK : "#2a1006"} strokeWidth="3" />
        <rect x="14" y="76" width="72" height="8" rx="4" fill={live ? ACCENT2 : "#3a1a08"} />
        <circle cx="50" cy="90" r="7" fill={live ? INK : "#3a1a08"} />
      </svg>
      <p
        key={view.cueSerial}
        className="sd-pop mt-2 font-display font-black uppercase tracking-[0.15em]"
        style={{ fontSize: live ? "clamp(2rem, 8vmin, 4.5rem)" : "clamp(1rem, 3.5vmin, 1.6rem)", color: live ? INK : "#ffd9b0", opacity: live ? 1 : 0.75 }}
      >
        {live ? "DING!" : cue ? <span className="font-serif normal-case italic tracking-normal">({cue.text})</span> : "Listen…"}
      </p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">{ruleShort}</p>
    </div>
  );
}

function Zone({
  player,
  view,
  phase,
  facing,
  onPress,
}: {
  player: PlayerConfig;
  view: PlayerView | null;
  phase: Phase;
  facing: 1 | -1;
  onPress: (e: React.PointerEvent) => void;
}) {
  const jammed = !!view?.jammed;
  const shot = view?.shot ?? null;
  const won = !!view?.won && (phase === "result" || phase === "done");
  const drawn = shot !== null;
  const human = !player.cpu;
  let status: string;
  if (jammed) status = "JAMMED";
  else if (drawn) status = `${shot} ms`;
  else if (phase === "wait") status = "Hold…";
  else if (phase === "signal") status = human ? "FIRE!" : "…";
  else status = human ? `Press ${player.controls.actionLabel} or tap` : "CPU";

  return (
    <div
      role={human ? "button" : undefined}
      aria-label={human ? `${player.name} fire zone` : `${player.name} (CPU)`}
      onPointerDown={human ? onPress : undefined}
      className="relative flex min-h-0 flex-col overflow-hidden rounded-md px-3 py-2"
      style={{
        background: `linear-gradient(to bottom, color-mix(in srgb, ${player.color} 30%, #1d0a03), #1d0a03)`,
        boxShadow: won ? `inset 0 0 0 4px ${player.color}, 0 0 30px ${player.color}` : `inset 0 3px 0 ${player.color}`,
        filter: jammed ? "grayscale(1) brightness(0.6)" : undefined,
        cursor: human ? "pointer" : "default",
        transition: "filter 0.2s, box-shadow 0.2s",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-black uppercase leading-tight sm:text-xl" style={{ color: player.color }}>
            {player.name}
          </p>
          <div className="mt-1 flex gap-1" aria-label={`${view?.points ?? 0} points`}>
            {Array.from({ length: TARGET_POINTS }, (_, k) => (
              <span
                key={k}
                className="inline-block h-2.5 w-2.5 rounded-full sm:h-3.5 sm:w-3.5"
                style={{
                  background: k < (view?.points ?? 0) ? player.color : "transparent",
                  boxShadow: `inset 0 0 0 2px ${player.color}`,
                }}
              />
            ))}
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest opacity-70 sm:text-xs">
          {human ? player.controls.actionLabel : "CPU"}
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1 items-end justify-center">
        <Gunslinger color={player.color} shade={player.shade} drawn={drawn} facing={facing} won={won} />
        {jammed && (
          <span
            className="sd-stamp absolute left-1/2 top-1/2 border-4 px-2 font-display text-xl font-black uppercase sm:text-3xl"
            style={{ color: ACCENT2, borderColor: ACCENT2 }}
          >
            Jammed
          </span>
        )}
      </div>

      <p
        className="text-center font-mono text-sm font-bold uppercase tabular-nums sm:text-lg"
        style={{ color: won ? player.color : drawn ? INK : undefined, opacity: drawn || won ? 1 : 0.75 }}
      >
        {won ? `+1 · ${status}` : status}
      </p>
    </div>
  );
}

function Gunslinger({ color, shade, drawn, facing, won }: { color: string; shade: string; drawn: boolean; facing: 1 | -1; won: boolean }) {
  return (
    <svg viewBox="0 0 120 140" className="h-full max-h-[160px] w-auto" style={{ transform: `scaleX(${facing})` }} aria-hidden>
      <ellipse cx="58" cy="136" rx="40" ry="4" fill="#000" opacity="0.4" />
      {/* legs */}
      <path d="M44 96 L38 134 L48 134 L56 100 L62 134 L72 134 L68 96 Z" fill="#0d0502" />
      {/* poncho / body */}
      <path d="M34 58 Q56 48 80 58 L84 100 L30 100 Z" fill="#0d0502" />
      <path d="M36 70 L82 70 L83 78 L35 78 Z" fill={color} />
      {/* head + hat */}
      <circle cx="58" cy="40" r="10" fill="#0d0502" />
      <path d="M44 33 Q46 16 58 16 Q70 16 72 33 Z" fill="#0d0502" />
      <rect x="45" y="28" width="26" height="4" fill={color} />
      <path d="M30 34 Q58 26 86 34 Q58 40 30 34 Z" fill="#0d0502" />
      {/* arm */}
      {drawn ? (
        <g>
          <path d="M74 62 L108 60 L108 67 L76 70 Z" fill="#0d0502" />
          <rect x="104" y="55" width="14" height="5" fill="#0d0502" />
          <circle cx="119" cy="57" r={won ? 7 : 5} fill={ACCENT} className="sd-muzzle" />
          <circle cx="119" cy="57" r="3" fill="#fff" className="sd-muzzle" />
        </g>
      ) : (
        <g>
          <path d="M76 60 L84 62 L88 92 L80 93 Z" fill="#0d0502" />
          <rect x="80" y="92" width="9" height="12" rx="2" fill={shade} />
        </g>
      )}
      <path d="M40 60 L34 62 L30 92 L38 93 Z" fill="#0d0502" />
    </svg>
  );
}

const CSS = `
@keyframes sd-flash { from { background: rgba(255,242,223,0.85); } to { background: rgba(255,242,223,0); } }
.sd-flash { animation: sd-flash 0.35s ease-out both; z-index: 5; }
@keyframes sd-slam { 0% { transform: scale(1.6); opacity: 0; } 60% { transform: scale(0.95); opacity: 1; } 100% { transform: scale(1); } }
.sd-slam { animation: sd-slam 0.18s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes sd-pop { 0% { transform: scale(0.8); opacity: 0.2; } 100% { transform: scale(1); opacity: 1; } }
.sd-pop { animation: sd-pop 0.12s ease-out both; }
@keyframes sd-breathe { 0%,100% { opacity: 0.45; } 50% { opacity: 0.8; } }
.sd-breathe { animation: sd-breathe 1.6s ease-in-out infinite; }
@keyframes sd-swing { 0% { transform: rotate(-18deg); } 25% { transform: rotate(14deg); } 50% { transform: rotate(-9deg); } 75% { transform: rotate(5deg); } 100% { transform: rotate(0); } }
.sd-swing { animation: sd-swing 0.9s ease-out both; }
@keyframes sd-stamp { 0% { transform: translate(-50%,-50%) rotate(-12deg) scale(2); opacity: 0; } 100% { transform: translate(-50%,-50%) rotate(-12deg) scale(1); opacity: 1; } }
.sd-stamp { transform: translate(-50%,-50%) rotate(-12deg); animation: sd-stamp 0.18s ease-out both; white-space: nowrap; }
@keyframes sd-muzzle { 0% { opacity: 1; } 100% { opacity: 0; } }
.sd-muzzle { animation: sd-muzzle 0.35s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .sd-flash, .sd-slam, .sd-swing, .sd-stamp, .sd-breathe, .sd-pop { animation: none !important; }
}
`;

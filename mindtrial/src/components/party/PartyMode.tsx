"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Crown, Play, RotateCcw, Shuffle, Users } from "lucide-react";
import { PARTY_GAMES, getGame } from "@/lib/catalog";
import { makePlayer } from "@/lib/players";
import type { GameResult, PlayerConfig } from "@/lib/types";
import { GameLoader } from "@/components/game/GameLoader";
import { Wordmark } from "@/components/site/Wordmark";
import { GAME_ART } from "@/games/arts";
import { sfx } from "@/lib/sound";
import { Confetti } from "./Confetti";
import { buildRotation, pointsFor } from "./logic";

type Stage = "setup" | "intro" | "playing" | "results" | "final";

interface RoundRecord {
  slug: string;
  placements: number[];
  points: number[];
  headline: string;
}

interface Settings {
  count: number;
  names: string[];
  rounds: number;
  games: string[];
}

const SETTINGS_KEY = "mindtrial:party:v1";
const DEFAULT_SETTINGS: Settings = {
  count: 2,
  names: ["Coral", "Azure", "Lime", "Amber"],
  rounds: 5,
  games: PARTY_GAMES.map((g) => g.slug),
};

export function PartyMode() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [stage, setStage] = useState<Stage>("setup");
  const [rotation, setRotation] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [history, setHistory] = useState<RoundRecord[]>([]);

  // Restore last party setup (names etc.) after mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Settings>;
        const games = (s.games ?? []).filter((g) => PARTY_GAMES.some((p) => p.slug === g));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
        setSettings({
          count: Math.min(4, Math.max(2, s.count ?? 2)),
          names: DEFAULT_SETTINGS.names.map((d, i) => (s.names?.[i] ?? d).slice(0, 12) || d),
          rounds: [3, 5, 7].includes(s.rounds ?? 0) ? (s.rounds as number) : 5,
          games: games.length ? games : DEFAULT_SETTINGS.games,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const players: PlayerConfig[] = useMemo(
    () => Array.from({ length: settings.count }, (_, i) => makePlayer(i, { name: settings.names[i].trim() || DEFAULT_SETTINGS.names[i] })),
    [settings.count, settings.names],
  );

  const totals = useMemo(() => {
    const t = players.map(() => 0);
    history.forEach((h) => h.points.forEach((p, i) => (t[i] += p)));
    return t;
  }, [history, players]);

  const start = useCallback(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    setRotation(buildRotation(settings.games, settings.rounds));
    setHistory([]);
    setRound(0);
    setStage("intro");
    sfx.good();
  }, [settings]);

  const onRoundDone = useCallback(
    (result: GameResult) => {
      const placements = result.placements && result.placements.length === players.length ? result.placements : players.map(() => 0);
      setHistory((h) => [
        ...h,
        { slug: rotation[round], placements, points: pointsFor(placements), headline: result.headline },
      ]);
      setStage("results");
    },
    [players, rotation, round],
  );

  const next = useCallback(() => {
    if (round + 1 >= rotation.length) {
      setStage("final");
      sfx.win();
    } else {
      setRound((r) => r + 1);
      setStage("intro");
    }
  }, [round, rotation.length]);

  const quit = useCallback(() => {
    if (confirm("Quit this party? Scores will be lost.")) setStage("setup");
  }, []);

  if (stage === "playing") {
    return (
      <GameLoader
        key={`${round}-${rotation[round]}`}
        slug={rotation[round]}
        party={{ round: round + 1, totalRounds: rotation.length, players, onDone: onRoundDone, onQuit: quit }}
      />
    );
  }

  return (
    <div className="grain min-h-dvh bg-ink text-paper">
      <header className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-2xl" aria-label="MINDTRIAL home">
          <Wordmark />
        </Link>
        <span className="rounded-full border border-paper/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest">Party Mode</span>
        {stage !== "setup" && (
          <button onClick={quit} className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-paper/80 hover:bg-paper/10">
            <ArrowLeft size={16} /> Quit
          </button>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {stage === "setup" && <Setup settings={settings} setSettings={setSettings} players={players} onStart={start} />}
        {stage === "intro" && (
          <RoundIntro round={round} total={rotation.length} slug={rotation[round]} players={players} totals={totals} onGo={() => setStage("playing")} />
        )}
        {stage === "results" && history[round] && (
          <RoundResults record={history[round]} round={round} total={rotation.length} players={players} totals={totals} onNext={next} />
        )}
        {stage === "final" && (
          <Final
            players={players}
            totals={totals}
            history={history}
            onRematch={start}
            onNewParty={() => setStage("setup")}
          />
        )}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- Setup */

function Setup({
  settings,
  setSettings,
  players,
  onStart,
}: {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  players: PlayerConfig[];
  onStart: () => void;
}) {
  const [ready, setReady] = useState<boolean[]>([false, false, false, false]);

  // Key check-in: each player presses their action key to prove the keys work.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && tgt.tagName === "INPUT") return;
      players.forEach((p) => {
        if (p.controls.action.includes(e.code)) {
          e.preventDefault();
          setReady((r) => {
            if (r[p.index]) return r;
            sfx.good();
            const n = r.slice();
            n[p.index] = true;
            return n;
          });
        }
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [players]);

  const toggleGame = (slug: string) =>
    setSettings((s) => {
      const has = s.games.includes(slug);
      if (has && s.games.length === 1) return s;
      return { ...s, games: has ? s.games.filter((g) => g !== slug) : [...s.games, slug] };
    });

  return (
    <div className="animate-rise">
      <h1 className="mt-6 font-display text-[clamp(2.6rem,7vw,5.5rem)] font-black leading-[0.9] tracking-[-0.045em]">
        Gather round. <span className="font-serif font-normal italic text-amber">Share a keyboard.</span>
      </h1>
      <p className="mt-4 max-w-2xl font-serif text-xl italic text-paper/75">
        Random mini-games, points every round, one champion. Each player gets their own corner of the keyboard — no fighting over keys.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-[24px] border border-paper/15 bg-paper/[0.04] p-5 sm:p-7" aria-labelledby="who">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="who" className="font-display text-2xl font-extrabold">Who&apos;s playing?</h2>
            <div className="flex gap-2" role="radiogroup" aria-label="Number of players">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={settings.count === n}
                  onClick={() => setSettings((s) => ({ ...s, count: n }))}
                  className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${settings.count === n ? "border-amber bg-amber text-ink" : "border-paper/30 hover:border-paper"}`}
                >
                  {n} players
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-6 space-y-3">
            {players.map((p) => (
              <li key={p.index} className="flex flex-wrap items-center gap-3 rounded-2xl p-3 sm:flex-nowrap" style={{ background: `${p.color}1f`, boxShadow: `inset 0 0 0 2px ${p.color}55` }}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-black text-ink" style={{ background: p.color }}>
                  {p.index + 1}
                </span>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Player {p.index + 1} name</span>
                  <input
                    value={settings.names[p.index]}
                    maxLength={12}
                    onChange={(e) =>
                      setSettings((s) => {
                        const names = s.names.slice();
                        names[p.index] = e.target.value;
                        return { ...s, names };
                      })
                    }
                    className="w-full rounded-xl border-2 border-transparent bg-black/25 px-3 py-2 font-display text-lg font-bold outline-none focus:border-paper/60"
                  />
                </label>
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="kbd">{p.controls.moveLabel.split("  ")[0]}</span>
                  <span className="kbd">{p.controls.actionLabel.split("  ")[0]}</span>
                </span>
                <span
                  className={`flex w-24 items-center justify-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition ${ready[p.index] ? "text-ink" : "text-paper/60 ring-1 ring-paper/25"}`}
                  style={ready[p.index] ? { background: p.color } : undefined}
                  aria-live="polite"
                >
                  {ready[p.index] ? (
                    <>
                      <Check size={14} /> Ready
                    </>
                  ) : (
                    <>Press {p.controls.actionLabel.split("  ")[0]}</>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-xs text-paper/50">
            Optional key check: each player taps their action key. Amber can also use the numpad (8 4 5 6 + 0).
          </p>
        </section>

        <section className="flex flex-col gap-6 rounded-[24px] border border-paper/15 bg-paper/[0.04] p-5 sm:p-7" aria-labelledby="rules">
          <h2 id="rules" className="font-display text-2xl font-extrabold">Tournament</h2>
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-paper/60">Rounds</h3>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Rounds">
              {[3, 5, 7].map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={settings.rounds === n}
                  onClick={() => setSettings((s) => ({ ...s, rounds: n }))}
                  className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${settings.rounds === n ? "border-amber bg-amber text-ink" : "border-paper/30 hover:border-paper"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-paper/60">Game pool</h3>
            <ul className="mt-2 space-y-2">
              {PARTY_GAMES.map((g) => {
                const on = settings.games.includes(g.slug);
                const Art = GAME_ART[g.slug];
                return (
                  <li key={g.slug}>
                    <button
                      onClick={() => toggleGame(g.slug)}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-3 rounded-xl p-1.5 pr-3 text-left transition ${on ? "bg-paper/10" : "opacity-50 hover:opacity-80"}`}
                    >
                      <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg" style={{ background: g.theme.bg }}>
                        {Art && <Art className="absolute inset-0 h-full w-full" />}
                      </span>
                      <span className="flex-1 font-bold">{g.title}</span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${on ? "border-amber bg-amber text-ink" : "border-paper/40"}`}>
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="font-mono text-xs text-paper/50">Scoring: 1st place earns {settings.count - 1} {settings.count - 1 === 1 ? "pt" : "pts"}, last earns 0. Ties share.</p>
          <button onClick={onStart} className="btn mt-auto bg-amber text-lg text-ink" style={{ borderColor: "#ffbf1f", boxShadow: "0 4px 0 0 #b07f00" }}>
            <Shuffle size={20} /> Shuffle &amp; start
          </button>
        </section>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Round intro */

function RoundIntro({
  round,
  total,
  slug,
  players,
  totals,
  onGo,
}: {
  round: number;
  total: number;
  slug: string;
  players: PlayerConfig[];
  totals: number[];
  onGo: () => void;
}) {
  const game = getGame(slug)!;
  const Art = GAME_ART[slug];
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    sfx.tick();
    btn.current?.focus();
  }, []);
  return (
    <div className="mt-6 grid animate-rise gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-amber">
          Round {round + 1} of {total}
        </p>
        <h1 className="mt-2 font-display text-[clamp(3rem,9vw,7rem)] font-black leading-[0.85] tracking-[-0.05em]">{game.title}</h1>
        <p className="mt-3 font-serif text-2xl italic text-paper/80">{game.tagline}</p>
        <ol className="mt-6 space-y-2 text-lg">
          {game.instructions.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-amber">{i + 1}.</span> {s}
            </li>
          ))}
        </ol>
        <button ref={btn} onClick={onGo} className="btn mt-8 bg-amber text-xl text-ink" style={{ borderColor: "#ffbf1f", boxShadow: "0 4px 0 0 #b07f00" }}>
          <Play size={22} fill="currentColor" /> Let&apos;s go
        </button>
      </div>
      <div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] border-2 border-paper/20" style={{ background: game.theme.bg }}>
          {Art && <Art className="absolute inset-0 h-full w-full" />}
        </div>
        <Scoreboard players={players} totals={totals} className="mt-5" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------- Round results */

function RoundResults({
  record,
  round,
  total,
  players,
  totals,
  onNext,
}: {
  record: RoundRecord;
  round: number;
  total: number;
  players: PlayerConfig[];
  totals: number[];
  onNext: () => void;
}) {
  const game = getGame(record.slug)!;
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const id = setTimeout(() => btn.current?.focus(), 300);
    return () => clearTimeout(id);
  }, []);
  const order = players.map((p, i) => ({ p, rank: record.placements[i], pts: record.points[i] })).sort((a, b) => a.rank - b.rank);
  const last = round + 1 >= total;
  return (
    <div className="mt-6 animate-rise">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-amber">
        Round {round + 1} of {total} · {game.title}
      </p>
      <h1 className="mt-2 font-display text-[clamp(2.4rem,6vw,4.8rem)] font-black leading-[0.9] tracking-[-0.04em]">{record.headline}</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-label="Round standings">
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-paper/60">This round</h2>
          <ol className="mt-3 space-y-2">
            {order.map(({ p, rank, pts }) => (
              <li key={p.index} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: rank === 0 ? p.color : `${p.color}22`, color: rank === 0 ? "#141210" : undefined }}>
                <span className="w-10 font-mono font-bold">#{rank + 1}</span>
                <span className="flex-1 font-display text-xl font-bold">{p.name}</span>
                <span className="font-display text-xl font-black tabular-nums">+{pts}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-label="Tournament scoreboard">
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-paper/60">Scoreboard</h2>
          <Scoreboard players={players} totals={totals} className="mt-3" />
        </section>
      </div>
      <button ref={btn} onClick={onNext} className="btn mt-10 bg-amber text-xl text-ink" style={{ borderColor: "#ffbf1f", boxShadow: "0 4px 0 0 #b07f00" }}>
        {last ? (
          <>
            <Crown size={22} /> Crown the champion
          </>
        ) : (
          <>Next round →</>
        )}
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- Final */

function Final({
  players,
  totals,
  history,
  onRematch,
  onNewParty,
}: {
  players: PlayerConfig[];
  totals: number[];
  history: RoundRecord[];
  onRematch: () => void;
  onNewParty: () => void;
}) {
  const best = Math.max(...totals);
  const champs = players.filter((_, i) => totals[i] === best);
  const champColor = champs[0].color;
  const wins = players.map((_, i) => history.filter((h) => h.placements[i] === 0).length);
  return (
    <div className="relative mt-6 animate-rise">
      <Confetti colors={champs.map((c) => c.color).concat("#f3eee3")} />
      <div className="relative text-center">
        <Crown size={56} className="mx-auto" style={{ color: champColor }} />
        <p className="mt-3 font-mono text-xs font-bold uppercase tracking-[0.3em] text-paper/60">
          {champs.length > 1 ? "Shared champions" : "Party champion"}
        </p>
        <h1 className="mt-2 font-display text-[clamp(3rem,10vw,8rem)] font-black leading-[0.85] tracking-[-0.05em]" style={{ color: champColor }}>
          {champs.map((c) => c.name).join(" & ")}
        </h1>
        <p className="mt-3 font-serif text-2xl italic text-paper/80">
          {best} points across {history.length} rounds.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <Scoreboard players={players} totals={totals} />
        <div className="overflow-x-auto rounded-2xl border border-paper/15">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-paper/60">
                <th className="px-3 py-2">Round</th>
                {players.map((p) => (
                  <th key={p.index} className="px-2 py-2 text-center">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: p.color }} title={p.name} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h, r) => (
                <tr key={r} className="border-t border-paper/10">
                  <td className="px-3 py-2 font-semibold">{getGame(h.slug)?.title}</td>
                  {h.points.map((pt, i) => (
                    <td key={i} className={`px-2 py-2 text-center tabular-nums ${h.placements[i] === 0 ? "font-black" : "text-paper/70"}`}>
                      {pt}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-paper/10 font-mono text-xs text-paper/60">
                <td className="px-3 py-2">Round wins</td>
                {wins.map((w, i) => (
                  <td key={i} className="px-2 py-2 text-center">
                    {w}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button onClick={onRematch} autoFocus className="btn bg-amber text-lg text-ink" style={{ borderColor: "#ffbf1f", boxShadow: "0 4px 0 0 #b07f00" }}>
          <RotateCcw size={20} /> Rematch
        </button>
        <button onClick={onNewParty} className="btn">
          <Users size={20} /> New party
        </button>
        <Link href="/" className="btn">
          <ArrowLeft size={20} /> Home
        </Link>
      </div>
    </div>
  );
}

function Scoreboard({ players, totals, className = "" }: { players: PlayerConfig[]; totals: number[]; className?: string }) {
  const max = Math.max(1, ...totals);
  const order = players.map((p, i) => ({ p, t: totals[i] })).sort((a, b) => b.t - a.t);
  return (
    <ol className={`space-y-2 ${className}`}>
      {order.map(({ p, t }, i) => (
        <li key={p.index} className="relative overflow-hidden rounded-2xl bg-paper/[0.06] px-4 py-3">
          <span
            className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
            style={{ width: `${(t / max) * 100}%`, background: `${p.color}55` }}
            aria-hidden
          />
          <span className="relative flex items-center gap-3">
            <span className="w-6 font-mono text-sm text-paper/60">{i + 1}</span>
            <span className="h-3.5 w-3.5 rounded-full" style={{ background: p.color }} />
            <span className="flex-1 font-display text-lg font-bold">{p.name}</span>
            <span className="font-display text-2xl font-black tabular-nums">{t}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

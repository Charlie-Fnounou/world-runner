"use client";

import { useEffect, useRef } from "react";
import type { GameProps, GameResult, PlayerConfig } from "@/lib/types";
import { useKeys, readPlayer } from "@/lib/input";
import { useGameLoop } from "@/lib/loop";
import { FitCanvas, type FitCanvasHandle } from "@/components/game/FitCanvas";
import { sfx, tone, noise } from "@/lib/sound";
import { H, TRACKS, W, buildTrack } from "./track";
import { LAPS, createRace, finalPlacements, stepRace, type CarInput, type Race, type RaceEvent } from "./sim";
import { ACCENT, INK, PAPER, burst, createRenderState, drawFrame, ensureLayers, fmtSec, updateEffects, type RenderState } from "./draw";

const STEP = 1 / 120;
const GO_TIME = 0.9;
const END_DELAY = 1.8;

let lastTrack = -1;
function pickTrack() {
  let i = Math.floor(Math.random() * TRACKS.length);
  if (i === lastTrack) i = (i + 1 + Math.floor(Math.random() * (TRACKS.length - 1))) % TRACKS.length;
  lastTrack = i;
  return i;
}

interface GameState {
  race: Race;
  rs: RenderState;
  acc: number;
  started: boolean;
  goFlash: number;
  overTimer: number;
  finished: boolean;
  finalLapShown: boolean;
}

function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

export default function MicroRacers({ players, paused, reducedMotion, onFinish }: GameProps) {
  const canvasRef = useRef<FitCanvasHandle>(null);
  const keys = useKeys(true);
  const stateRef = useRef<GameState | null>(null);
  const fontsRef = useRef<{ sans: string; mono: string } | null>(null);

  useEffect(() => {
    // Resolve the site's font stacks for canvas text.
    const probe = (cls: string) => {
      const el = document.createElement("span");
      el.className = cls;
      el.style.position = "absolute";
      el.style.visibility = "hidden";
      document.body.appendChild(el);
      const f = getComputedStyle(el).fontFamily;
      el.remove();
      return f || "system-ui, sans-serif";
    };
    fontsRef.current = { sans: probe("font-display"), mono: probe("font-mono") };
    const st = stateRef.current;
    if (st) {
      st.rs.fontSans = fontsRef.current.sans;
      st.rs.fontMono = fontsRef.current.mono;
      st.rs.staticLayer = null;
    }
  }, []);

  const getState = (): GameState => {
    if (!stateRef.current) {
      const track = buildTrack(TRACKS[pickTrack()]);
      const race = createRace(
        track,
        players.map((p) => p.cpu),
        Math.random,
      );
      const rs = createRenderState(players.length);
      if (fontsRef.current) {
        rs.fontSans = fontsRef.current.sans;
        rs.fontMono = fontsRef.current.mono;
      }
      stateRef.current = { race, rs, acc: 0, started: false, goFlash: 0, overTimer: -1, finished: false, finalLapShown: false };
    }
    return stateRef.current;
  };

  const handleEvents = (st: GameState, events: RaceEvent[]) => {
    const { race, rs } = st;
    for (const ev of events) {
      switch (ev.type) {
        case "boost": {
          const c = race.cars[ev.car];
          tone({ freq: 380, to: 980, duration: 0.25, type: "sawtooth", volume: players[ev.car].cpu ? 0.025 : 0.06 });
          burst(rs, c.x, c.y, reducedMotion ? 4 : 14, ACCENT, 200);
          break;
        }
        case "bump":
          noise(0.06, Math.min(0.12, ev.power / 900));
          burst(rs, ev.x, ev.y, reducedMotion ? 2 : 8, "#ffc43d", 140);
          break;
        case "lap": {
          const c = race.cars[ev.car];
          const p = players[ev.car];
          rs.floats.push({ x: c.x, y: c.y - 36, text: `${ev.best ? "★ " : ""}${ev.time.toFixed(2)}`, color: p.shade, life: 1.6 });
          if (!p.cpu) sfx.tick();
          break;
        }
        case "finalLap":
          if (!st.finalLapShown) {
            st.finalLapShown = true;
            rs.banner = { text: "FINAL LAP", color: ACCENT, life: 1.6, max: 1.6 };
            tone({ freq: 660, duration: 0.12, type: "triangle" });
            tone({ freq: 880, duration: 0.18, type: "triangle", delay: 0.12 });
          }
          break;
        case "finish": {
          const p = players[ev.car];
          const c = race.cars[ev.car];
          burst(rs, c.x, c.y, reducedMotion ? 6 : 24, p.color, 220);
          if (ev.place === 1) {
            rs.banner = { text: `${p.name.toUpperCase()} WINS!`, sub: `${fmtSec(ev.time)} — others have 15 s to finish`, color: p.color, life: 2.6, max: 2.6 };
            sfx.good();
          } else {
            rs.floats.push({ x: c.x, y: c.y - 36, text: `${ordinal(ev.place)}!`, color: p.shade, life: 1.8 });
            if (!p.cpu) sfx.good();
          }
          break;
        }
        case "over":
          st.overTimer = END_DELAY;
          if (!rs.banner) rs.banner = { text: "RACE OVER", color: INK, life: END_DELAY, max: END_DELAY };
          break;
      }
    }
  };

  const finish = (race: Race) => {
    const placements = finalPlacements(race);
    const winnerIdx = placements.indexOf(0);
    const winner = players[winnerIdx];
    const stats = players.map((p: PlayerConfig, i) => {
      const c = race.cars[i];
      return {
        label: `${p.name} best lap`,
        value: c.bestLap !== null ? fmtSec(c.bestLap) : "—",
      };
    });
    stats.push({ label: "Track", value: race.track.def.name });
    const result: GameResult = {
      headline: `${winner.name} takes the checkered flag!`,
      subline: race.cars[winnerIdx].finishTime !== null ? `${LAPS} laps of ${race.track.def.name} in ${fmtSec(race.cars[winnerIdx].finishTime!)}.` : undefined,
      placements,
      stats,
    };
    const humans = players.filter((p) => !p.cpu);
    if (humans.length === 1) {
      const c = race.cars[players.indexOf(humans[0])];
      if (c.finished && c.finishTime !== null) {
        const t = Math.round(c.finishTime * 100) / 100;
        result.score = t;
        result.scoreLabel = `${t.toFixed(2)} s`;
      }
    }
    onFinish(result);
  };

  const render = (st: GameState) => {
    const fit = canvasRef.current;
    const ctx = fit?.ctx;
    if (!ctx) return;
    ensureLayers(st.rs, st.race.track, ctx, players.length);
    drawFrame(ctx, st.rs, st.race, players, { started: st.started, goFlash: st.goFlash });
  };

  useGameLoop((dt) => {
    const st = getState();
    if (!st.started) {
      st.started = true;
      st.goFlash = GO_TIME;
      tone({ freq: 880, duration: 0.25, type: "square", volume: 0.06 });
    }
    st.goFlash = Math.max(0, st.goFlash - dt);
    const inputs: (CarInput | null)[] = players.map((p) => {
      if (p.cpu) return null;
      const a = readPlayer(keys.current, p);
      return { throttle: a.y < 0 ? 1 : 0, brake: a.y > 0 ? 1 : 0, steer: a.x, handbrake: a.action };
    });
    st.acc = Math.min(st.acc + dt, STEP * 10);
    while (st.acc >= STEP) {
      st.acc -= STEP;
      const events = stepRace(st.race, inputs, STEP);
      if (events.length) handleEvents(st, events);
      updateEffects(st.rs, st.race, STEP, reducedMotion);
    }
    if (st.race.phase === "over" && st.overTimer > 0) {
      st.overTimer -= dt;
      if (st.overTimer <= 0 && !st.finished) {
        st.finished = true;
        finish(st.race);
      }
    }
    keys.current.consume();
    render(st);
  }, !paused);

  // While paused (countdown / pause menu) keep the picture up, e.g. after a resize.
  useGameLoop(() => {
    render(getState());
  }, paused);

  return (
    <div className="relative h-full w-full" style={{ background: PAPER }}>
      <FitCanvas ref={canvasRef} width={W} height={H} className="rounded-md shadow-[0_10px_30px_rgba(22,22,26,0.18)]" aria-label="Micro Racers track" role="img" />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import type { GameProps, GameResult, PlayerConfig } from "@/lib/types";
import { readPlayer, useKeys } from "@/lib/input";
import { useGameLoop } from "@/lib/loop";
import { noise, sfx, tone } from "@/lib/sound";
import { randomSeed } from "@/lib/random";
import { FitCanvas, type FitCanvasHandle } from "@/components/game/FitCanvas";
import {
  ACX,
  ACY,
  DASH_COOLDOWN,
  FALL_TIME,
  H,
  PICKUP_R,
  PX_PER_M,
  R_START,
  W,
  WINS_NEEDED,
  champion,
  createArena,
  placementsFor,
  step,
  type ArenaEvent,
  type ArenaState,
  type Bumper,
  type Input,
} from "./logic";

const THEME = { bg: "#1b0f2e", ink: "#fff1f8", accent: "#ff4fa3", accent2: "#5af0ff" };
const DEPTH = 22;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  ring: boolean;
}

interface Banner {
  text: string;
  sub: string;
  color: string;
  t: number;
  dur: number;
}

interface Star {
  a: number;
  d: number;
  s: number;
}

interface FeedItem {
  text: string;
  color: string;
  t: number;
}

interface Fx {
  particles: Particle[];
  shake: number;
  flash: number;
  banner: Banner | null;
  time: number;
  trails: { x: number; y: number; r: number }[][];
  stars: Star[];
  feed: FeedItem[];
}

interface Fonts {
  display: string;
  mono: string;
}

function resolveFonts(): Fonts {
  const cs = getComputedStyle(document.documentElement);
  const d = cs.getPropertyValue("--font-bricolage").trim();
  const m = cs.getPropertyValue("--font-jetbrains").trim();
  return {
    display: `${d ? d + ", " : ""}ui-sans-serif, system-ui, sans-serif`,
    mono: `${m ? m + ", " : ""}ui-monospace, Menlo, monospace`,
  };
}

const shortLabel = (s: string) => s.replace(/\s*\(.*\)\s*/, "").trim();
const kmh = (pxPerSec: number) => Math.round((pxPerSec / PX_PER_M) * 3.6);
const fmtTime = (sec: number) => {
  const t = Math.max(0, Math.floor(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

function newFx(n: number): Fx {
  const stars: Star[] = [];
  for (let i = 0; i < 110; i++) stars.push({ a: Math.random() * Math.PI * 2, d: Math.random() * 800, s: 0.5 + Math.random() * 1.5 });
  return {
    particles: [],
    shake: 0,
    flash: 0,
    banner: { text: "ROUND 1", sub: `First to ${WINS_NEEDED} rounds`, color: THEME.ink, t: 0, dur: 99 },
    time: 0,
    trails: Array.from({ length: n }, () => []),
    stars,
    feed: [],
  };
}

// ------------------------------------------------------------------ effects

function burst(fx: Fx, x: number, y: number, n: number, colors: string[], speed: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    const max = 0.35 + Math.random() * 0.45;
    fx.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, size: 1.5 + Math.random() * 3, color: colors[i % colors.length], ring: false });
  }
}

function ring(fx: Fx, x: number, y: number, color: string, size: number, life = 0.45) {
  fx.particles.push({ x, y, vx: 0, vy: 0, life, max: life, size, color, ring: true });
}

function handleEvents(events: ArenaEvent[], s: ArenaState, fx: Fx, players: PlayerConfig[], reduced: boolean) {
  const shake = (v: number) => {
    fx.shake = Math.max(fx.shake, reduced ? v * 0.15 : v);
  };
  for (const e of events) {
    switch (e.type) {
      case "hit": {
        const k = Math.min(1, e.speed / 650);
        noise(0.06 + k * 0.08, 0.05 + k * 0.12);
        tone({ freq: 140 + k * 120, to: 50, duration: 0.16, type: "square", volume: 0.05 + k * 0.08 });
        burst(fx, e.x, e.y, reduced ? 4 : Math.round(6 + k * 18), [players[e.a].color, players[e.b].color, THEME.ink], 160 + k * 360);
        ring(fx, e.x, e.y, THEME.accent2, 20 + k * 40);
        shake(2 + k * 12);
        if (k > 0.75) fx.flash = Math.max(fx.flash, reduced ? 0.1 : 0.35);
        break;
      }
      case "dash":
        tone({ freq: 220, to: 720, duration: 0.18, type: "sawtooth", volume: 0.035 });
        ring(fx, e.x, e.y, players[e.id].color, 40, 0.3);
        break;
      case "fall": {
        tone({ freq: 640, to: 70, duration: 0.85, type: "triangle", volume: 0.14 });
        noise(0.25, 0.06);
        const p = players[e.id];
        burst(fx, e.x, e.y, reduced ? 6 : 24, [p.color, THEME.accent, THEME.accent2], 260);
        ring(fx, e.x, e.y, THEME.accent, 70, 0.7);
        shake(10);
        fx.feed.push(
          e.by >= 0
            ? { text: `${players[e.by].name}  ▸  ${p.name}`, color: players[e.by].color, t: 0 }
            : { text: `${p.name} fell off`, color: p.color, t: 0 },
        );
        if (fx.feed.length > 5) fx.feed.shift();
        break;
      }
      case "pickup":
        sfx.good();
        tone({ freq: 110, to: 70, duration: 0.3, type: "sine", volume: 0.2 });
        burst(fx, e.x, e.y, reduced ? 6 : 18, [THEME.accent2, "#ffffff"], 220);
        ring(fx, e.x, e.y, THEME.accent2, 60, 0.6);
        break;
      case "spawn":
        tone({ freq: 1200, to: 1800, duration: 0.12, type: "triangle", volume: 0.05 });
        tone({ freq: 1800, to: 2400, duration: 0.12, type: "triangle", volume: 0.04, delay: 0.1 });
        ring(fx, e.x, e.y, THEME.accent2, 40, 0.6);
        break;
      case "fight":
        tone({ freq: 523, duration: 0.12, type: "square", volume: 0.06 });
        tone({ freq: 1046, duration: 0.25, type: "square", volume: 0.06, delay: 0.1 });
        fx.banner = { text: "BUMP!", sub: "", color: THEME.accent, t: 0, dur: 0.8 };
        break;
      case "sudden":
        [0, 0.2, 0.4].forEach((d) => tone({ freq: 880, to: 440, duration: 0.16, type: "sawtooth", volume: 0.05, delay: d }));
        fx.banner = { text: "SUDDEN DEATH", sub: "The platform is collapsing", color: THEME.accent, t: 0, dur: 1.8 };
        shake(6);
        break;
      case "roundEnd": {
        if (s.roundWinner >= 0) {
          const p = players[s.roundWinner];
          const final = s.wins[s.roundWinner] >= WINS_NEEDED;
          if (!final) sfx.win();
          fx.banner = {
            text: final ? `${p.name.toUpperCase()} WINS` : `${p.name.toUpperCase()} TAKES IT`,
            sub: final ? "Champion of the arena" : `Round ${s.round} · ${s.wins[s.roundWinner]}/${WINS_NEEDED}`,
            color: p.color,
            t: 0,
            dur: 2.6,
          };
        } else {
          sfx.bad();
          fx.banner = { text: "DRAW", sub: "Everyone fell at once — replay!", color: THEME.accent2, t: 0, dur: 2.6 };
        }
        break;
      }
      case "end":
        break;
    }
  }
}

function updateFx(fx: Fx, s: ArenaState, dt: number, reduced: boolean) {
  fx.time += dt;
  fx.shake *= Math.exp(-10 * dt);
  if (fx.shake < 0.05) fx.shake = 0;
  fx.flash = Math.max(0, fx.flash - dt * 3);
  if (fx.banner) {
    fx.banner.t += dt;
    if (fx.banner.t > fx.banner.dur) fx.banner = null;
  }
  // next-round banner during the intro phase
  if (s.phase === "intro" && s.round > 1 && (!fx.banner || fx.banner.text !== `ROUND ${s.round}`) && s.phaseT < 0.1) {
    fx.banner = {
      text: `ROUND ${s.round}`,
      sub: s.draws > 0 && s.roundWinner < 0 ? "Replay" : s.wins.some((w) => w === WINS_NEEDED - 1) ? "Match point" : "",
      color: THEME.ink,
      t: 0,
      dur: 99,
    };
  }
  for (const p of fx.particles) {
    p.life -= dt;
    const k = Math.exp(-4 * dt);
    p.vx *= k;
    p.vy *= k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
  for (const it of fx.feed) it.t += dt;
  fx.feed = fx.feed.filter((it) => it.t < 6);
  s.bs.forEach((b, i) => {
    const tr = fx.trails[i];
    const fast = Math.hypot(b.vx, b.vy) > 330 || b.dashT > 0;
    if (b.alive && fast) tr.push({ x: b.x, y: b.y, r: b.r });
    else if (tr.length) tr.shift();
    while (tr.length > 8) tr.shift();
  });
  const warp = reduced ? 20 : 60 + (s.phase === "fight" && s.sudden ? 140 : 0);
  for (const st of fx.stars) {
    st.d += warp * st.s * dt * (0.3 + st.d / 500);
    if (st.d > 820) {
      st.d = 20 + Math.random() * 60;
      st.a = Math.random() * Math.PI * 2;
    }
  }
}

// ------------------------------------------------------------------ drawing

function drawVoid(ctx: CanvasRenderingContext2D, fx: Fx) {
  const g = ctx.createRadialGradient(ACX, ACY + 40, 40, ACX, ACY + 40, 820);
  g.addColorStop(0, "#3a1660");
  g.addColorStop(0.45, "#1b0f2e");
  g.addColorStop(1, "#08040f");
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, W + 80, H + 80);

  // receding neon tunnel rings
  ctx.save();
  ctx.lineWidth = 1.5;
  const phase = (fx.time * 0.35) % 1;
  for (let i = 0; i < 7; i++) {
    const k = (i + phase) / 7;
    const r = 60 + Math.pow(k, 2) * 760;
    ctx.strokeStyle = `rgba(255,79,163,${0.05 + k * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(ACX, ACY + 40 + k * 50, r, r * 0.82, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(90,240,255,0.07)";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(ACX + Math.cos(a) * 60, ACY + 40 + Math.sin(a) * 50);
    ctx.lineTo(ACX + Math.cos(a) * 900, ACY + 40 + Math.sin(a) * 760);
    ctx.stroke();
  }
  ctx.restore();

  // warp stars
  ctx.save();
  ctx.lineCap = "round";
  for (const st of fx.stars) {
    const x = ACX + Math.cos(st.a) * st.d;
    const y = ACY + Math.sin(st.a) * st.d * 0.85;
    const tail = 4 + st.d * 0.03;
    ctx.strokeStyle = `rgba(255,241,248,${Math.min(0.8, st.d / 600)})`;
    ctx.lineWidth = st.s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(st.a) * tail, y - Math.sin(st.a) * tail * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlatform(ctx: CanvasRenderingContext2D, s: ArenaState, fx: Fx) {
  const R = Math.max(0, s.radius);
  // ghost of the original size
  ctx.save();
  ctx.setLineDash([4, 10]);
  ctx.strokeStyle = "rgba(255,79,163,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ACX, ACY, R_START, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  if (R < 1) return;

  // underside / thickness
  const side = ctx.createLinearGradient(0, ACY, 0, ACY + R + DEPTH);
  side.addColorStop(0, "#5a1f6e");
  side.addColorStop(1, "#1c0b2c");
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.arc(ACX, ACY + DEPTH, R, 0, Math.PI);
  ctx.lineTo(ACX - R, ACY);
  ctx.arc(ACX, ACY, R, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,79,163,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ACX, ACY + DEPTH, R, 0, Math.PI);
  ctx.stroke();

  // top surface
  const top = ctx.createRadialGradient(ACX - R * 0.3, ACY - R * 0.4, R * 0.1, ACX, ACY, R);
  top.addColorStop(0, "#4b2a7a");
  top.addColorStop(0.7, "#2c1650");
  top.addColorStop(1, "#22103e");
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.arc(ACX, ACY, R, 0, Math.PI * 2);
  ctx.fill();

  // grid
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(90,240,255,0.13)";
  ctx.lineWidth = 1;
  const step = 40;
  ctx.beginPath();
  for (let x = ACX - Math.ceil(R / step) * step; x <= ACX + R; x += step) {
    ctx.moveTo(x, ACY - R);
    ctx.lineTo(x, ACY + R);
  }
  for (let y = ACY - Math.ceil(R / step) * step; y <= ACY + R; y += step) {
    ctx.moveTo(ACX - R, y);
    ctx.lineTo(ACX + R, y);
  }
  ctx.stroke();
  // centre logo ring
  ctx.strokeStyle = "rgba(255,79,163,0.25)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ACX, ACY, Math.min(70, R * 0.4), 0, Math.PI * 2);
  ctx.stroke();
  // danger band near the edge
  const band = ctx.createRadialGradient(ACX, ACY, Math.max(0, R - 46), ACX, ACY, R);
  band.addColorStop(0, "rgba(255,79,163,0)");
  band.addColorStop(1, "rgba(255,79,163,0.28)");
  ctx.fillStyle = band;
  ctx.fillRect(ACX - R, ACY - R, R * 2, R * 2);
  ctx.restore();

  // neon rim
  const sudden = s.sudden && s.phase === "fight";
  const pulse = sudden ? 0.5 + 0.5 * Math.sin(fx.time * 16) : 0.5 + 0.5 * Math.sin(fx.time * 3);
  ctx.save();
  ctx.shadowColor = THEME.accent;
  ctx.shadowBlur = 18 + pulse * 10;
  ctx.strokeStyle = sudden ? (pulse > 0.5 ? "#ffffff" : THEME.accent) : THEME.accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(ACX, ACY, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,241,248,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ACX, ACY, Math.max(0, R - 2), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, s: ArenaState, fx: Fx, fonts: Fonts) {
  const p = s.pickup;
  if (!p) return;
  const left = p.life - p.t;
  if (left < 2 && Math.floor(fx.time * 8) % 2 === 0) return;
  const pop = Math.min(1, p.t / 0.3);
  const bob = Math.sin(fx.time * 4) * 3;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.scale(pop, pop);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 14 - bob, PICKUP_R, PICKUP_R * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(fx.time * 1.5);
  ctx.shadowColor = THEME.accent2;
  ctx.shadowBlur = 16;
  ctx.fillStyle = THEME.accent2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * PICKUP_R;
    const y = Math.sin(a) * PICKUP_R;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.rotate(-fx.time * 1.5);
  ctx.fillStyle = "#1b0f2e";
  ctx.font = `800 15px ${fonts.display}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("M", 0, 1);
  ctx.restore();
  ctx.save();
  ctx.font = `700 10px ${fonts.mono}`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(90,240,255,0.85)";
  ctx.fillText("MASS", p.x, p.y + bob - PICKUP_R - 8);
  ctx.restore();
}

function drawBumper(ctx: CanvasRenderingContext2D, b: Bumper, p: PlayerConfig, s: ArenaState, fx: Fx, fonts: Fonts, showHint: boolean) {
  let scale = 1;
  let alpha = 1;
  if (!b.alive) {
    if (!b.falling) return;
    const k = Math.min(1, b.fallT / FALL_TIME);
    scale = Math.max(0.02, 1 - k * k * 0.95);
    alpha = Math.max(0, 1 - k);
  }
  const r = b.r * scale;

  // trail
  if (b.alive) {
    fx.trails[b.id].forEach((t, i, arr) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = ((i + 1) / arr.length) * 0.22;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r * 0.9, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  if (b.alive) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(b.x + 3, b.y + 8, r, r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(b.x, b.y);
  if (b.falling) ctx.rotate(b.fallT * 9);
  const sq = b.squash * 0.18;
  ctx.scale(1 + sq, 1 - sq);

  // cooldown ring
  if (b.alive) {
    const ready = 1 - b.dashCd / DASH_COOLDOWN;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
    ctx.stroke();
    if (ready >= 1) {
      const pulse = 0.6 + 0.4 * Math.sin(fx.time * 8 + b.id);
      ctx.strokeStyle = THEME.accent2;
      ctx.globalAlpha = alpha * pulse;
      ctx.shadowColor = THEME.accent2;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = alpha;
    } else {
      ctx.strokeStyle = THEME.accent2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 7, -Math.PI / 2, -Math.PI / 2 + ready * Math.PI * 2);
      ctx.stroke();
    }
  }

  // heavy aura
  if (b.heavyT > 0) {
    const blink = b.heavyT < 1.2 && Math.floor(fx.time * 10) % 2 === 0;
    if (!blink) {
      ctx.strokeStyle = THEME.accent2;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + fx.time * 2;
        ctx.moveTo(Math.cos(a) * (r + 1), Math.sin(a) * (r + 1));
        ctx.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5));
      }
      ctx.stroke();
    }
  }

  // rubber ring
  ctx.fillStyle = p.shade;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // body
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r * 0.8);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.25, p.color);
  g.addColorStop(1, p.color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  // neon outline
  ctx.strokeStyle = b.heavyT > 0 ? THEME.accent2 : "rgba(255,241,248,0.85)";
  ctx.lineWidth = b.heavyT > 0 ? 3 : 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  // headlights in facing direction
  const fa = Math.atan2(b.fy, b.fx);
  ctx.rotate(fa);
  ctx.fillStyle = b.dashT > 0 ? THEME.accent2 : "#fff7c2";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(r * 0.6, side * r * 0.32, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  // seat / driver dome
  ctx.fillStyle = "rgba(20,8,36,0.55)";
  ctx.beginPath();
  ctx.arc(-r * 0.12, 0, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (!b.alive) return;
  // label
  ctx.save();
  ctx.font = `700 13px ${fonts.mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(14,6,26,0.9)";
  ctx.strokeText(p.name, b.x, b.y - r - 12);
  ctx.fillStyle = THEME.ink;
  ctx.fillText(p.name, b.x, b.y - r - 12);
  if (showHint && !p.cpu && fx.time < 3.6) {
    const a = Math.min(1, (3.6 - fx.time) / 0.6);
    const text = `${shortLabel(p.controls.moveLabel)} · ${shortLabel(p.controls.actionLabel)} dash`;
    ctx.globalAlpha = a;
    const tw = ctx.measureText(text).width + 18;
    const by = b.y + r + 14;
    roundRect(ctx, b.x - tw / 2, by, tw, 24, 12);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.fillStyle = "#14081f";
    ctx.textBaseline = "middle";
    ctx.fillText(text, b.x, by + 12.5);
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawParticles(ctx: CanvasRenderingContext2D, fx: Fx) {
  for (const p of fx.particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    if (p.ring) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.15 - a), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx: CanvasRenderingContext2D, s: ArenaState, players: PlayerConfig[], fx: Fx, fonts: Fonts) {
  const n = players.length;
  const cw = 210;
  const gap = 12;
  const total = n * cw + (n - 1) * gap;
  const x0 = (W - total) / 2;
  const y = 16;
  ctx.save();
  players.forEach((p, i) => {
    const b = s.bs[i];
    const x = x0 + i * (cw + gap);
    const out = !b.alive && s.phase !== "intro";
    roundRect(ctx, x, y, cw, 46, 23);
    ctx.fillStyle = out ? "rgba(10,4,20,0.55)" : "rgba(10,4,20,0.8)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = out ? "rgba(255,255,255,0.08)" : p.color;
    ctx.stroke();
    ctx.globalAlpha = out ? 0.45 : 1;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x + 23, y + 23, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `700 14px ${fonts.mono}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = THEME.ink;
    let name = p.name;
    while (ctx.measureText(name).width > cw - 100 && name.length > 3) name = name.slice(0, -2) + "…";
    ctx.fillText(name, x + 42, y + 23);
    // round-win pips
    for (let k = 0; k < WINS_NEEDED; k++) {
      const px = x + cw - 22 - (WINS_NEEDED - 1 - k) * 20;
      ctx.beginPath();
      ctx.arc(px, y + 23, 7, 0, Math.PI * 2);
      if (k < s.wins[i]) {
        ctx.fillStyle = THEME.accent;
        ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(255,241,248,0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    if (out) {
      ctx.globalAlpha = 1;
      ctx.font = `800 11px ${fonts.mono}`;
      ctx.fillStyle = THEME.accent;
      ctx.textAlign = "center";
      ctx.fillText("OUT", x + 23, y + 23);
    }
    ctx.globalAlpha = 1;
  });

  // round + timer (bottom-left)
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 26px ${fonts.display}`;
  ctx.fillStyle = THEME.ink;
  ctx.fillText(`ROUND ${s.round}`, 28, H - 52);
  ctx.font = `700 15px ${fonts.mono}`;
  ctx.fillStyle = s.sudden ? THEME.accent : "rgba(255,241,248,0.7)";
  ctx.fillText(s.sudden ? `${fmtTime(s.roundT)} · SUDDEN DEATH` : fmtTime(s.roundT), 28, H - 28);

  // KO feed (bottom-right)
  ctx.textAlign = "right";
  ctx.font = `700 14px ${fonts.mono}`;
  fx.feed.forEach((it, i) => {
    const a = Math.min(1, (6 - it.t) / 0.8) * Math.min(1, it.t / 0.15);
    ctx.globalAlpha = Math.max(0, a);
    const yy = H - 28 - (fx.feed.length - 1 - i) * 24;
    ctx.fillStyle = it.color;
    ctx.fillText(it.text, W - 28, yy);
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBanner(ctx: CanvasRenderingContext2D, fx: Fx, fonts: Fonts, reduced: boolean) {
  const b = fx.banner;
  if (!b) return;
  const tIn = Math.min(1, b.t / 0.22);
  const ease = 1 - Math.pow(1 - tIn, 3);
  const out = b.dur < 50 ? Math.min(1, (b.dur - b.t) / 0.25) : 1;
  const scale = reduced ? 1 : 0.5 + ease * 0.5 + Math.sin(tIn * Math.PI) * 0.15;
  ctx.save();
  ctx.globalAlpha = Math.max(0, out);
  ctx.translate(W / 2, ACY - 20);
  ctx.scale(scale, scale);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 92px ${fonts.display}`;
  let size = 92;
  while (ctx.measureText(b.text).width > W - 120 && size > 40) {
    size -= 4;
    ctx.font = `800 ${size}px ${fonts.display}`;
  }
  ctx.lineWidth = 12;
  ctx.strokeStyle = "rgba(14,6,26,0.9)";
  ctx.strokeText(b.text, 0, 0);
  if (!reduced) {
    ctx.fillStyle = THEME.accent2;
    ctx.globalAlpha = Math.max(0, out) * 0.6;
    ctx.fillText(b.text, 4, 3);
    ctx.globalAlpha = Math.max(0, out);
  }
  ctx.fillStyle = b.color;
  ctx.fillText(b.text, 0, 0);
  if (b.sub) {
    ctx.font = `700 24px ${fonts.mono}`;
    ctx.lineWidth = 8;
    ctx.strokeText(b.sub, 0, size * 0.75);
    ctx.fillStyle = THEME.ink;
    ctx.fillText(b.sub, 0, size * 0.75);
  }
  ctx.restore();
}

function draw(
  ctx: CanvasRenderingContext2D,
  s: ArenaState,
  fx: Fx,
  players: PlayerConfig[],
  fonts: Fonts,
  reduced: boolean,
  still = false,
) {
  ctx.save();
  if (fx.shake > 0 && !still) ctx.translate((Math.random() - 0.5) * fx.shake * 2, (Math.random() - 0.5) * fx.shake * 2);
  drawVoid(ctx, fx);
  // bodies tumbling into the void go under the platform
  for (const b of s.bs) if (!b.alive && b.falling) drawBumper(ctx, b, players[b.id], s, fx, fonts, false);
  drawPlatform(ctx, s, fx);
  drawPickup(ctx, s, fx, fonts);
  const order = s.bs.filter((b) => b.alive).sort((a, b) => a.y - b.y);
  for (const b of order) drawBumper(ctx, b, players[b.id], s, fx, fonts, true);
  drawParticles(ctx, fx);
  ctx.restore();
  drawHud(ctx, s, players, fx, fonts);
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,241,248,${fx.flash * (reduced ? 0.3 : 0.5)})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawBanner(ctx, fx, fonts, reduced);
}

// ------------------------------------------------------------------ result

function buildResult(s: ArenaState, players: PlayerConfig[]): GameResult {
  const w = champion(s);
  const list = (vals: number[], skipZero: boolean) =>
    players
      .map((p, i) => ({ name: p.name, v: vals[i] }))
      .filter((x) => !skipZero || x.v > 0)
      .sort((a, b) => b.v - a.v)
      .map((x) => `${x.name} ${x.v}`)
      .join(" · ");
  const stats: { label: string; value: string }[] = [
    { label: "Rounds played", value: `${s.roundsPlayed}${s.draws ? ` (${s.draws} draw${s.draws > 1 ? "s" : ""})` : ""}` },
    { label: "Round wins", value: list(s.wins, false) },
    { label: "Knockouts", value: list(s.kos, true) || "None" },
  ];
  if (s.biggestHit) {
    const h = s.biggestHit;
    stats.push({ label: "Biggest hit", value: `${players[h.by].name} → ${players[h.on].name} · ${kmh(h.speed)} km/h` });
  }
  const selfs = list(s.selfFalls, true);
  if (selfs) stats.push({ label: "Fell on their own", value: selfs });
  return {
    headline: `${players[w].name} wins!`,
    subline: `Took ${s.wins[w]} of ${s.roundsPlayed} rounds with ${s.kos[w]} knockout${s.kos[w] === 1 ? "" : "s"}.`,
    placements: placementsFor(s),
    stats,
  };
}

// ------------------------------------------------------------------ component

export default function BumperArena({ players, paused, reducedMotion, onFinish }: GameProps) {
  const canvasRef = useRef<FitCanvasHandle>(null);
  const keys = useKeys(!paused);
  const simRef = useRef<ArenaState | null>(null);
  const fxRef = useRef<Fx | null>(null);
  const fontsRef = useRef<Fonts | null>(null);
  const doneRef = useRef(false);

  useGameLoop((dt) => {
    if (!simRef.current) simRef.current = createArena(players.map((p) => ({ cpu: p.cpu })), randomSeed());
    if (!fxRef.current) fxRef.current = newFx(players.length);
    if (!fontsRef.current) fontsRef.current = resolveFonts();
    const s = simRef.current;
    const fx = fxRef.current;
    const inputs: (Input | null)[] = players.map((p) => {
      if (p.cpu) return null;
      const a = readPlayer(keys.current, p);
      return { x: a.x, y: a.y, action: a.action, actionPressed: a.actionPressed };
    });
    step(s, inputs, dt);
    handleEvents(s.events, s, fx, players, reducedMotion);
    updateFx(fx, s, dt, reducedMotion);
    keys.current.consume();
    const ctx = canvasRef.current?.ctx;
    if (ctx) draw(ctx, s, fx, players, fontsRef.current, reducedMotion);
    if (s.phase === "over" && !doneRef.current) {
      doneRef.current = true;
      onFinish(buildResult(s, players));
    }
  }, !paused);

  // Keep a still frame on screen while frozen (countdown, pause, resize).
  useEffect(() => {
    if (!paused) return;
    let raf = 0;
    const frame = () => {
      if (!simRef.current) simRef.current = createArena(players.map((p) => ({ cpu: p.cpu })), randomSeed());
      if (!fxRef.current) fxRef.current = newFx(players.length);
      if (!fontsRef.current) fontsRef.current = resolveFonts();
      const ctx = canvasRef.current?.ctx;
      if (ctx) draw(ctx, simRef.current, fxRef.current, players, fontsRef.current, reducedMotion, true);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [paused, players, reducedMotion]);

  return (
    <div className="relative h-full w-full">
      <FitCanvas ref={canvasRef} width={W} height={H} />
    </div>
  );
}

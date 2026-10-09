"use client";

import { useEffect, useRef } from "react";
import type { GameProps, GameResult, PlayerConfig } from "@/lib/types";
import { readPlayer, useKeys } from "@/lib/input";
import { useGameLoop } from "@/lib/loop";
import { noise, sfx, tone } from "@/lib/sound";
import { randomSeed } from "@/lib/random";
import { FitCanvas, type FitCanvasHandle } from "@/components/game/FitCanvas";
import {
  BALL_R,
  CX,
  CY,
  FIELD,
  GOAL_DEPTH,
  GOAL_HALF,
  H,
  PLAYER_R,
  W,
  createMatch,
  placementsFor,
  step,
  teamLabel,
  type Footballer,
  type Input,
  type MatchEvent,
  type MatchState,
  type Team,
} from "./logic";

const THEME = { bg: "#0e3b22", ink: "#f2fff4", accent: "#e9ff57", accent2: "#ffffff" };
const BOT_FILL = "#dfe9e2";
const KICK_READY = PLAYER_R + BALL_R + 16;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "dot" | "confetti" | "ring";
  rot: number;
  vr: number;
  g: number;
}

interface Banner {
  text: string;
  sub: string;
  color: string;
  t: number;
  dur: number;
}

interface Fx {
  particles: Particle[];
  shake: number;
  flash: number;
  bump: [number, number];
  banner: Banner | null;
  time: number;
  trail: { x: number; y: number }[];
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

function teamColors(s: MatchState, players: PlayerConfig[], t: Team): string[] {
  const c = s.fs.filter((f) => f.team === t && f.playerIndex >= 0).map((f) => players[f.playerIndex].color);
  return c.length ? c : [BOT_FILL];
}

function nameOf(s: MatchState, players: PlayerConfig[], id: number): string {
  const f = s.fs[id];
  if (!f) return "Unknown";
  if (f.playerIndex >= 0) return players[f.playerIndex].name;
  return f.role === "keeper" ? "Keeper bot" : "Bot";
}

const fmtTime = (sec: number) => {
  const t = Math.max(0, Math.ceil(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// ------------------------------------------------------------------ effects

function burst(fx: Fx, x: number, y: number, n: number, colors: string[], speed: number, kind: Particle["kind"], g = 0) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.35 + Math.random() * 0.65);
    const max = kind === "confetti" ? 1.4 + Math.random() * 1.2 : 0.35 + Math.random() * 0.35;
    fx.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: max,
      max,
      size: kind === "confetti" ? 5 + Math.random() * 6 : 2 + Math.random() * 3,
      color: colors[i % colors.length],
      kind,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 12,
      g,
    });
  }
}

function ring(fx: Fx, x: number, y: number, color: string, size: number) {
  fx.particles.push({ x, y, vx: 0, vy: 0, life: 0.35, max: 0.35, size, color, kind: "ring", rot: 0, vr: 0, g: 0 });
}

function handleEvents(events: MatchEvent[], s: MatchState, fx: Fx, players: PlayerConfig[], reduced: boolean) {
  const shake = (v: number) => {
    fx.shake = Math.max(fx.shake, reduced ? v * 0.15 : v);
  };
  for (const e of events) {
    switch (e.type) {
      case "kick": {
        tone({ freq: e.shot ? 210 : 170, to: 55, duration: 0.14, type: "sine", volume: 0.28 });
        noise(0.05, e.shot ? 0.09 : 0.05);
        burst(fx, e.x, e.y, reduced ? 4 : 10, ["#bfe8a8", "#e9ff57", "#ffffff"], 220, "dot");
        ring(fx, e.x, e.y, THEME.accent, 34);
        shake(e.shot ? 5 : 3);
        break;
      }
      case "whiff":
        noise(0.05, 0.025);
        ring(fx, e.x, e.y, "rgba(255,255,255,0.6)", 18);
        break;
      case "wall":
        tone({ freq: 150, to: 90, duration: 0.07, type: "triangle", volume: Math.min(0.14, e.speed / 4500) });
        burst(fx, e.x, e.y, reduced ? 2 : 5, ["#ffffff", "#bfe8a8"], 120, "dot");
        break;
      case "post":
        tone({ freq: 920, to: 700, duration: 0.3, type: "square", volume: 0.05 });
        tone({ freq: 1380, duration: 0.18, type: "triangle", volume: 0.04 });
        shake(6);
        ring(fx, e.x, e.y, "#ffffff", 26);
        break;
      case "touch":
        tone({ freq: 110, to: 70, duration: 0.06, type: "sine", volume: 0.12 });
        break;
      case "bump":
        noise(0.05, Math.min(0.07, e.speed / 6000));
        burst(fx, e.x, e.y, reduced ? 2 : 6, ["#ffffff", "#bfe8a8"], 140, "dot");
        shake(Math.min(5, e.speed / 90));
        break;
      case "goal": {
        sfx.boom();
        noise(1.3, 0.06);
        [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, duration: 0.2, type: "triangle", volume: 0.12, delay: 0.12 + i * 0.09 }));
        const colors = [...teamColors(s, players, e.team), "#ffffff", THEME.accent];
        const gx = e.team === 0 ? FIELD.right : FIELD.left;
        burst(fx, gx, CY, reduced ? 30 : 140, colors, 520, "confetti", 260);
        if (!reduced) burst(fx, CX, FIELD.top + 10, 50, colors, 380, "confetti", 260);
        fx.flash = reduced ? 0.25 : 1;
        shake(16);
        fx.bump[e.team] = 1;
        const who = e.scorer >= 0 ? nameOf(s, players, e.scorer) : "";
        const sub = e.own
          ? `Own goal${who ? ` by ${who}` : ""}`
          : `${who}${e.distM >= 1 ? ` · ${e.distM.toFixed(1)} m` : ""}`;
        fx.banner = { text: s.golden ? "GOLDEN GOAL!" : "GOAL!", sub, color: teamColors(s, players, e.team)[0], t: 0, dur: 1.7 };
        break;
      }
      case "kickoff":
        tone({ freq: 2300, duration: 0.16, type: "square", volume: 0.035 });
        break;
      case "golden":
        tone({ freq: 2300, duration: 0.2, type: "square", volume: 0.035 });
        tone({ freq: 2300, duration: 0.5, type: "square", volume: 0.035, delay: 0.28 });
        fx.banner = { text: "GOLDEN GOAL", sub: "Sudden death — next goal wins", color: THEME.accent, t: 0, dur: 2.4 };
        shake(6);
        break;
      case "end":
        [0, 0.25, 0.5].forEach((d, i) => tone({ freq: 2300, duration: i === 2 ? 0.6 : 0.18, type: "square", volume: 0.035, delay: d }));
        fx.banner = { text: "FULL TIME", sub: "", color: THEME.accent2, t: 0, dur: 99 };
        break;
    }
  }
}

function updateFx(fx: Fx, s: MatchState, dt: number) {
  fx.time += dt;
  fx.shake *= Math.exp(-9 * dt);
  if (fx.shake < 0.05) fx.shake = 0;
  fx.flash = Math.max(0, fx.flash - dt * 2.2);
  fx.bump[0] = Math.max(0, fx.bump[0] - dt * 1.6);
  fx.bump[1] = Math.max(0, fx.bump[1] - dt * 1.6);
  if (fx.banner) {
    fx.banner.t += dt;
    if (fx.banner.t > fx.banner.dur) fx.banner = null;
  }
  const slow = s.phase === "goal" && s.phaseT < 0.75 ? 0.35 : 1;
  for (const p of fx.particles) {
    const pdt = p.kind === "confetti" ? dt * slow : dt;
    p.life -= pdt;
    p.vy += p.g * pdt;
    const drag = Math.exp(-(p.kind === "confetti" ? 1.8 : 5) * pdt);
    p.vx *= drag;
    p.vy *= drag;
    p.x += p.vx * pdt;
    p.y += p.vy * pdt;
    p.rot += p.vr * pdt;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
  const b = s.ball;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > 380) fx.trail.push({ x: b.x, y: b.y });
  else if (fx.trail.length) fx.trail.shift();
  while (fx.trail.length > 10) fx.trail.shift();
}

// ------------------------------------------------------------------ drawing

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPitch(ctx: CanvasRenderingContext2D, s: MatchState, players: PlayerConfig[], fx: Fx) {
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(-40, -40, W + 80, H + 80);
  // stand / surround texture
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let x = -40; x < W + 40; x += 24) ctx.fillRect(x, FIELD.top - 18, 12, 4);
  const fw = FIELD.right - FIELD.left;
  const fh = FIELD.bottom - FIELD.top;
  // drop shadow under pitch
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(FIELD.left - 6, FIELD.top + 8, fw + 12, fh + 6);
  // stripes
  const n = 12;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#17603a" : "#145533";
    ctx.fillRect(FIELD.left + (fw / n) * i, FIELD.top, fw / n + 1, fh);
  }
  // diagonal mow sheen
  ctx.save();
  ctx.beginPath();
  ctx.rect(FIELD.left, FIELD.top, fw, fh);
  ctx.clip();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#ffffff";
  for (let x = FIELD.left - fh; x < FIELD.right; x += 140) {
    ctx.beginPath();
    ctx.moveTo(x, FIELD.bottom);
    ctx.lineTo(x + 50, FIELD.bottom);
    ctx.lineTo(x + 50 + fh, FIELD.top);
    ctx.lineTo(x + fh, FIELD.top);
    ctx.fill();
  }
  ctx.restore();

  // goals (nets behind the line), tinted with the defending team colour
  for (const t of [0, 1] as Team[]) {
    const left = t === 0;
    const x0 = left ? FIELD.left - GOAL_DEPTH : FIELD.right;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x0, CY - GOAL_HALF, GOAL_DEPTH, GOAL_HALF * 2);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = teamColors(s, players, t)[0];
    ctx.fillRect(x0, CY - GOAL_HALF, GOAL_DEPTH, GOAL_HALF * 2);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = CY - GOAL_HALF; y <= CY + GOAL_HALF; y += 10) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + GOAL_DEPTH, y);
    }
    for (let x = x0; x <= x0 + GOAL_DEPTH; x += 10) {
      ctx.moveTo(x, CY - GOAL_HALF);
      ctx.lineTo(x, CY + GOAL_HALF);
    }
    ctx.stroke();
    ctx.restore();
  }

  // lines
  ctx.save();
  ctx.strokeStyle = "rgba(242,255,244,0.78)";
  ctx.lineWidth = 3;
  ctx.strokeRect(FIELD.left, FIELD.top, fw, fh);
  ctx.beginPath();
  ctx.moveTo(CX, FIELD.top);
  ctx.lineTo(CX, FIELD.bottom);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CX, CY, 82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(242,255,244,0.85)";
  ctx.beginPath();
  ctx.arc(CX, CY, 5, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    const gx = side < 0 ? FIELD.left : FIELD.right;
    const boxW = 150;
    const boxH = 300;
    ctx.strokeRect(side < 0 ? gx : gx - boxW, CY - boxH / 2, boxW, boxH);
    ctx.strokeRect(side < 0 ? gx : gx - 60, CY - 120, 60, 240);
    ctx.beginPath();
    ctx.arc(gx - side * 110, CY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    if (side < 0) ctx.arc(gx + boxW - 40, CY, 70, -0.95, 0.95);
    else ctx.arc(gx - boxW + 40, CY, 70, Math.PI - 0.95, Math.PI + 0.95);
    ctx.stroke();
    // corner arcs
    for (const cy of [FIELD.top, FIELD.bottom]) {
      ctx.beginPath();
      const a0 = side < 0 ? (cy === FIELD.top ? 0 : -Math.PI / 2) : cy === FIELD.top ? Math.PI / 2 : Math.PI;
      ctx.arc(gx, cy, 16, a0, a0 + Math.PI / 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // goal frames
  ctx.save();
  ctx.strokeStyle = THEME.accent2;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (const left of [true, false]) {
    const gx = left ? FIELD.left : FIELD.right;
    const bx = left ? gx - GOAL_DEPTH : gx + GOAL_DEPTH;
    ctx.beginPath();
    ctx.moveTo(gx, CY - GOAL_HALF);
    ctx.lineTo(bx, CY - GOAL_HALF);
    ctx.lineTo(bx, CY + GOAL_HALF);
    ctx.lineTo(gx, CY + GOAL_HALF);
    ctx.stroke();
    ctx.fillStyle = THEME.accent2;
    for (const py of [CY - GOAL_HALF, CY + GOAL_HALF]) {
      ctx.beginPath();
      ctx.arc(gx, py, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  if (s.golden) {
    const pulse = 0.5 + 0.5 * Math.sin(fx.time * 6);
    ctx.save();
    ctx.strokeStyle = THEME.accent;
    ctx.globalAlpha = 0.35 + pulse * 0.4;
    ctx.lineWidth = 8;
    ctx.strokeRect(FIELD.left - 8, FIELD.top - 8, fw + 16, fh + 16);
    ctx.restore();
  }
}

function drawFootballer(ctx: CanvasRenderingContext2D, f: Footballer, s: MatchState, players: PlayerConfig[], fx: Fx, fonts: Fonts) {
  const p = f.playerIndex >= 0 ? players[f.playerIndex] : null;
  const team = teamColors(s, players, f.team)[0];
  const fill = p ? p.color : BOT_FILL;
  const stroke = p ? p.shade : team;
  const sp = Math.hypot(f.vx, f.vy);
  const ang = Math.atan2(f.vy, f.vx);
  const stretch = Math.min(0.12, sp / 2600);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(f.x + 4, f.y + 7, f.r * 1.02, f.r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // kick-ready glow
  const ball = s.ball;
  const near = Math.hypot(ball.x - f.x, ball.y - f.y) < KICK_READY + (f.r - PLAYER_R);
  if (near && f.kickCd <= 0 && s.phase === "play") {
    const pulse = 0.5 + 0.5 * Math.sin(fx.time * 18);
    ctx.save();
    ctx.strokeStyle = THEME.accent;
    ctx.globalAlpha = 0.45 + 0.4 * pulse;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -fx.time * 30;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(ang);
  ctx.scale(1 + stretch, 1 - stretch * 0.7);
  ctx.rotate(-ang);
  // body
  const g = ctx.createRadialGradient(-f.r * 0.35, -f.r * 0.4, f.r * 0.1, 0, 0, f.r);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.35, fill);
  g.addColorStop(1, fill);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, f.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  if (!p) {
    // bots wear a team-coloured sash
    ctx.save();
    ctx.clip();
    ctx.fillStyle = team;
    ctx.rotate(-0.7);
    ctx.fillRect(-f.r, -5, f.r * 2, 10);
    ctx.restore();
  }
  // boot / facing nose
  const fa = Math.atan2(f.fy, f.fx);
  ctx.rotate(fa);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(f.r + 7, 0);
  ctx.lineTo(f.r - 3, -7);
  ctx.lineTo(f.r - 3, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // kick flash
  if (f.kickFlash > 0) {
    ctx.save();
    ctx.globalAlpha = f.kickFlash;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4 * f.kickFlash;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r + 4 + (1 - f.kickFlash) * 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // label
  const label = p ? p.name : f.role === "keeper" ? "KEEPER BOT" : "BOT";
  ctx.font = `700 13px ${fonts.mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(6,30,16,0.85)";
  ctx.strokeText(label, f.x, f.y - f.r - 8);
  ctx.fillStyle = p ? THEME.ink : "rgba(242,255,244,0.75)";
  ctx.fillText(label, f.x, f.y - f.r - 8);

  // key hint for humans during the first seconds
  if (p && !p.cpu && fx.time < 3.6) {
    const a = Math.min(1, (3.6 - fx.time) / 0.6);
    const text = `${shortLabel(p.controls.moveLabel)} · ${shortLabel(p.controls.actionLabel)}`;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `700 13px ${fonts.mono}`;
    const tw = ctx.measureText(text).width + 18;
    const by = f.y + f.r + 12;
    roundRect(ctx, f.x - tw / 2, by, tw, 24, 12);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.fillStyle = "#0b1f12";
    ctx.textBaseline = "middle";
    ctx.fillText(text, f.x, by + 12.5);
    ctx.restore();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, s: MatchState, fx: Fx) {
  const b = s.ball;
  fx.trail.forEach((p, i) => {
    ctx.fillStyle = `rgba(233,255,87,${((i + 1) / fx.trail.length) * 0.35})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, BALL_R * ((i + 1) / fx.trail.length) * 0.9, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(b.x + 3, b.y + 5, BALL_R, BALL_R * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.beginPath();
  ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.clip();
  // rolling patches
  const dir = Math.atan2(b.vy, b.vx);
  ctx.rotate(dir);
  ctx.fillStyle = "#1b2a20";
  const off = ((b.spin * BALL_R) % (BALL_R * 2.4)) - BALL_R * 1.2;
  for (const dx of [off, off + BALL_R * 2.4, off - BALL_R * 2.4]) {
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const px = dx + Math.cos(a) * 4;
      const py = Math.sin(a) * 4;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx + 2, BALL_R - 1, 3, 0, Math.PI * 2);
    ctx.arc(dx + 2, -BALL_R + 1, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
  ctx.stroke();
}

function drawParticles(ctx: CanvasRenderingContext2D, fx: Fx) {
  for (const p of fx.particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.save();
    ctx.globalAlpha = p.kind === "confetti" ? Math.min(1, a * 2) : a;
    if (p.kind === "ring") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.2 - a), 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === "confetti") {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.abs(Math.cos(p.rot * 1.7)) + 0.15);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawHud(ctx: CanvasRenderingContext2D, s: MatchState, players: PlayerConfig[], fx: Fx, fonts: Fonts) {
  const names = players.map((p) => p.name);
  const pw = 560;
  const ph = 80;
  const x = CX - pw / 2;
  const y = 18;
  ctx.save();
  roundRect(ctx, x, y, pw, ph, 22);
  ctx.fillStyle = "rgba(4,22,12,0.72)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(242,255,244,0.14)";
  ctx.stroke();

  for (const t of [0, 1] as Team[]) {
    const left = t === 0;
    const colors = teamColors(s, players, t);
    // colour bar
    const bx = left ? x + 18 : x + pw - 18 - 8;
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      roundRect(ctx, bx, y + 14 + i * (52 / colors.length), 8, 52 / colors.length - 3, 3);
      ctx.fill();
    });
    // team name
    ctx.font = `700 13px ${fonts.mono}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = left ? "left" : "right";
    ctx.fillStyle = "rgba(242,255,244,0.8)";
    let label = teamLabel(s.fs, t, names).toUpperCase();
    while (ctx.measureText(label).width > 150 && label.length > 4) label = label.slice(0, -2) + "…";
    ctx.fillText(label, left ? x + 36 : x + pw - 36, y + ph / 2);
    // score digits
    const bump = fx.bump[t];
    const sc = 1 + Math.sin(bump * Math.PI) * 0.45;
    ctx.save();
    ctx.translate(left ? CX - 92 : CX + 92, y + ph / 2 + 3);
    ctx.scale(sc, sc);
    ctx.font = `800 50px ${fonts.display}`;
    ctx.textAlign = "center";
    ctx.fillStyle = bump > 0.05 ? THEME.accent : THEME.ink;
    ctx.fillText(String(s.score[t]), 0, 0);
    ctx.restore();
  }
  // timer
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (s.golden) {
    const pulse = 0.75 + 0.25 * Math.sin(fx.time * 6);
    ctx.font = `800 15px ${fonts.display}`;
    ctx.fillStyle = THEME.accent;
    ctx.globalAlpha = pulse;
    ctx.fillText("GOLDEN", CX, y + ph / 2 - 10);
    ctx.fillText("GOAL", CX, y + ph / 2 + 10);
    ctx.globalAlpha = 1;
  } else {
    const low = s.remaining <= 10;
    ctx.font = `700 26px ${fonts.mono}`;
    ctx.fillStyle = low && Math.floor(s.remaining * 2) % 2 === 0 ? THEME.accent : THEME.ink;
    ctx.fillText(fmtTime(s.remaining), CX, y + ph / 2 - 6);
    ctx.font = `600 10px ${fonts.mono}`;
    ctx.fillStyle = "rgba(242,255,244,0.55)";
    ctx.fillText("FIRST TO 3", CX, y + ph / 2 + 19);
  }
  ctx.restore();
}

function drawBanner(ctx: CanvasRenderingContext2D, fx: Fx, fonts: Fonts, reduced: boolean) {
  const b = fx.banner;
  if (!b) return;
  const tIn = Math.min(1, b.t / 0.25);
  const ease = 1 - Math.pow(1 - tIn, 3);
  const out = b.dur < 50 ? Math.min(1, (b.dur - b.t) / 0.3) : 1;
  const scale = reduced ? 1 : 0.6 + ease * 0.4 + Math.sin(tIn * Math.PI) * 0.12;
  ctx.save();
  ctx.globalAlpha = Math.max(0, out);
  ctx.translate(CX, CY - 10);
  ctx.rotate(reduced ? 0 : -0.05);
  ctx.scale(scale, scale);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 104px ${fonts.display}`;
  ctx.lineWidth = 14;
  ctx.strokeStyle = "rgba(4,22,12,0.85)";
  ctx.strokeText(b.text, 0, 0);
  ctx.fillStyle = b.color;
  ctx.fillText(b.text, 0, 0);
  if (b.sub) {
    ctx.font = `700 26px ${fonts.mono}`;
    ctx.lineWidth = 8;
    ctx.strokeText(b.sub, 0, 74);
    ctx.fillStyle = THEME.ink;
    ctx.fillText(b.sub, 0, 74);
  }
  ctx.restore();
}

function draw(ctx: CanvasRenderingContext2D, s: MatchState, fx: Fx, players: PlayerConfig[], fonts: Fonts, reduced: boolean, still = false) {
  ctx.save();
  if (fx.shake > 0 && !still) {
    ctx.translate((Math.random() - 0.5) * fx.shake * 2, (Math.random() - 0.5) * fx.shake * 2);
  }
  drawPitch(ctx, s, players, fx);
  drawBall(ctx, s, fx);
  const order = [...s.fs].sort((a, b) => a.y - b.y);
  for (const f of order) drawFootballer(ctx, f, s, players, fx, fonts);
  drawParticles(ctx, fx);
  ctx.restore();
  drawHud(ctx, s, players, fx, fonts);
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${fx.flash * (reduced ? 0.15 : 0.55)})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawBanner(ctx, fx, fonts, reduced);
}

// ------------------------------------------------------------------ result

function buildResult(s: MatchState, players: PlayerConfig[]): GameResult {
  const names = players.map((p) => p.name);
  const w = (s.winner ?? 0) as Team;
  const label = (t: Team) => teamLabel(s.fs, t, names);
  const humansOnWinner = s.fs.filter((f) => f.team === w && f.playerIndex >= 0).length;
  const headline = `${label(w)} ${humansOnWinner > 1 ? "win" : "wins"}!`;
  let subline: string;
  if (s.golden && s.score[0] === s.score[1]) {
    subline = "Sudden-death stalemate — decided on possession.";
  } else if (s.golden && s.lastGoal) {
    const who = s.lastGoal.scorer >= 0 ? nameOf(s, players, s.lastGoal.scorer) : "";
    subline = s.lastGoal.own ? `Decided by a golden own goal${who ? ` from ${who}` : ""}.` : `Golden goal from ${who}!`;
  } else if (s.score[w] >= 3) {
    subline = `First to three in ${fmtTime(s.elapsed)}.`;
  } else {
    subline = `Ahead when the whistle blew.`;
  }
  const poss = s.possession[0] + s.possession[1];
  const p0 = poss > 0 ? Math.round((s.possession[0] / poss) * 100) : 50;
  const stats: { label: string; value: string }[] = [
    { label: "Score", value: `${s.score[0]} – ${s.score[1]}` },
    { label: "Possession", value: `${p0}% – ${100 - p0}%` },
    { label: "Shots", value: `${s.shots[0]} – ${s.shots[1]}` },
  ];
  const maxGoals = Math.max(0, ...s.fs.map((f) => f.goals));
  if (maxGoals > 0) {
    const top = s.fs.filter((f) => f.goals === maxGoals).map((f) => nameOf(s, players, f.id));
    stats.push({ label: top.length > 1 ? "Top scorers" : "Top scorer", value: `${top.join(", ")} ×${maxGoals}` });
  }
  if (s.longestGoal) {
    stats.push({ label: "Longest goal", value: `${s.longestGoal.m.toFixed(1)} m · ${nameOf(s, players, s.longestGoal.by)}` });
  }
  stats.push({ label: "Match time", value: fmtTime(s.elapsed) });
  return { headline, subline, placements: placementsFor(s, players.length), stats: stats.slice(0, 6) };
}

// ------------------------------------------------------------------ component

export default function MiniFootball({ players, paused, reducedMotion, onFinish }: GameProps) {
  const canvasRef = useRef<FitCanvasHandle>(null);
  const keys = useKeys(!paused);
  const simRef = useRef<MatchState | null>(null);
  const fxRef = useRef<Fx>({ particles: [], shake: 0, flash: 0, bump: [0, 0], banner: null, time: 0, trail: [] });
  const fontsRef = useRef<Fonts | null>(null);
  const doneRef = useRef(false);

  const ensure = () => {
    if (!simRef.current) simRef.current = createMatch(players.map((p, i) => ({ index: i, cpu: p.cpu })), randomSeed());
    if (!fontsRef.current) fontsRef.current = resolveFonts();
    return { s: simRef.current, fonts: fontsRef.current };
  };

  useGameLoop((dt) => {
    const { s, fonts } = ensure();
    const fx = fxRef.current;
    const inputs: (Input | null)[] = players.map((p) => {
      if (p.cpu) return null;
      const a = readPlayer(keys.current, p);
      return { x: a.x, y: a.y, action: a.action, actionPressed: a.actionPressed };
    });
    step(s, inputs, dt);
    handleEvents(s.events, s, fx, players, reducedMotion);
    updateFx(fx, s, dt);
    keys.current.consume();
    const ctx = canvasRef.current?.ctx;
    if (ctx) draw(ctx, s, fx, players, fonts, reducedMotion);
    if (s.phase === "over" && !doneRef.current) {
      doneRef.current = true;
      onFinish(buildResult(s, players));
    }
  }, !paused);

  // Keep the frozen frame visible (countdown, pause, resizes) while the loop is stopped.
  useEffect(() => {
    if (!paused) return;
    let raf = 0;
    const frame = () => {
      if (!simRef.current) simRef.current = createMatch(players.map((p, i) => ({ index: i, cpu: p.cpu })), randomSeed());
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
      <FitCanvas ref={canvasRef} width={W} height={H} className="rounded-xl" />
    </div>
  );
}

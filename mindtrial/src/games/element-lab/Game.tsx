"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, FlaskConical, Flag, Minus, Plus, Sparkles, Trash2, X } from "lucide-react";
import { FitCanvas, type FitCanvasHandle } from "@/components/game/FitCanvas";
import { useGameLoop } from "@/lib/loop";
import { randomSeed } from "@/lib/random";
import { noise, tone } from "@/lib/sound";
import type { GameProps } from "@/lib/types";
import { ERASER, PALETTE, REACTIONS, SAND } from "./elements";
import { GLOW_SCALE, makeBuffers, renderSim, type RenderBuffers } from "./render";
import { SCENES } from "./scenes";
import { Sim } from "./sim";

const THEME = { bg: "#14110f", ink: "#f6efe2", accent: "#ff9b3d", accent2: "#3dc6ff" };
const TARGET_CELLS = 27000;
const STEP = 1 / 60;
const MIN_BRUSH = 1;
const MAX_BRUSH = 14;

function gridFor(w: number, h: number) {
  const aspect = Math.max(0.4, Math.min(3, w / h));
  let cols = Math.round(Math.sqrt(TARGET_CELLS * aspect));
  let rows = Math.round(cols / aspect);
  cols = Math.max(80, Math.min(280, cols));
  rows = Math.max(80, Math.min(240, rows));
  return { w: cols, h: rows };
}

function popcount(n: number) {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}

function formatTime(sec: number) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface Toast {
  id: number;
  reaction: number;
}

interface GfxState {
  pixCanvas: HTMLCanvasElement;
  pixCtx: CanvasRenderingContext2D;
  pixImage: ImageData;
  glowCanvas: HTMLCanvasElement;
  glowCtx: CanvasRenderingContext2D;
  glowImage: ImageData;
  buffers: RenderBuffers;
}

export default function ElementLab({ paused, reducedMotion, onFinish }: GameProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<FitCanvasHandle>(null);
  const simRef = useRef<Sim | null>(null);
  const gfxRef = useRef<GfxState | null>(null);

  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [selected, setSelected] = useState(SAND);
  const [brush, setBrush] = useState(3);
  const [found, setFound] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const selRef = useRef(SAND);
  const brushRef = useRef(3);
  const foundRef = useRef(0);
  const touchedRef = useRef(false);
  const finishedRef = useRef(false);
  const ptr = useRef({ down: false, erase: false, hover: false, x: 0, y: 0, lx: 0, ly: 0 });
  const stats = useRef({ placed: 0, used: new Set<number>(), time: 0, frame: 0, acc: 0 });
  const sound = useRef({ sizzle: 0, ignite: 0, fizz: 0 });
  const toastId = useRef(0);

  // Pick a grid size that matches the stage's aspect ratio (once, at mount).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) return;
      setDims((d) => d ?? gridFor(r.width, r.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Create the simulation and offscreen render targets once the size is known.
  useEffect(() => {
    if (!dims) return;
    const sim = new Sim(dims.w, dims.h, randomSeed());
    simRef.current = sim;
    const pixCanvas = document.createElement("canvas");
    pixCanvas.width = dims.w;
    pixCanvas.height = dims.h;
    const pixCtx = pixCanvas.getContext("2d");
    const glowCanvas = document.createElement("canvas");
    const gw = Math.ceil(dims.w / GLOW_SCALE);
    const gh = Math.ceil(dims.h / GLOW_SCALE);
    glowCanvas.width = gw;
    glowCanvas.height = gh;
    const glowCtx = glowCanvas.getContext("2d");
    if (!pixCtx || !glowCtx) return;
    const pixImage = pixCtx.createImageData(dims.w, dims.h);
    const glowImage = glowCtx.createImageData(gw, gh);
    const buffers = makeBuffers(dims.w, dims.h, new Uint32Array(pixImage.data.buffer), new Uint32Array(glowImage.data.buffer));
    gfxRef.current = { pixCanvas, pixCtx, pixImage, glowCanvas, glowCtx, glowImage, buffers };
    return () => {
      simRef.current = null;
      gfxRef.current = null;
    };
  }, [dims]);

  const markTouched = useCallback(() => {
    if (touchedRef.current) return;
    touchedRef.current = true;
    setTouched(true);
  }, []);

  const pushToasts = useCallback((bits: number) => {
    const fresh: Toast[] = [];
    for (let b = 0; b < REACTIONS.length; b++) {
      if ((bits >> b) & 1) fresh.push({ id: ++toastId.current, reaction: b });
    }
    if (!fresh.length) return;
    setToasts((t) => [...t, ...fresh].slice(-4));
    fresh.forEach((f) => {
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== f.id)), 3400);
    });
    // Discovery jingle.
    tone({ freq: 523, duration: 0.1, type: "triangle", volume: 0.12 });
    tone({ freq: 784, duration: 0.12, type: "triangle", volume: 0.12, delay: 0.08 });
    tone({ freq: 1175, duration: 0.22, type: "sine", volume: 0.1, delay: 0.16 });
  }, []);

  useGameLoop((dt) => {
    const sim = simRef.current;
    const gfx = gfxRef.current;
    if (!sim || !gfx) return;
    const st = stats.current;
    st.time += dt;
    st.frame++;

    // Paint along the pointer path.
    const p = ptr.current;
    if (p.down) {
      const el = p.erase ? ERASER : selRef.current;
      const n = sim.paintLine(p.lx, p.ly, p.x, p.y, brushRef.current, el);
      p.lx = p.x;
      p.ly = p.y;
      if (n > 0 && el !== ERASER) {
        st.placed += n;
        st.used.add(el);
        markTouched();
      }
    }

    // Fixed-rate simulation (max two catch-up steps per frame).
    st.acc = Math.min(st.acc + dt, STEP * 2);
    let sizzle = 0;
    let ignite = 0;
    let fizz = 0;
    while (st.acc >= STEP) {
      st.acc -= STEP;
      sim.step();
      sizzle += sim.events.sizzle;
      ignite += sim.events.ignite;
      fizz += sim.events.fizz;
    }

    // Discoveries.
    if (sim.found !== foundRef.current) {
      const fresh = sim.found & ~foundRef.current;
      foundRef.current = sim.found;
      setFound(sim.found);
      pushToasts(fresh);
    }

    // Ambient sound, rate limited.
    const snd = sound.current;
    if (sizzle > 0 && st.time - snd.sizzle > 0.22) {
      snd.sizzle = st.time;
      noise(0.14, Math.min(0.07, 0.02 + sizzle * 0.004));
    }
    if (ignite > 0 && st.time - snd.ignite > 0.16) {
      snd.ignite = st.time;
      noise(0.05, Math.min(0.05, 0.015 + ignite * 0.003));
    }
    if (fizz > 0 && st.time - snd.fizz > 0.12) {
      snd.fizz = st.time;
      tone({ freq: 1500 + Math.random() * 900, duration: 0.04, type: "sine", volume: 0.025 });
    }

    // Render.
    const ctx = fitRef.current?.ctx;
    if (!ctx) return;
    renderSim(sim, gfx.buffers, st.frame);
    gfx.pixCtx.putImageData(gfx.pixImage, 0, 0);
    gfx.glowCtx.putImageData(gfx.glowImage, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(gfx.pixCanvas, 0, 0, sim.w, sim.h);
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = reducedMotion ? 0.55 : 0.85;
    const gwCells = gfx.buffers.gw * GLOW_SCALE;
    const ghCells = gfx.buffers.gh * GLOW_SCALE;
    ctx.drawImage(gfx.glowCanvas, 0, 0, gwCells, ghCells);
    if (!reducedMotion) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(gfx.glowCanvas, -GLOW_SCALE, -GLOW_SCALE, gwCells + GLOW_SCALE * 2, ghCells + GLOW_SCALE * 2);
    }
    ctx.restore();

    // Brush outline.
    if (p.hover || p.down) {
      const r = brushRef.current;
      ctx.save();
      ctx.lineWidth = Math.max(0.25, sim.w / 600);
      ctx.strokeStyle = p.down && p.erase ? "rgba(255,120,120,0.85)" : "rgba(246,239,226,0.7)";
      ctx.setLineDash([1.2, 0.8]);
      ctx.beginPath();
      ctx.arc(p.x + 0.5, p.y + 0.5, r + 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, !paused && dims !== null);

  // ── pointer input ───────────────────────────────────────────────────────
  const toCell = (e: React.PointerEvent) => {
    const fit = fitRef.current;
    if (!fit) return { x: 0, y: 0 };
    const l = fit.toLocal(e);
    return { x: Math.floor(l.x), y: Math.floor(l.y) };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const c = toCell(e);
    const p = ptr.current;
    p.down = true;
    p.erase = e.button === 2 || selRef.current === ERASER;
    p.hover = e.pointerType === "mouse";
    p.x = p.lx = c.x;
    p.y = p.ly = c.y;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = toCell(e);
    const p = ptr.current;
    p.x = c.x;
    p.y = c.y;
    if (e.pointerType === "mouse") p.hover = true;
  };
  const onPointerUp = () => {
    ptr.current.down = false;
  };
  const onPointerLeave = () => {
    const p = ptr.current;
    if (!p.down) p.hover = false;
  };

  // ── controls ────────────────────────────────────────────────────────────
  const choose = useCallback((id: number) => {
    selRef.current = id;
    setSelected(id);
    tone({ freq: 880, duration: 0.04, type: "square", volume: 0.04 });
  }, []);

  const setBrushSize = useCallback((v: number) => {
    const b = Math.max(MIN_BRUSH, Math.min(MAX_BRUSH, Math.round(v)));
    brushRef.current = b;
    setBrush(b);
  }, []);

  const clearAll = () => {
    if (paused) return;
    simRef.current?.clear();
    noise(0.2, 0.05);
  };

  const loadScene = (i: number) => {
    const sim = simRef.current;
    if (!sim || paused) return;
    SCENES[i].build(sim);
    markTouched();
    tone({ freq: 330, to: 660, duration: 0.18, type: "triangle", volume: 0.08 });
  };

  const finish = () => {
    if (finishedRef.current || paused) return;
    finishedRef.current = true;
    const n = popcount(foundRef.current);
    const st = stats.current;
    const subline =
      n === REACTIONS.length
        ? "Every reaction found. The lab is yours."
        : n >= 8
          ? "A seasoned alchemist."
          : n >= 4
            ? "Promising experiments. More secrets remain."
            : n > 0
              ? "A spark of curiosity. Keep mixing!"
              : "The universe is waiting to be poked.";
    onFinish({
      headline: `${n} reaction${n === 1 ? "" : "s"} discovered`,
      subline,
      score: n,
      scoreLabel: `${n}/${REACTIONS.length}`,
      stats: [
        { label: "Particles placed", value: st.placed.toLocaleString("en-US") },
        { label: "Elements used", value: `${st.used.size}/${PALETTE.length - 1}` },
        { label: "Time in lab", value: formatTime(st.time) },
      ],
    });
  };

  // Keyboard shortcuts.
  useEffect(() => {
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && (t as HTMLInputElement).type === "text"))) return;
      const entry = PALETTE.find((p) => p.key === e.code);
      if (entry) {
        choose(entry.id);
        return;
      }
      if (e.code === "BracketLeft") setBrushSize(brushRef.current - 1);
      else if (e.code === "BracketRight") setBrushSize(brushRef.current + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, choose, setBrushSize]);

  const foundCount = popcount(found);

  return (
    <div className="relative flex h-full w-full select-none flex-col" style={{ background: THEME.bg, color: THEME.ink }}>
      {/* Stage */}
      <div ref={stageRef} className="relative min-h-0 flex-1 p-2 sm:p-3">
        {dims && (
          <FitCanvas
            ref={fitRef}
            width={dims.w}
            height={dims.h}
            className="cursor-crosshair rounded-xl"
            style={{ boxShadow: "0 0 0 1px rgba(246,239,226,0.12), 0 20px 60px -20px rgba(255,155,61,0.25)" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerLeave}
            onContextMenu={(e) => e.preventDefault()}
            onWheel={(e) => {
              if (!paused) setBrushSize(brushRef.current + (e.deltaY < 0 ? 1 : -1));
            }}
            aria-label="Element Lab canvas. Paint elements with the pointer."
          />
        )}

        {!touched && dims && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-sm animate-rise text-center">
              <FlaskConical className="mx-auto mb-3 opacity-70" size={34} style={{ color: THEME.accent }} />
              <p className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">An empty universe.</p>
              <p className="mt-2 font-serif text-lg italic opacity-75">Pick an element below and paint — or load a scene for a head start.</p>
            </div>
          </div>
        )}

        {/* Discoveries counter */}
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2 sm:right-5 sm:top-5">
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold shadow-lg backdrop-blur transition hover:scale-[1.03]"
            style={{ background: "rgba(20,17,15,0.78)", border: `1.5px solid ${foundCount ? THEME.accent : "rgba(246,239,226,0.25)"}` }}
            aria-expanded={panelOpen}
          >
            <Sparkles size={15} style={{ color: THEME.accent }} />
            <span className="hidden sm:inline">Discoveries</span>
            <span className="font-mono tabular-nums">
              {foundCount}/{REACTIONS.length}
            </span>
          </button>
          {panelOpen && (
            <div
              className="w-[min(20rem,calc(100vw-2rem))] animate-pop overflow-hidden rounded-2xl shadow-2xl"
              style={{ background: "rgba(24,20,17,0.96)", border: "1px solid rgba(246,239,226,0.14)" }}
            >
              <div className="flex items-center justify-between px-4 pb-2 pt-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">Lab notebook</p>
                <button type="button" aria-label="Close" onClick={() => setPanelOpen(false)} className="rounded-full p-1 opacity-70 hover:opacity-100">
                  <X size={16} />
                </button>
              </div>
              <ul className="max-h-[50vh] overflow-y-auto px-2 pb-2">
                {REACTIONS.map((r, i) => {
                  const ok = (found >> i) & 1;
                  return (
                    <li key={r.name} className="flex items-start gap-3 rounded-xl px-2 py-1.5">
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold"
                        style={ok ? { background: THEME.accent, color: THEME.bg } : { border: "1px dashed rgba(246,239,226,0.35)", color: "rgba(246,239,226,0.5)" }}
                      >
                        {i + 1}
                      </span>
                      {ok ? (
                        <span className="min-w-0">
                          <span className="block font-bold leading-tight">{r.name}</span>
                          <span className="block font-mono text-xs opacity-70">{r.recipe}</span>
                        </span>
                      ) : (
                        <span className="min-w-0">
                          <span className="block font-bold leading-tight opacity-50">???</span>
                          <span className="block font-serif text-sm italic opacity-60">{r.hint}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Discovery toasts */}
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 flex-col items-center gap-2 sm:top-5">
          {toasts.map((t) => {
            const r = REACTIONS[t.reaction];
            return (
              <div
                key={t.id}
                className="flex animate-pop items-center gap-3 rounded-2xl px-4 py-2 shadow-2xl"
                style={{ background: THEME.ink, color: THEME.bg }}
                role="status"
              >
                <Sparkles size={18} style={{ color: THEME.accent }} />
                <div className="leading-tight">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60">New reaction</p>
                  <p className="whitespace-nowrap font-display text-base font-extrabold">
                    {r.name} <span className="font-serif font-normal italic opacity-70">— {r.recipe}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 border-t px-2 pb-2 pt-2 sm:px-3" style={{ borderColor: "rgba(246,239,226,0.1)" }}>
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 [scrollbar-width:thin]" role="toolbar" aria-label="Elements">
          {PALETTE.map((p) => {
            const active = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                title={`${p.name}${p.keyLabel ? ` (${p.keyLabel})` : ""} — ${p.tip}`}
                aria-pressed={active}
                onClick={() => choose(p.id)}
                className="group relative flex shrink-0 items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-3 text-sm font-semibold transition"
                style={{
                  background: active ? "rgba(246,239,226,0.14)" : "rgba(246,239,226,0.04)",
                  boxShadow: active ? `inset 0 0 0 2px ${THEME.accent}` : "inset 0 0 0 1px rgba(246,239,226,0.1)",
                }}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={
                    p.id === ERASER
                      ? { background: "repeating-linear-gradient(45deg, rgba(246,239,226,0.18) 0 4px, transparent 4px 8px)" }
                      : { background: p.swatch, boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.25)" }
                  }
                >
                  {p.id === ERASER && <Eraser size={15} />}
                </span>
                <span>{p.name}</span>
                {p.keyLabel && <span className="font-mono text-[10px] opacity-45">{p.keyLabel}</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl px-2 py-1" style={{ background: "rgba(246,239,226,0.05)" }}>
            <span className="font-mono text-[11px] uppercase tracking-wider opacity-60">Brush</span>
            <button type="button" aria-label="Smaller brush ([)" title="Smaller brush ([)" onClick={() => setBrushSize(brush - 1)} className="rounded-md p-1 opacity-70 hover:opacity-100">
              <Minus size={14} />
            </button>
            <input
              type="range"
              min={MIN_BRUSH}
              max={MAX_BRUSH}
              value={brush}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              aria-label="Brush size"
              className="w-20 sm:w-28"
              style={{ accentColor: THEME.accent }}
            />
            <button type="button" aria-label="Bigger brush (])" title="Bigger brush (])" onClick={() => setBrushSize(brush + 1)} className="rounded-md p-1 opacity-70 hover:opacity-100">
              <Plus size={14} />
            </button>
            <span className="w-5 text-right font-mono text-xs tabular-nums opacity-80">{brush}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="hidden font-mono text-[11px] uppercase tracking-wider opacity-60 sm:inline">Scenes</span>
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => loadScene(i)}
                className="rounded-full px-3 py-1 text-sm font-semibold transition hover:bg-white/10"
                style={{ border: "1.5px solid rgba(61,198,255,0.55)", color: THEME.accent2 }}
                title={`Replace the canvas with the ${s.name} scene`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold opacity-80 transition hover:bg-white/10 hover:opacity-100"
              style={{ border: "1.5px solid rgba(246,239,226,0.3)" }}
            >
              <Trash2 size={14} /> Clear
            </button>
            <button
              type="button"
              onClick={finish}
              className="flex items-center gap-1.5 rounded-full px-4 py-1 text-sm font-extrabold transition hover:scale-[1.04]"
              style={{ background: THEME.accent, color: THEME.bg, boxShadow: `0 3px 0 0 ${THEME.accent2}` }}
            >
              <Flag size={14} /> Finish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

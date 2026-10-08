"use client";

import { useEffect, useRef } from "react";

type Kind = 0 | 1 | 2 | 3 | 4; // circle, square, triangle, ring, plus
interface Shape {
  x: number;
  y: number;
  hx: number; // home position
  hy: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vr: number;
  kind: Kind;
  color: string;
  phase: number;
}

const COLORS = ["#ff5a3c", "#2f7bff", "#3fcf5a", "#ffbf1f", "#141210", "#8b5cf6"];

/**
 * Interactive hero backdrop: a field of springy shapes that scatter away
 * from the cursor and explode outward on click/tap. Static when the user
 * prefers reduced motion.
 */
export function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let shapes: Shape[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let raf = 0;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cell = w < 640 ? 46 : 58;
      shapes = [];
      let i = 0;
      for (let y = cell / 2; y < h + cell; y += cell) {
        for (let x = cell / 2; x < w + cell; x += cell) {
          i++;
          // Deterministic pseudo-random so the layout is stable between resizes.
          const n = Math.sin(i * 12.9898) * 43758.5453;
          const f = n - Math.floor(n);
          if (f < 0.42) continue;
          const jx = x + (f - 0.5) * cell * 0.6;
          const jy = y + (((f * 7) % 1) - 0.5) * cell * 0.6;
          shapes.push({
            x: jx,
            y: jy,
            hx: jx,
            hy: jy,
            vx: 0,
            vy: 0,
            r: 5 + ((f * 13) % 1) * 9,
            rot: f * Math.PI * 2,
            vr: 0,
            kind: Math.floor(((f * 31) % 1) * 5) as Kind,
            color: COLORS[Math.floor(((f * 97) % 1) * COLORS.length)],
            phase: f * 10,
          });
        }
      }
    };

    const drawShape = (s: Shape) => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.color;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3;
      const r = s.r;
      switch (s.kind) {
        case 0:
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 1:
          ctx.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
          break;
        case 2:
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.lineTo(r * 0.95, r * 0.75);
          ctx.lineTo(-r * 0.95, r * 0.75);
          ctx.closePath();
          ctx.fill();
          break;
        case 3:
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 4:
          ctx.fillRect(-r, -r * 0.25, r * 2, r * 0.5);
          ctx.fillRect(-r * 0.25, -r, r * 0.5, r * 2);
          break;
      }
      ctx.restore();
    };

    const frame = (time: number) => {
      ctx.clearRect(0, 0, w, h);
      const t = time / 1000;
      for (const s of shapes) {
        if (!reduce) {
          // Spring home with a gentle idle drift.
          const tx = s.hx + Math.sin(t * 0.6 + s.phase) * 4;
          const ty = s.hy + Math.cos(t * 0.5 + s.phase) * 4;
          s.vx += (tx - s.x) * 0.02;
          s.vy += (ty - s.y) * 0.02;
          if (pointer.active) {
            const dx = s.x - pointer.x;
            const dy = s.y - pointer.y;
            const d2 = dx * dx + dy * dy;
            const R = 120;
            if (d2 < R * R) {
              const d = Math.sqrt(d2) || 1;
              const f = (1 - d / R) * 2.4;
              s.vx += (dx / d) * f;
              s.vy += (dy / d) * f;
              s.vr += f * 0.02;
            }
          }
          s.vx *= 0.86;
          s.vy *= 0.86;
          s.vr *= 0.94;
          s.x += s.vx;
          s.y += s.vy;
          s.rot += s.vr + 0.002;
        }
        drawShape(s);
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = pointer.y >= 0 && pointer.y <= r.height;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onDown = (e: PointerEvent) => {
      if (reduce) return;
      const r = canvas.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      if (py < 0 || py > r.height) return;
      for (const s of shapes) {
        const dx = s.x - px;
        const dy = s.y - py;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 320) {
          const f = (1 - d / 320) * 26;
          s.vx += (dx / d) * f;
          s.vy += (dy / d) * f;
          s.vr += (Math.random() - 0.5) * 0.5;
        }
      }
    };

    build();
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(() => {
      build();
      if (reduce) requestAnimationFrame(frame);
    });
    ro.observe(canvas);
    const host = canvas.parentElement ?? window;
    host.addEventListener("pointermove", onMove as EventListener);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown as EventListener);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointermove", onMove as EventListener);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown as EventListener);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}

"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface FitCanvasHandle {
  canvas: HTMLCanvasElement | null;
  /**
   * 2D context already scaled so you can draw in logical units
   * (0..width, 0..height). Re-fetch each frame; it can change on resize.
   */
  ctx: CanvasRenderingContext2D | null;
  /** Convert a pointer/mouse event to logical canvas coordinates. */
  toLocal: (e: { clientX: number; clientY: number }) => { x: number; y: number };
}

interface Props extends Omit<React.CanvasHTMLAttributes<HTMLCanvasElement>, "width" | "height"> {
  /** Logical width in game units. */
  width: number;
  /** Logical height in game units. */
  height: number;
  /** Extra classes for the outer (letterboxing) wrapper. */
  wrapperClassName?: string;
}

/**
 * A canvas with a fixed logical resolution that scales to fit its parent
 * while keeping its aspect ratio, and renders crisply on high-DPI screens.
 * The parent must have a definite size (e.g. `h-full w-full`).
 */
export const FitCanvas = forwardRef<FitCanvasHandle, Props>(function FitCanvas(
  { width, height, wrapperClassName, className, style, ...rest },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [box, setBox] = useState({ w: width, h: height });

  useImperativeHandle(
    ref,
    () => ({
      get canvas() {
        return canvasRef.current;
      },
      get ctx() {
        return ctxRef.current;
      },
      toLocal(e) {
        const c = canvasRef.current;
        if (!c) return { x: 0, y: 0 };
        const r = c.getBoundingClientRect();
        return { x: ((e.clientX - r.left) / r.width) * width, y: ((e.clientY - r.top) / r.height) * height };
      },
    }),
    [width, height],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const scale = Math.min(r.width / width, r.height / height);
      setBox({ w: Math.floor(width * scale), h: Math.floor(height * scale) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [width, height]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.max(1, Math.round(box.w * dpr));
    c.height = Math.max(1, Math.round(box.h * dpr));
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.setTransform(c.width / width, 0, 0, c.height / height, 0, 0);
      ctx.imageSmoothingEnabled = true;
    }
    ctxRef.current = ctx;
  }, [box, width, height]);

  return (
    <div ref={wrapRef} className={`flex h-full w-full items-center justify-center ${wrapperClassName ?? ""}`}>
      <canvas
        ref={canvasRef}
        className={className}
        style={{ width: box.w, height: box.h, touchAction: "none", ...style }}
        {...rest}
      />
    </div>
  );
});

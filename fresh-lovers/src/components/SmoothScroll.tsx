"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/** Lenis smooth scroll; skipped entirely for reduced-motion users and touch devices (native is better there). */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: { offset: -20 } });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}

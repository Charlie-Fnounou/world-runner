"use client";

import { useEffect, useRef } from "react";

/**
 * requestAnimationFrame loop. `step(dt, t)` receives seconds since the last
 * frame (clamped to 1/20 s so a background tab can't explode physics).
 * The loop only runs while `running` is true; the latest `step` closure is
 * always used, so it is safe to pass an inline function.
 */
export function useGameLoop(step: (dt: number, time: number) => void, running: boolean) {
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      stepRef.current(dt, now / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

"use client";

import { useEffect, useState } from "react";

export function Countdown({ date, big, light }: { date: string; big?: boolean; light?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  if (now === null) return null;

  const diff = Math.max(0, new Date(date + "T07:00:00").getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;

  const ink = light ? "#fff" : "var(--wr-ink)";
  const mut = light ? "rgba(255,255,255,0.65)" : "var(--wr-mut)";

  const celda = (v: number, l: string) => (
    <div className="text-center" key={l}>
      <div
        className="font-mono font-bold tabular-nums"
        style={{ fontSize: big ? 36 : 19, color: ink, letterSpacing: "-0.02em" }}
      >
        {String(v).padStart(2, "0")}
      </div>
      <div className="uppercase tracking-widest" style={{ fontSize: big ? 11 : 9, color: mut }}>
        {l}
      </div>
    </div>
  );

  return (
    <div className="flex items-start" style={{ gap: big ? 18 : 11 }}>
      {celda(d, "días")}
      {celda(h, "hrs")}
      {celda(m, "min")}
      {celda(s, "seg")}
    </div>
  );
}

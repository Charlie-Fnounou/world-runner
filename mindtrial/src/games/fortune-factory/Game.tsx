"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameProps } from "@/lib/types";
import { randomSeed } from "@/lib/random";
import { formatNumber } from "@/lib/format";
import { sfx, tone } from "@/lib/sound";
import {
  IDS,
  PEOPLE_ON_EARTH,
  START_CASH,
  VENTURES,
  VENTURE_BY_ID,
  YEARS,
  buy,
  expectedReturn,
  fusionOdds,
  isBankrupt,
  isOver,
  netWorth,
  newGame,
  nextUpgrade,
  purchasesFor,
  research,
  sell,
  simulateYear,
  summarize,
  type Asset,
  type State,
  type Venture,
  type VentureId,
  type YearReport,
} from "./sim";
import { VentureIcon } from "./icons";

const C = { bg: "#0f1a14", ink: "#f2f7e9", accent: "#c8f55a", accent2: "#ffcf4a", bad: "#ff6b5a", panel: "#16261d", line: "#2a3d31" };
const CASH_COLOR = "#5b6b60";

const pct = (x: number, digits = 1) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(digits)}%`;
const coins = (n: number) => formatNumber(Math.round(n));

/** A friendly 1-2-5 step around 5% of net worth. */
function niceStep(worth: number) {
  const raw = Math.max(1e8, worth * 0.05);
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

function assetName(a: Asset) {
  return a === "cash" ? "Cash" : VENTURE_BY_ID[a].name;
}
function assetColor(a: Asset) {
  return a === "cash" ? CASH_COLOR : VENTURE_BY_ID[a].color;
}

export default function FortuneFactory({ paused, reducedMotion, onFinish }: GameProps) {
  const [s, setS] = useState<State>(() => newGame(randomSeed()));
  const [report, setReport] = useState<YearReport | null>(null);
  const finishedRef = useRef(false);
  const worth = netWorth(s);
  const step = niceStep(worth);

  const finish = useCallback(
    (st: State) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const sum = summarize(st);
      const mult = sum.final / START_CASH;
      const bankrupt = isBankrupt(st);
      const headline = bankrupt
        ? "Bankrupt."
        : mult >= 10
          ? "Galactic tycoon."
          : mult >= 3
            ? "Fortune multiplied."
            : mult >= 1
              ? "Modest mogul."
              : "The fortune shrank.";
      onFinish({
        headline,
        subline: bankrupt
          ? `Your empire collapsed in year ${st.year}. The imaginary creditors send their regards.`
          : `${YEARS} years, ${sum.events} headlines, ${pct(sum.cagr)} a year on average.`,
        score: Math.max(0, Math.round(sum.final)),
        scoreLabel: `${coins(sum.final)} coins`,
        stats: [
          { label: "Total return", value: pct(sum.returnPct, 0) },
          { label: "Best year", value: sum.bestYear ? `Y${sum.bestYear.year} ${pct(sum.bestYear.pct, 0)}` : "—" },
          { label: "Best venture", value: sum.bestVenture ? assetName(sum.bestVenture.id) : "None" },
          { label: "Events survived", value: String(sum.events) },
          { label: "Research spent", value: st.researchSpent ? coins(st.researchSpent) : "0" },
        ],
      });
    },
    [onFinish],
  );

  const act = useCallback(
    (f: (st: State) => State) => {
      const next = f(s);
      if (next === s) return;
      sfx.click();
      setS(next);
    },
    [s],
  );

  const advance = useCallback(() => {
    if (finishedRef.current) return;
    if (report) {
      setReport(null);
      if (isOver(s)) finish(s);
      return;
    }
    if (isOver(s)) {
      finish(s);
      return;
    }
    const next = simulateYear(s);
    const rep = next.reports[next.reports.length - 1];
    setS(next);
    setReport(rep);
    const d = rep.after / Math.max(1, rep.before) - 1;
    if (rep.notes.length) sfx.win();
    else if (d > 0.08) sfx.good();
    else if (d < -0.05) sfx.bad();
    else tone({ freq: 520, duration: 0.12, type: "triangle", volume: 0.08 });
  }, [report, s, finish]);

  useEffect(() => {
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, advance]);

  const over = isOver(s);
  const yearLabel = Math.min(s.year + 1, YEARS);
  const lastDelta = s.worth.length > 1 ? s.worth[s.worth.length - 1] / s.worth[s.worth.length - 2] - 1 : null;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: C.bg, color: C.ink }}>
      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
      <div className="mx-auto grid max-w-6xl gap-4 p-3 pb-24 sm:p-5 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-6">
        <section className="min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-60">Fortune Factory · Year</div>
              <div className="font-display text-3xl leading-none font-black sm:text-4xl">
                {over ? YEARS : yearLabel}
                <span className="text-lg opacity-40">/{YEARS}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-60">Net worth</div>
              <div key={s.year} className="animate-pop font-display text-3xl leading-none font-black tabular-nums sm:text-4xl" style={{ color: C.accent }}>
                {coins(worth)}
              </div>
              {lastDelta !== null && (
                <div className="font-mono text-xs tabular-nums" style={{ color: lastDelta >= 0 ? C.accent : C.bad }}>
                  {pct(lastDelta)} last year
                </div>
              )}
            </div>
          </div>
          <YearDots year={s.year} />

          {/* Allocation */}
          <AllocationBar s={s} />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2" style={{ background: C.panel }}>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: CASH_COLOR }} />
              <span className="font-bold">Cash</span>
              <span className="font-display text-lg font-black tabular-nums">{coins(s.cash)}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] opacity-70">
              Step <span className="tabular-nums">{coins(step)}</span>
              <button
                type="button"
                className="rounded-full border px-2.5 py-1 font-sans text-xs font-bold opacity-100 transition hover:bg-white/10 disabled:opacity-30"
                style={{ borderColor: C.line }}
                disabled={over || IDS.every((id) => s.holdings[id] === 0)}
                onClick={() => act((st) => IDS.reduce((acc, id) => sell(acc, id, acc.holdings[id]), st))}
              >
                Sell everything
              </button>
            </div>
          </div>

          {/* Ventures */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {VENTURES.map((v) => (
              <VentureCard key={v.id} v={v} s={s} step={step} disabled={over || !!report} act={act} />
            ))}
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-0 lg:self-start lg:pt-1">
          <div className="rounded-2xl p-4" style={{ background: C.panel }}>
            <div className="flex items-baseline justify-between">
              <h3 className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-60">Net worth over time</h3>
              <span className="font-mono text-[11px] opacity-60">start {coins(START_CASH)}</span>
            </div>
            <WorthChart worth={s.worth} />
          </div>
          <Purchases worth={worth} year={s.year} />
          <button
            type="button"
            onClick={advance}
            className="btn hidden w-full text-lg lg:inline-flex"
            style={{ background: C.accent, color: C.bg, borderColor: C.accent, boxShadow: `0 4px 0 0 ${C.accent2}` }}
          >
            {over ? "See results" : `Run year ${yearLabel}`} <span className="kbd">Space</span>
          </button>
          <p className="hidden text-center font-mono text-[11px] opacity-50 lg:block">Allocate first, then run the year. Events hit after you commit.</p>
        </aside>
      </div>

      {/* Mobile bottom bar */}
      <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t px-3 py-2 lg:hidden" style={{ background: C.bg, borderColor: C.line }}>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-60">Year {over ? YEARS : yearLabel}/{YEARS}</div>
          <div className="font-display text-xl leading-none font-black tabular-nums" style={{ color: C.accent }}>
            {coins(worth)}
          </div>
        </div>
        <button type="button" onClick={advance} className="btn py-2.5! text-base" style={{ background: C.accent, color: C.bg, borderColor: C.accent, boxShadow: `0 4px 0 0 ${C.accent2}` }}>
          {over ? "Results" : "Next year →"}
        </button>
      </div>
      </div>

      {report && <ReportCard report={report} s={s} onClose={advance} reducedMotion={reducedMotion} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function YearDots({ year }: { year: number }) {
  return (
    <div className="mt-3 flex gap-[3px]" aria-hidden>
      {Array.from({ length: YEARS }, (_, i) => (
        <span
          key={i}
          className="h-1.5 flex-1 rounded-full transition-colors duration-500"
          style={{ background: i < year ? C.accent : i === year ? C.accent2 : C.line }}
        />
      ))}
    </div>
  );
}

function AllocationBar({ s }: { s: State }) {
  const worth = Math.max(1, netWorth(s));
  const parts: { a: Asset; v: number }[] = [...IDS.map((id) => ({ a: id as Asset, v: s.holdings[id] })), { a: "cash" as Asset, v: s.cash }].filter((p) => p.v > 0);
  return (
    <div className="mt-4">
      <div className="flex h-7 w-full overflow-hidden rounded-lg" style={{ background: C.line }} role="img" aria-label="Portfolio allocation">
        {parts.map((p) => (
          <div
            key={p.a}
            className="h-full transition-[width] duration-500 ease-out"
            style={{ width: `${(p.v / worth) * 100}%`, background: assetColor(p.a), boxShadow: "inset -1px 0 0 rgba(0,0,0,0.35)" }}
            title={`${assetName(p.a)} ${((p.v / worth) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {parts.map((p) => (
          <span key={p.a} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: assetColor(p.a) }} />
            <span className="opacity-80">{assetName(p.a)}</span>
            <span className="font-mono tabular-nums opacity-60">{((p.v / worth) * 100).toFixed(0)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function RiskDots({ n, color }: { n: number; color: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`risk ${n} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < n ? color : C.line }} />
      ))}
    </span>
  );
}

function Spark({ values }: { values: number[] }) {
  const vals = values.slice(-12);
  if (!vals.length) return <span className="font-mono text-[10px] opacity-40">no history</span>;
  const max = Math.max(0.05, ...vals.map((v) => Math.abs(v)));
  const w = 4;
  const gap = 2;
  return (
    <svg width={vals.length * (w + gap)} height="22" viewBox={`0 0 ${vals.length * (w + gap)} 22`} aria-hidden>
      <line x1="0" x2={vals.length * (w + gap)} y1="11" y2="11" stroke={C.line} />
      {vals.map((v, i) => {
        const h = Math.max(1, (Math.abs(v) / max) * 10);
        return <rect key={i} x={i * (w + gap)} y={v >= 0 ? 11 - h : 11} width={w} height={h} rx="1" fill={v >= 0 ? C.accent : C.bad} />;
      })}
    </svg>
  );
}

function SmallBtn({ children, onClick, disabled, title, strong }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string; strong?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="min-h-9 min-w-9 rounded-lg px-2 text-sm font-bold transition enabled:hover:-translate-y-px enabled:active:translate-y-px disabled:opacity-25"
      style={strong ? { background: C.accent, color: C.bg } : { background: C.line, color: C.ink }}
    >
      {children}
    </button>
  );
}

function VentureCard({ v, s, step, disabled, act }: { v: Venture; s: State; step: number; disabled: boolean; act: (f: (st: State) => State) => void }) {
  const held = s.holdings[v.id];
  const worth = Math.max(1, netWorth(s));
  const hist = s.returnHistory[v.id];
  const last = hist.length ? hist[hist.length - 1] : null;
  const exp = expectedReturn(s, v.id);
  const up = nextUpgrade(s, v.id);
  const tierCount = v.upgrades.length;
  const gain = s.gains[v.id];
  let status: string | null = null;
  if (v.id === "fusion") status = s.fusionOnline ? "Plant online" : `Breakthrough odds ${(fusionOdds(s) * 100).toFixed(0)}%/yr${s.year < 2 ? " (from year 3)" : ""}`;
  if (v.id === "cats") status = s.catHype > 0.45 ? "Hype: viral" : s.catHype > 0.1 ? "Hype: trending" : s.catHype > -0.3 ? "Hype: meh" : "Hype: cancelled";

  return (
    <article className="flex flex-col gap-2 rounded-2xl border p-3 transition-colors" style={{ background: C.panel, boxShadow: held > 0 ? `inset 3px 0 0 ${v.color}` : undefined, borderColor: C.line }}>
      <header className="flex items-start gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: v.color + "22" }}>
          <VentureIcon id={v.id} color={v.color} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[15px] leading-tight font-extrabold">{v.name}</h3>
          <p className="text-[11.5px] leading-snug opacity-60">{v.tagline}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-lg leading-none font-black tabular-nums" style={{ color: held > 0 ? v.color : undefined, opacity: held > 0 ? 1 : 0.35 }}>
            {coins(held)}
          </div>
          <div className="font-mono text-[10px] tabular-nums opacity-60">{((held / worth) * 100).toFixed(0)}% of worth</div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <RiskDots n={v.risk} color={v.risk >= 4 ? C.bad : v.risk >= 3 ? C.accent2 : C.accent} />
        <span className="font-mono opacity-70">~{(exp * 100).toFixed(exp > -0.1 && exp < 0.1 ? 1 : 0)}%/yr</span>
        {last !== null && (
          <span className="font-mono tabular-nums" style={{ color: last >= 0 ? C.accent : C.bad }}>
            last {pct(last, 0)}
          </span>
        )}
        <span className="ml-auto">
          <Spark values={hist} />
        </span>
      </div>
      {(status || gain !== 0) && (
        <div className="flex flex-wrap justify-between gap-2 font-mono text-[10.5px] opacity-75">
          {status && <span style={{ color: v.id === "fusion" && s.fusionOnline ? C.accent : undefined }}>{status}</span>}
          {gain !== 0 && (
            <span style={{ color: gain > 0 ? C.accent : C.bad }}>
              P/L {gain > 0 ? "+" : "−"}
              {coins(Math.abs(gain))}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <SmallBtn title={`Sell ${coins(step)}`} disabled={disabled || held <= 0} onClick={() => act((st) => sell(st, v.id, step))}>
          −
        </SmallBtn>
        <SmallBtn title={`Invest ${coins(step)}`} disabled={disabled || s.cash <= 0} onClick={() => act((st) => buy(st, v.id, step))}>
          +
        </SmallBtn>
        <span className="mx-0.5 h-5 w-px" style={{ background: C.line }} />
        {[0.25, 0.5, 1].map((f) => (
          <SmallBtn key={f} title={`Invest ${f * 100}% of cash`} disabled={disabled || s.cash <= 0} onClick={() => act((st) => buy(st, v.id, st.cash * f))}>
            {f === 1 ? "All" : `${f * 100}%`}
          </SmallBtn>
        ))}
        <span className="flex-1" />
        <SmallBtn title="Sell everything in this venture (0%)" disabled={disabled || held <= 0} onClick={() => act((st) => sell(st, v.id, st.holdings[v.id]))}>
          0%
        </SmallBtn>
      </div>

      {tierCount > 0 && (
        <div className="flex items-center gap-2 border-t pt-2 text-[11.5px]" style={{ borderColor: C.line }}>
          <span className="flex gap-0.5" aria-label={`research ${s.tiers[v.id]} of ${tierCount}`}>
            {v.upgrades.map((_, i) => (
              <span key={i} className="h-2.5 w-1.5 rounded-sm" style={{ background: i < s.tiers[v.id] ? C.accent2 : C.line }} />
            ))}
          </span>
          {up ? (
            <>
              <span className="min-w-0 flex-1 truncate">
                <b>{up.name}</b> <span className="opacity-60">· {up.desc}</span>
              </span>
              <button
                type="button"
                disabled={disabled || s.cash < up.cost}
                onClick={() => {
                  act((st) => research(st, v.id));
                  tone({ freq: 880, to: 1320, duration: 0.18, type: "triangle", volume: 0.07 });
                }}
                className="shrink-0 rounded-lg px-2 py-1 font-bold transition disabled:opacity-30"
                style={{ background: C.accent2, color: C.bg }}
                title={s.cash < up.cost ? "Not enough cash" : `Research for ${coins(up.cost)}`}
              >
                Research {coins(up.cost)}
              </button>
            </>
          ) : (
            <span className="opacity-60">Fully researched</span>
          )}
        </div>
      )}
    </article>
  );
}

function WorthChart({ worth }: { worth: number[] }) {
  const W = 300;
  const H = 130;
  const pad = { l: 4, r: 4, t: 10, b: 16 };
  const max = Math.max(START_CASH * 1.2, ...worth) * 1.08;
  const x = (i: number) => pad.l + (i / YEARS) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const pts = worth.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${x(worth.length - 1).toFixed(1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = worth[worth.length - 1];
  const peak = Math.max(...worth);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="img" aria-label="Net worth chart">
      <defs>
        <linearGradient id="ff-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={C.accent} stopOpacity="0.35" />
          <stop offset="1" stopColor={C.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 5, 10, 15, 20].map((yr) => (
        <g key={yr}>
          <line x1={x(yr)} x2={x(yr)} y1={pad.t} y2={H - pad.b} stroke={C.line} strokeWidth="0.6" />
          <text x={x(yr)} y={H - 4} fontSize="8" textAnchor={yr === 0 ? "start" : yr === 20 ? "end" : "middle"} fill={C.ink} opacity="0.5" fontFamily="var(--font-jetbrains), monospace">
            Y{yr}
          </text>
        </g>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={y(START_CASH)} y2={y(START_CASH)} stroke={C.accent2} strokeDasharray="3 3" strokeWidth="0.8" opacity="0.7" />
      <text x={W - pad.r} y={y(START_CASH) - 3} fontSize="7.5" textAnchor="end" fill={C.accent2} opacity="0.8" fontFamily="var(--font-jetbrains), monospace">
        start
      </text>
      <path d={area} fill="url(#ff-area)" />
      <path d={line} fill="none" stroke={C.accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {worth.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === worth.length - 1 ? 3.2 : 1.6} fill={i === worth.length - 1 ? C.accent2 : C.accent} />
      ))}
      <text
        x={Math.min(x(worth.length - 1) + 5, W - 40)}
        y={Math.max(y(last) - 6, 16)}
        fontSize="10"
        fontWeight="800"
        fill={C.ink}
        fontFamily="var(--font-bricolage), sans-serif"
      >
        {coins(last)}
      </text>
      {peak > last * 1.15 && (
        <text x={pad.l + 2} y={pad.t + 6} fontSize="7.5" fill={C.ink} opacity="0.5" fontFamily="var(--font-jetbrains), monospace">
          peak {coins(peak)}
        </text>
      )}
    </svg>
  );
}

function Purchases({ worth, year }: { worth: number; year: number }) {
  const items = purchasesFor(worth, year);
  const perPerson = worth / PEOPLE_ON_EARTH;
  return (
    <div className="rounded-2xl p-4" style={{ background: C.panel }}>
      <h3 className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-60">Your fortune could buy</h3>
      <ul className="mt-2 space-y-1.5 text-sm leading-snug">
        {items.map((it) => (
          <li key={it.name}>
            <span className="font-display font-black tabular-nums" style={{ color: C.accent2 }}>
              ≈ {formatNumber(Math.floor(it.count))}
            </span>{" "}
            {it.name}
          </li>
        ))}
        <li>
          or give <span className="font-display font-black" style={{ color: C.accent2 }}>every person on Earth {perPerson >= 1 ? formatNumber(Math.floor(perPerson)) : perPerson.toFixed(2)}</span> coins
        </li>
      </ul>
      <p className="mt-2 font-mono text-[10px] opacity-40">Prices from the Imaginary Catalogue, before tax.</p>
    </div>
  );
}

function ReportCard({ report, s, onClose, reducedMotion }: { report: YearReport; s: State; onClose: () => void; reducedMotion: boolean }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const id = setTimeout(() => btnRef.current?.focus({ preventScroll: true }), 250);
    return () => clearTimeout(id);
  }, []);
  const delta = report.after / Math.max(1, report.before) - 1;
  const coinDelta = report.after - report.before;
  const over = isOver(s);
  const bankrupt = isBankrupt(s);
  const assets: Asset[] = [...IDS, "cash"];
  const maxAbs = Math.max(0.1, ...assets.map((a) => Math.abs(report.returns[a])));
  const paper = "#f2f7e9";
  const ink = "#0f1a14";
  const [lead, ...rest] = report.events;

  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <div
        className={`my-auto w-full max-w-2xl overflow-hidden rounded-xl shadow-2xl ${reducedMotion ? "" : "animate-rise"}`}
        style={{ background: paper, color: ink }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Year ${report.year} report`}
      >
        <div className="border-b-4 border-double px-5 pt-4 pb-2 text-center" style={{ borderColor: ink }}>
          <div className="flex justify-between font-mono text-[10px] tracking-[0.2em] uppercase opacity-70">
            <span>Year {report.year} of {YEARS}</span>
            <span>Price: 1 imaginary coin</span>
          </div>
          <div className="font-serif text-3xl italic sm:text-4xl">The Imaginary Ledger</div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-[1.4fr_1fr]">
          <div>
            {report.notes.map((n) => (
              <p key={n} className="mb-3 rounded-md px-3 py-2 font-display text-sm font-black" style={{ background: "#5ef2a0" }}>
                {n}
              </p>
            ))}
            {lead && (
              <>
                <h2 className="font-display text-2xl leading-[1.05] font-black tracking-tight sm:text-3xl">{lead.headline}</h2>
                <p className="mt-1.5 font-serif text-lg leading-snug italic opacity-80">{lead.deck}</p>
                <Effects effects={lead.effects} />
              </>
            )}
            {rest.map((e) => (
              <div key={e.id} className="mt-4 border-t pt-3" style={{ borderColor: "#0f1a1433" }}>
                <h3 className="font-display text-lg leading-tight font-black">{e.headline}</h3>
                <p className="font-serif text-base leading-snug italic opacity-80">{e.deck}</p>
                <Effects effects={e.effects} />
              </div>
            ))}
          </div>
          <div className="sm:border-l sm:pl-4" style={{ borderColor: "#0f1a1433" }}>
            <h4 className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-60">Markets this year</h4>
            <ul className="mt-2 space-y-1">
              {assets.map((a) => {
                const r = report.returns[a];
                const held = a === "cash" ? s.cash > 0 : s.holdings[a] > 0 || report.before === 0;
                return (
                  <li key={a} className="grid grid-cols-[1fr_64px_48px] items-center gap-2 text-[12px]" style={{ opacity: held ? 1 : 0.5 }}>
                    <span className="truncate font-semibold">{assetName(a)}</span>
                    <span className="relative h-2.5 rounded-sm" style={{ background: "#0f1a1414" }}>
                      <span
                        className="absolute top-0 h-full rounded-sm"
                        style={{
                          left: r >= 0 ? "50%" : `${50 - (Math.abs(r) / maxAbs) * 50}%`,
                          width: `${(Math.abs(r) / maxAbs) * 50}%`,
                          background: r >= 0 ? "#3f9a1e" : "#d23b2b",
                        }}
                      />
                    </span>
                    <span className="text-right font-mono tabular-nums" style={{ color: r >= 0 ? "#2d7a10" : "#c0281a" }}>
                      {pct(r, 0)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 rounded-lg p-3" style={{ background: ink, color: paper }}>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-60">Your net worth</div>
              <div className="font-display text-2xl leading-tight font-black tabular-nums">{coins(report.after)}</div>
              <div className="font-mono text-xs tabular-nums" style={{ color: delta >= 0 ? C.accent : C.bad }}>
                {pct(delta)} · {coinDelta >= 0 ? "+" : "−"}
                {coins(Math.abs(coinDelta))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-5 py-3" style={{ borderColor: "#0f1a1433" }}>
          <span className="font-mono text-[11px] opacity-60">
            {bankrupt ? "Your empire has collapsed." : over ? "That was the final year." : `${YEARS - s.year} years to go`}
          </span>
          <button ref={btnRef} type="button" onClick={onClose} className="btn py-2!" style={{ background: ink, color: paper, borderColor: ink }}>
            {over ? "Final results" : "Back to work"} <span className="kbd hidden sm:inline-flex">Space</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Effects({ effects }: { effects: Partial<Record<Asset, number>> }) {
  const entries = Object.entries(effects) as [Asset, number][];
  const uniform = entries.length >= 8 && entries.every(([, v]) => v === entries[0][1]);
  const list: [string, number][] = uniform ? [["Everything", entries[0][1]]] : entries.map(([a, v]) => [assetName(a as VentureId | "cash"), v]);
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {list.map(([name, v]) => (
        <span key={name} className="rounded-full px-2 py-0.5 font-mono text-[11px] font-bold" style={{ background: v >= 0 ? "#c8f55a" : "#ffcdc6", color: "#0f1a14" }}>
          {name} {pct(v, 0)}
        </span>
      ))}
    </div>
  );
}

import { useId } from "react";
import type { Product, Variant } from "@/data/catalog";
import { cartouchePath } from "@/lib/cartouche";

/**
 * Packaging, drawn in code from the real Fresh Lovers label system:
 * cartouche logo · tracked kicker · Didone name · italic flavour · colour field.
 * All shapes share a 240×320 viewBox with the ground line at y≈304 so they
 * line up on a shelf.
 */

type Props = {
  product: Product;
  variant?: number;
  className?: string;
  /** hide the ground shadow (e.g. when composing) */
  shadow?: boolean;
  title?: string;
};

const DIDONE = "var(--font-display)";
const SANS = "var(--font-sans)";

/** crude width estimate so titles fit the label */
function fit(text: string, maxW: number, base: number, k = 0.6) {
  return Math.min(base, maxW / Math.max(1, text.length * k));
}

function splitTitle(t: string, maxChars: number): string[] {
  if (t.length <= maxChars) return [t];
  const words = t.split(" ");
  const lines: string[] = [""];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + " " + w).trim().length > maxChars && cur) lines.push(w);
    else lines[lines.length - 1] = (cur + " " + w).trim();
  }
  return lines.slice(0, 3);
}

/** Mini logo used on labels */
function MiniLogo({ x, y, s = 1, fill = "#141210", ink = "#fff" }: { x: number; y: number; s?: number; fill?: string; ink?: string }) {
  return (
    <g transform={`translate(${x - 30 * s} ${y - 18 * s}) scale(${s})`}>
      <path d={cartouchePath(56, 32, 8, 2)} fill={fill} />
      <path d={cartouchePath(50, 26, 6, 1.6)} transform="translate(3 3)" fill="none" stroke={ink} strokeWidth="0.5" />
      <g transform="translate(30 8.5)" fill={ink}>
        <path d="M0 2.4 C-.3 .8 -1.6 -.3 -3 0 C-2.7 1.6 -1.4 2.4 0 2.4Z" />
        <path d="M0 2.4 C.3 .8 1.6 -.3 3 0 C2.7 1.6 1.4 2.4 0 2.4Z" />
      </g>
      <text x="30" y="22" textAnchor="middle" fill={ink} style={{ fontFamily: "var(--font-logo)", fontSize: 10.5, letterSpacing: 0.6 }}>
        FRESH
      </text>
      <rect x="18" y="23.6" width="24" height="0.5" fill={ink} />
      <text x="30.3" y="29" textAnchor="middle" fill={ink} style={{ fontFamily: SANS, fontSize: 4.2, letterSpacing: 1.5 }}>
        lovers
      </text>
    </g>
  );
}

function Shade({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-cyl`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity="0.22" />
        <stop offset="0.12" stopColor="#fff" stopOpacity="0.16" />
        <stop offset="0.3" stopColor="#fff" stopOpacity="0.05" />
        <stop offset="0.7" stopColor="#000" stopOpacity="0" />
        <stop offset="0.92" stopColor="#000" stopOpacity="0.12" />
        <stop offset="1" stopColor="#000" stopOpacity="0.26" />
      </linearGradient>
      <linearGradient id={`${id}-soft`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity="0.12" />
        <stop offset="0.18" stopColor="#fff" stopOpacity="0.22" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.14" />
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" x2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.15" />
        <stop offset="0.15" stopColor="#fff" stopOpacity="0.55" />
        <stop offset="0.24" stopColor="#fff" stopOpacity="0.1" />
        <stop offset="0.85" stopColor="#fff" stopOpacity="0.05" />
        <stop offset="0.93" stopColor="#fff" stopOpacity="0.35" />
        <stop offset="1" stopColor="#fff" stopOpacity="0.1" />
      </linearGradient>
      <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#000" stopOpacity="0.28" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function Ground({ id, w = 150, y = 304 }: { id: string; w?: number; y?: number }) {
  return <ellipse cx="120" cy={y} rx={w / 2} ry="9" fill={`url(#${id}-shadow)`} />;
}

/** label typography block centred on x=120 */
function LabelType({
  y,
  kicker,
  title,
  flavour,
  ink,
  accent,
  maxW = 120,
  titleSize = 34,
  caps = true,
}: {
  y: number;
  kicker?: string;
  title: string;
  flavour?: string;
  ink: string;
  accent?: string;
  maxW?: number;
  titleSize?: number;
  caps?: boolean;
}) {
  const t = caps ? title.toUpperCase() : title;
  const lines = splitTitle(t, caps ? 10 : 12);
  const longest = Math.max(...lines.map((l) => l.length));
  const fs = fit("x".repeat(longest), maxW, titleSize, caps ? 0.72 : 0.56);
  const ys = lines.map((_, i) => y + fs * 1.02 + i * fs * 0.98);
  const last = ys[ys.length - 1];
  return (
    <g fill={ink} textAnchor="middle">
      {kicker && (
        <>
          <text x="120" y={y} style={{ fontFamily: SANS, fontSize: kicker.length > 14 ? 5 : 6.4, letterSpacing: kicker.length > 14 ? 1.6 : 3.2, fontWeight: 500 }}>
            {kicker.toUpperCase()}
          </text>
          {kicker.length <= 8 && (
            <>
              <rect x="88" y={y - 3} width="8" height="0.6" opacity="0.7" />
              <rect x="144" y={y - 3} width="8" height="0.6" opacity="0.7" />
            </>
          )}
        </>
      )}
      {lines.map((l, i) => {
        return (
          <text key={i} x="120" y={ys[i]} style={{ fontFamily: DIDONE, fontSize: fs, fontWeight: 500, letterSpacing: caps ? 0.5 : 0 }}>
            {l}
          </text>
        );
      })}
      {flavour && (
        <text
          x="120"
          y={last + Math.max(15, fs * 0.62)}
          fill={accent ?? ink}
          style={{ fontFamily: DIDONE, fontStyle: "italic", fontSize: fit(flavour, maxW, 17, 0.5) }}
        >
          {flavour}
        </text>
      )}
    </g>
  );
}

function SizeTag({ x = 120, y, text, ink }: { x?: number; y: number; text: string; ink: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fill={ink} opacity="0.75" style={{ fontFamily: SANS, fontSize: 6.5, letterSpacing: 1.6 }}>
      {text.toUpperCase()}
    </text>
  );
}

function KSeal({ x, y, color = "#1F6FD1" }: { x: number; y: number; color?: string }) {
  // generic kosher mark placeholder (crown + K) — real seal art to be supplied
  return (
    <g transform={`translate(${x} ${y})`} fill={color}>
      <path d="M-5 -6 L-3 -9 L-1 -6.5 L0 -10 L1 -6.5 L3 -9 L5 -6 L5 -4.5 L-5 -4.5Z" />
      <text x="0" y="6" textAnchor="middle" style={{ fontFamily: SANS, fontSize: 11, fontWeight: 800 }}>
        K
      </text>
    </g>
  );
}

/* ───────────────────────── shapes ───────────────────────── */

function Pouch({ id, p, v }: { id: string; p: Product; v: Variant }) {
  const body = "M66 64 Q66 52 80 52 L160 52 Q174 52 174 64 L182 284 Q182 300 166 300 L74 300 Q58 300 58 284 Z";
  const griego = p.slug === "yogurt-griego";
  return (
    <>
      <Ground id={id} w={150} />
      {/* cap */}
      <rect x="106" y="16" width="28" height="22" rx="4" fill="#F4F2EE" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={109 + i * 5} y="18" width="1.4" height="18" fill="#000" opacity="0.07" />
      ))}
      <rect x="111" y="37" width="18" height="17" fill="#EAE6DF" />
      <rect x="104" y="44" width="32" height="4" rx="2" fill="#DCD6CC" />
      <clipPath id={`${id}-b`}>
        <path d={body} />
      </clipPath>
      <path d={body} fill={griego ? "#FBFAF7" : v.bg} />
      <g clipPath={`url(#${id}-b)`}>
        {griego ? (
          <>
            <circle cx="186" cy="250" r="78" fill={v.bg} />
            <circle cx="40" cy="300" r="56" fill={v.bg} opacity="0.7" />
          </>
        ) : (
          <circle cx="120" cy="330" r="110" fill="#fff" opacity="0.35" />
        )}
        <rect x="0" y="0" width="240" height="320" fill={`url(#${id}-soft)`} />
        <rect x="58" y="52" width="124" height="9" fill="#000" opacity="0.05" />
      </g>
      <MiniLogo x={120} y={84} s={0.95} />
      <LabelType
        y={124}
        kicker={p.kicker}
        title={p.title}
        flavour={v.name}
        ink={griego ? "#2A2622" : v.ink}
        accent={griego ? v.ink : undefined}
        maxW={104}
        titleSize={30}
      />
      {griego && (
        <g textAnchor="middle" fill={v.ink}>
          <text x="120" y="222" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 300 }}>
            9g
          </text>
          <text x="120" y="232" style={{ fontFamily: SANS, fontSize: 5.6, letterSpacing: 1.4, fontWeight: 600 }}>
            PROTEÍNAS
          </text>
        </g>
      )}
      <SizeTag y={288} text={griego ? "Cont. neto 250 ml" : p.sizes[0] ?? ""} ink={griego ? "#2A2622" : v.ink} />
    </>
  );
}

function KidPouch({ id, v }: { id: string; v: Variant }) {
  const body = "M66 64 Q66 52 80 52 L160 52 Q174 52 174 64 L182 284 Q182 300 166 300 L74 300 Q58 300 58 284 Z";
  return (
    <>
      <Ground id={id} w={150} />
      <rect x="106" y="16" width="28" height="22" rx="4" fill="#fff" />
      <rect x="111" y="37" width="18" height="17" fill="#F1EEE8" />
      <clipPath id={`${id}-b`}>
        <path d={body} />
      </clipPath>
      <path d={body} fill={v.bg} />
      <g clipPath={`url(#${id}-b)`}>
        {/* milk splash */}
        <path
          d="M40 170 C60 120 90 150 100 120 C110 95 130 100 140 122 C150 100 175 112 170 140 C195 130 210 160 190 180 C215 200 190 235 160 222 C150 250 110 248 100 228 C75 246 40 230 52 206 C25 200 25 178 40 170Z"
          fill="#fff"
        />
        <circle cx="70" cy="110" r="6" fill="#fff" />
        <circle cx="182" cy="112" r="4" fill="#fff" />
        <rect x="0" y="0" width="240" height="320" fill={`url(#${id}-soft)`} />
      </g>
      <MiniLogo x={120} y={82} s={0.85} fill={v.accent === "#FFFFFF" ? "#141210" : "#141210"} />
      <g textAnchor="middle" transform="rotate(-6 120 180)">
        <text x="120" y="176" fill={v.accent === "#FFFFFF" ? v.bg : v.accent} style={{ fontFamily: SANS, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
          YOGURT
        </text>
        <text x="120" y="204" fill={v.bg === "#F6C928" ? "#C08A00" : v.bg} style={{ fontFamily: SANS, fontSize: fit(v.name, 110, 24, 0.68), fontWeight: 800 }}>
          {v.name.toUpperCase()}
        </text>
      </g>
    </>
  );
}

function Cup({ id, p, v, tall = false }: { id: string; p: Product; v: Variant; tall?: boolean }) {
  const top = tall ? 96 : 140;
  const body = `M44 ${top} L196 ${top} L180 298 Q179 302 174 302 L66 302 Q61 302 60 298 Z`;
  return (
    <>
      <Ground id={id} w={140} />
      <clipPath id={`${id}-b`}>
        <path d={body} />
      </clipPath>
      <path d={body} fill={v.bg} />
      <g clipPath={`url(#${id}-b)`}>
        <ellipse cx="120" cy="320" rx="110" ry="60" fill="#fff" opacity="0.28" />
        <rect x="0" y="0" width="240" height="320" fill={`url(#${id}-cyl)`} />
      </g>
      {/* lid */}
      <ellipse cx="120" cy={top} rx="80" ry="12" fill="#F7F5F1" />
      <ellipse cx="120" cy={top - 2} rx="72" ry="8" fill="#fff" />
      <path d={`M40 ${top} Q120 ${top + 18} 200 ${top}`} stroke="#000" strokeOpacity="0.08" fill="none" strokeWidth="2" />
      <MiniLogo x={120} y={top + 34} s={0.85} />
      <LabelType
        y={top + 64}
        kicker={p.kicker}
        title={p.slug === "yogurt-copa" ? "Yogurt" : p.title}
        flavour={v.name}
        ink={v.ink}
        accent={v.accent && v.accent !== "#F2F0E6" ? v.accent : undefined}
        maxW={110}
        titleSize={tall ? 28 : 24}
        caps={false}
      />
    </>
  );
}

function Parfait({ id, v }: { id: string; v: Variant }) {
  const top = 92;
  const body = `M48 ${top} L192 ${top} L178 298 Q177 302 172 302 L68 302 Q63 302 62 298 Z`;
  const dots = Array.from({ length: 46 }, (_, i) => ({
    x: 56 + ((i * 37) % 128),
    y: top + 8 + ((i * 13) % 34),
    r: 2.4 + ((i * 7) % 4),
    c: ["#C98B45", "#A9692E", "#E0B26A", "#8A5326"][i % 4],
  }));
  return (
    <>
      <Ground id={id} w={136} />
      <clipPath id={`${id}-b`}>
        <path d={body} />
      </clipPath>
      <g clipPath={`url(#${id}-b)`}>
        <rect x="0" y={top} width="240" height="220" fill="#FBF7EE" />
        {/* jam */}
        <path d={`M0 246 Q60 234 120 246 T240 244 L240 320 L0 320Z`} fill={v.accent ?? "#B3243B"} />
        {/* yogurt swirl edge */}
        <path d={`M0 250 Q40 240 80 252 T160 248 T240 252`} stroke="#fff" strokeWidth="5" fill="none" opacity="0.7" />
        {/* granola */}
        <rect x="0" y={top} width="240" height="48" fill="#D6A564" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} />
        ))}
        <rect x="0" y="0" width="240" height="320" fill={`url(#${id}-glass)`} />
      </g>
      <path d={body} fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.5" />
      {/* dome lid */}
      <path d={`M40 ${top} Q120 ${top - 50} 200 ${top} Z`} fill="#fff" opacity="0.35" />
      <path d={`M40 ${top} Q120 ${top - 50} 200 ${top}`} fill="none" stroke="#fff" strokeWidth="2" />
      <ellipse cx="120" cy={top} rx="82" ry="7" fill="#fff" opacity="0.8" />
      {/* black cartouche sticker like the real parfait */}
      <MiniLogo x={120} y={184} s={1.1} />
    </>
  );
}

function YoSnack({ id, v }: { id: string; v: Variant }) {
  const top = 150;
  const body = `M48 ${top} L192 ${top} L178 298 Q177 302 172 302 L68 302 Q63 302 62 298 Z`;
  const tops = Array.from({ length: 30 }, (_, i) => ({
    x: 62 + ((i * 41) % 118),
    y: top - 6 - ((i * 17) % 34),
    r: 4 + ((i * 3) % 4),
    c: ["#E23B3B", "#2F7DE1", "#F6C928", "#3BAA4A", "#5A3426", "#E88A2A"][i % 6],
  }));
  return (
    <>
      <Ground id={id} w={136} />
      {tops.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} />
      ))}
      <path d={`M44 ${top} Q120 ${top - 90} 196 ${top}`} fill="#fff" opacity="0.25" stroke="#fff" strokeWidth="2" />
      <clipPath id={`${id}-b`}>
        <path d={body} />
      </clipPath>
      <path d={body} fill={v.bg} />
      <g clipPath={`url(#${id}-b)`}>
        <path d="M30 230 C60 205 90 228 120 210 C150 194 180 220 210 205 L210 320 L30 320Z" fill="#fff" opacity="0.9" />
        <rect x="0" y="0" width="240" height="320" fill={`url(#${id}-cyl)`} />
      </g>
      <ellipse cx="120" cy={top} rx="74" ry="8" fill="#fff" />
      <text
        x="120"
        y="196"
        textAnchor="middle"
        fill="#fff"
        transform="rotate(-8 120 196)"
        style={{ fontFamily: DIDONE, fontStyle: "italic", fontSize: 30, fontWeight: 600 }}
      >
        YoSnack
      </text>
      <text x="120" y="262" textAnchor="middle" fill={v.ink} style={{ fontFamily: DIDONE, fontStyle: "italic", fontSize: 18 }}>
        {v.name.toLowerCase()}
      </text>
    </>
  );
}

function Tub({ id, p, v, soup = false }: { id: string; p: Product; v: Variant; soup?: boolean }) {
  const top = soup ? 150 : 140;
  const body = `M30 ${top} L210 ${top} L200 296 Q199 302 192 302 L48 302 Q41 302 40 296 Z`;
  return (
    <>
      <Ground id={id} w={186} />
      <clipPath id={`${id}-b`}>
        <path d={body} />
      </clipPath>
      <path d={body} fill={v.bg} />
      <g clipPath={`url(#${id}-b)`}>
        <rect x="0" y="0" width="240" height="320" fill={`url(#${id}-cyl)`} />
      </g>
      {/* lid */}
      <path d={`M26 ${top} L214 ${top} L212 ${top - 18} Q120 ${top - 34} 28 ${top - 18} Z`} fill="#F4F2EE" />
      <ellipse cx="120" cy={top - 18} rx="92" ry="14" fill="#FBFAF8" />
      <ellipse cx="120" cy={top - 18} rx="80" ry="10" fill="none" stroke="#000" strokeOpacity="0.06" />
      <MiniLogo x={120} y={top + 28} s={0.85} fill="#fff" ink="#141210" />
      <LabelType
        y={top + 58}
        title={soup ? `Sopa de ${v.name}` : p.title}
        kicker={soup ? undefined : undefined}
        flavour={soup ? undefined : v.name === p.title || v.name === "Natural" || v.name === "Aceituna" || v.name === "Ricotta" ? undefined : v.name}
        ink={v.ink}
        maxW={150}
        titleSize={soup ? 22 : 36}
      />
      {!soup && <SizeTag y={288} text={p.sizes[0]} ink={v.ink} />}
      {soup && <SizeTag y={288} text="sin lácteos" ink={v.ink} />}
      {p.seals?.length ? <KSeal x={190} y={top + 20} color={v.ink === "#FFFFFF" ? "#fff" : "#1F6FD1"} /> : null}
    </>
  );
}

const mola = (accent: string) => (
  <g stroke={accent} strokeWidth="3" fill="none">
    {[0, 1, 2, 3].map((r) =>
      [0, 1, 2, 3, 4].map((c) => {
        const x = 50 + c * 30;
        const y = 70 + r * 22;
        return (
          <path key={`${r}-${c}`} d={`M${x} ${y} h10 v-8 h10 v8 h10 M${x + 5} ${y + 8} h20`} opacity={0.85 - r * 0.12} />
        );
      }),
    )}
  </g>
);

function Bag({ id, p, v }: { id: string; p: Product; v: Variant }) {
  const body = "M52 52 L188 52 L190 290 Q190 302 178 302 L62 302 Q50 302 50 290 Z";
  const zig = Array.from({ length: 27 }, (_, i) => `${52 + i * 5.2},${i % 2 ? 46 : 52}`).join(" ");
  const isCafe = p.category === "cafe";
  const isGranola = p.category === "granola";
  const isHarina = p.category === "harinas";
  const isFruit = p.category === "fruta-seca";
  const isMozz = p.slug === "mozzarella";
  return (
    <>
      <Ground id={id} w={156} />
      <clipPath id={`${id}-b`}>
        <path d={body} />
      </clipPath>
      <polyline points={zig} fill="none" stroke={v.bg} strokeWidth="6" strokeLinejoin="miter" />
      <path d={body} fill={v.bg} />
      <g clipPath={`url(#${id}-b)`}>
        <rect x="0" y="52" width="240" height="14" fill="#000" opacity="0.06" />
        {isCafe && mola(v.accent ?? "#2E4A8C")}
        {isGranola && (
          <>
            <rect x="0" y="52" width="240" height="40" fill={v.accent} opacity="0.95" />
            {/* window */}
            <rect x="74" y="196" width="92" height="64" rx="10" fill="#C99657" />
            {Array.from({ length: 34 }).map((_, i) => (
              <circle
                key={i}
                cx={80 + ((i * 29) % 82)}
                cy={202 + ((i * 11) % 54)}
                r={2.5 + (i % 3)}
                fill={["#E7BE7C", "#A86C2E", "#8A5326", v.accent ?? "#7A4446"][i % 4]}
              />
            ))}
          </>
        )}
        {isMozz && (
          <>
            <rect x="70" y="196" width="100" height="72" rx="10" fill="#F6E7A8" />
            {Array.from({ length: 40 }).map((_, i) => (
              <rect
                key={i}
                x={74 + ((i * 23) % 90)}
                y={200 + ((i * 13) % 62)}
                width="10"
                height="2.6"
                rx="1.3"
                fill="#E9CF6E"
                transform={`rotate(${(i * 47) % 180} ${79 + ((i * 23) % 90)} ${201 + ((i * 13) % 62)})`}
              />
            ))}
          </>
        )}
        {isFruit && (
          <>
            <rect x="66" y="150" width="108" height="128" rx="6" fill="#FFF8EE" />
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(${92 + i * 28} ${244 - (i % 2) * 10})`}>
                <circle r="13" fill={v.bg} />
                <circle r="9" fill="#F4E3C3" />
                <circle r="2" fill={v.bg} />
              </g>
            ))}
          </>
        )}
        {isHarina && <rect x="0" y="210" width="240" height="92" fill={v.accent} opacity="0.12" />}
        <rect x="0" y="0" width="240" height="320" fill={`url(#${id}-soft)`} />
      </g>
      {isCafe && (
        <>
          <MiniLogo x={120} y={170} s={0.85} />
          <text x="120" y="214" textAnchor="middle" fill={v.ink} style={{ fontFamily: DIDONE, fontSize: 26 }}>
            Café
          </text>
          <text x="120" y="238" textAnchor="middle" fill={v.ink} style={{ fontFamily: DIDONE, fontSize: 20 }}>
            Artesanal
          </text>
          <SizeTag y={262} text={v.name} ink={v.accent ?? v.ink} />
        </>
      )}
      {isGranola && (
        <>
          <MiniLogo x={120} y={73} s={0.75} fill="#fff" ink="#141210" />
          <text x="120" y="134" textAnchor="middle" fill={v.ink} style={{ fontFamily: DIDONE, fontSize: 32, fontWeight: 700 }}>
            Granola
          </text>
          <text x="120" y="152" textAnchor="middle" fill="#3A2A20" style={{ fontFamily: DIDONE, fontStyle: "italic", fontSize: 8.6 }}>
            Desayuno y snack en un solo empaque
          </text>
          <text x="120" y="180" textAnchor="middle" fill={v.ink} style={{ fontFamily: DIDONE, fontStyle: "italic", fontSize: fit(v.name, 110, 16, 0.5) }}>
            {v.name}
          </text>
          <SizeTag y={286} text="100% natural" ink={v.ink} />
        </>
      )}
      {isMozz && (
        <>
          <MiniLogo x={120} y={88} s={0.85} fill="#fff" ink="#141210" />
          <LabelType y={124} kicker="Queso" title="Mozzarella" flavour={v.name.toLowerCase()} ink={v.ink} maxW={120} titleSize={22} />
        </>
      )}
      {isFruit && (
        <>
          <MiniLogo x={120} y={88} s={0.85} fill="#fff" ink="#141210" />
          <text x="120" y="122" textAnchor="middle" fill="#fff" style={{ fontFamily: DIDONE, fontSize: 15, letterSpacing: 1 }}>
            FRUIT EXOTIC
          </text>
          <text x="120" y="176" textAnchor="middle" fill={v.bg} style={{ fontFamily: DIDONE, fontSize: fit(v.name, 96, 15, 0.52) }}>
            {v.name}
          </text>
          <SizeTag y={196} text="sin azúcar · 75 g" ink="#3A2A20" />
        </>
      )}
      {isHarina && (
        <>
          <MiniLogo x={120} y={96} s={0.9} />
          <text x="120" y="150" textAnchor="middle" fill={v.ink} style={{ fontFamily: SANS, fontSize: 9, letterSpacing: 4, fontWeight: 600 }}>
            HARINA
          </text>
          <text x="120" y="182" textAnchor="middle" fill={v.ink} style={{ fontFamily: DIDONE, fontSize: fit(v.name, 120, 28, 0.55) }}>
            {v.name}
          </text>
          <SizeTag y={286} text="225 g" ink={v.ink} />
        </>
      )}
    </>
  );
}

function Tray({ id, p, v }: { id: string; p: Product; v: Variant }) {
  const olives = Array.from({ length: 22 }, (_, i) => ({
    x: 50 + ((i * 31) % 140),
    y: 180 + ((i * 17) % 100),
    c: ["#4A5A1E", "#6E7A2A", "#3A2A2A", "#5A6A22"][i % 4],
  }));
  return (
    <>
      <Ground id={id} w={196} />
      {/* clamshell */}
      <path d="M34 150 L206 150 L198 296 Q197 302 190 302 L50 302 Q43 302 42 296 Z" fill="#E9ECDD" />
      <clipPath id={`${id}-b`}>
        <path d="M34 150 L206 150 L198 296 Q197 302 190 302 L50 302 Q43 302 42 296 Z" />
      </clipPath>
      <g clipPath={`url(#${id}-b)`}>
        {olives.map((o, i) => (
          <ellipse key={i} cx={o.x} cy={o.y} rx="13" ry="10" fill={o.c} />
        ))}
        {olives.map((o, i) => (
          <ellipse key={`h${i}`} cx={o.x - 4} cy={o.y - 4} rx="3" ry="2" fill="#fff" opacity="0.35" />
        ))}
        <rect x="0" y="0" width="240" height="320" fill={`url(#${id}-glass)`} />
      </g>
      <path d="M28 150 L212 150 L206 134 L34 134 Z" fill="#fff" opacity="0.7" />
      {/* arched label like the olive labels */}
      <path d="M78 284 L78 196 Q78 160 120 160 Q162 160 162 196 L162 284 Z" fill={v.bg} />
      <path d="M84 280 L84 198 Q84 166 120 166 Q156 166 156 198 L156 280 Z" fill="none" stroke={v.ink} strokeOpacity="0.5" strokeWidth="0.8" />
      <MiniLogo x={120} y={188} s={0.6} fill="#fff" ink="#141210" />
      <text x="120" y="226" textAnchor="middle" fill={v.ink} style={{ fontFamily: DIDONE, fontSize: fit(v.name, 66, 18, 0.55) }}>
        {v.name.toUpperCase()}
      </text>
      <text x="120" y="246" textAnchor="middle" fill={v.ink} style={{ fontFamily: DIDONE, fontSize: 12 }}>
        {p.slug === "aceitunas-condimentadas" && !/olives/i.test(v.name) ? "OLIVES" : ""}
      </text>
      <path d="M104 262 q8 -8 16 0 q8 8 16 0" stroke={v.ink} fill="none" strokeWidth="0.8" />
      <SizeTag y={276} text="10 oz" ink={v.ink} />
    </>
  );
}

function Vacuum({ id, p, v }: { id: string; p: Product; v: Variant }) {
  const isMix = p.slug === "mix-sopero";
  const chunks = Array.from({ length: 14 }, (_, i) => ({
    x: 56 + ((i * 37) % 120),
    y: 150 + ((i * 23) % 120),
    w: 30 + ((i * 7) % 18),
    h: 18 + ((i * 5) % 12),
    r: (i * 29) % 40 - 20,
    c: isMix ? ["#F4EEDC", "#F08A2E", "#F2A22E", "#E9D7B5", "#C9A27A"][i % 5] : v.accent ?? "#F4EEDC",
  }));
  const body = "M44 70 Q44 60 54 60 L186 60 Q196 60 196 70 L200 290 Q200 302 188 302 L52 302 Q40 302 40 290 Z";
  return (
    <>
      <Ground id={id} w={170} />
      <clipPath id={`${id}-b`}>
        <path d={body} />
      </clipPath>
      <path d={body} fill="#EEF0E8" />
      <g clipPath={`url(#${id}-b)`}>
        {chunks.map((c, i) => (
          <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} rx="7" fill={c.c} transform={`rotate(${c.r} ${c.x + c.w / 2} ${c.y + c.h / 2})`} />
        ))}
        <rect x="0" y="60" width="240" height="64" fill={v.bg} />
        <rect x="0" y="0" width="240" height="320" fill={`url(#${id}-glass)`} />
      </g>
      <MiniLogo x={120} y={84} s={0.7} />
      <text x="120" y="116" textAnchor="middle" fill={v.ink} style={{ fontFamily: DIDONE, fontSize: fit(p.title, 140, 20, 0.55) }}>
        {p.title.toUpperCase()}
      </text>
      <rect x="150" y="270" width="40" height="18" rx="9" fill={v.bg} />
      <text x="170" y="282" textAnchor="middle" fill={v.ink} style={{ fontFamily: SANS, fontSize: 7, fontWeight: 600 }}>
        1 KG
      </text>
    </>
  );
}

function Bottle({ id, v }: { id: string; v: Variant }) {
  const body = "M84 92 Q84 78 98 70 L98 56 L142 56 L142 70 Q156 78 156 92 L158 292 Q158 302 148 302 L92 302 Q82 302 82 292 Z";
  return (
    <>
      <Ground id={id} w={100} />
      <rect x="96" y="28" width="48" height="30" rx="4" fill="#1D1D1B" />
      <clipPath id={`${id}-b`}>
        <path d={body} />
      </clipPath>
      <path d={body} fill="#F3F6C8" />
      <g clipPath={`url(#${id}-b)`}>
        <rect x="0" y="140" width="240" height="130" fill={v.bg} />
        <rect x="0" y="0" width="240" height="320" fill={`url(#${id}-cyl)`} />
      </g>
      <MiniLogo x={120} y={162} s={0.6} />
      <text x="120" y="200" textAnchor="middle" fill="#2E6B12" style={{ fontFamily: SANS, fontSize: 15, fontWeight: 800 }}>
        LIMÓN
      </text>
      <text x="120" y="216" textAnchor="middle" fill="#2E6B12" style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6 }}>
        EXPRIMIDO
      </text>
      <circle cx="120" cy="242" r="12" fill="#8CC63F" />
      <circle cx="120" cy="242" r="8.5" fill="#E8F2A0" />
    </>
  );
}

function Block({ id, p, v }: { id: string; p: Product; v: Variant }) {
  const body = "M36 150 L204 150 Q212 150 212 158 L212 290 Q212 300 202 300 L38 300 Q28 300 28 290 L28 158 Q28 150 36 150 Z";
  return (
    <>
      <Ground id={id} w={196} />
      {/* top face */}
      <path d="M36 150 L56 122 L222 122 L204 150 Z" fill="#F7F4EA" />
      <path d="M204 150 L222 122 L222 266 Q222 274 214 280 L212 290 L212 158 Z" fill="#E8E2D2" />
      <path d={body} fill="#FBF8F0" />
      <clipPath id={`${id}-b`}>
        <path d={body} />
      </clipPath>
      <g clipPath={`url(#${id}-b)`}>
        <rect x="0" y="0" width="240" height="320" fill={`url(#${id}-glass)`} />
        {Array.from({ length: 12 }).map((_, i) => (
          <circle key={i} cx={40 + ((i * 53) % 170)} cy={170 + ((i * 29) % 120)} r="1.6" fill="#E8DFC8" />
        ))}
      </g>
      {/* crimp seal */}
      {Array.from({ length: 34 }).map((_, i) => (
        <rect key={i} x={30 + i * 5.2} y="296" width="2" height="8" fill="#fff" opacity="0.8" />
      ))}
      {/* round black sticker with coloured ring, as on the cheese packs */}
      <circle cx="120" cy="218" r="56" fill={v.bg} />
      <circle cx="120" cy="218" r="56" fill="none" stroke={v.accent} strokeWidth="6" />
      <circle cx="120" cy="218" r="47" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.6" />
      <MiniLogo x={120} y={194} s={0.62} fill="#fff" ink="#141210" />
      <text x="120" y="226" textAnchor="middle" fill="#fff" style={{ fontFamily: DIDONE, fontSize: fit(p.title, 76, 17, 0.6) }}>
        {p.title.toUpperCase()}
      </text>
      <text x="120" y="241" textAnchor="middle" fill={v.accent} style={{ fontFamily: DIDONE, fontStyle: "italic", fontSize: 10 }}>
        {v.name === p.title ? "queso fresco" : v.name.toLowerCase()}
      </text>
      <SizeTag y={258} text="8 oz" ink="#fff" />
    </>
  );
}

function Arepas({ id, p, v }: { id: string; p: Product; v: Variant }) {
  const discs = [0, 1, 2, 3, 4];
  return (
    <>
      <Ground id={id} w={196} />
      {/* pillow pack */}
      <path d="M26 176 Q24 150 50 148 L190 148 Q216 150 214 176 L214 278 Q214 302 190 302 L50 302 Q26 302 26 278 Z" fill="#F7F3E8" opacity="0.6" />
      {discs.map((i) => (
        <g key={i} transform={`translate(0 ${-i * 14})`}>
          <ellipse cx="120" cy="282" rx="88" ry="22" fill={v.accent} />
          <ellipse cx="120" cy="278" rx="88" ry="22" fill={v.bg} />
        </g>
      ))}
      {/* grill marks on the top arepa */}
      <clipPath id={`${id}-t`}>
        <ellipse cx="120" cy={278 - 56} rx="88" ry="22" />
      </clipPath>
      <g clipPath={`url(#${id}-t)`} stroke="#7A4A1E" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={40 + i * 30} y1={200} x2={70 + i * 30} y2={248} />
        ))}
      </g>
      <path d="M26 176 Q24 150 50 148 L190 148 Q216 150 214 176 L214 278 Q214 302 190 302 L50 302 Q26 302 26 278 Z" fill={`url(#${id}-glass)`} />
      {/* label band */}
      <rect x="54" y="114" width="132" height="58" rx="6" fill={v.ink} />
      <MiniLogo x={120} y={130} s={0.5} fill="#fff" ink="#141210" />
      <text x="120" y="152" textAnchor="middle" fill="#fff" style={{ fontFamily: DIDONE, fontStyle: "italic", fontSize: 13 }}>
        Arepas
      </text>
      <text x="120" y="165" textAnchor="middle" fill="#fff" opacity="0.9" style={{ fontFamily: SANS, fontSize: fit(p.title, 118, 7, 0.62), letterSpacing: 1.2 }}>
        {p.title.toUpperCase()}
      </text>
    </>
  );
}

function Tortillas({ id, v }: { id: string; v: Variant }) {
  return (
    <>
      <Ground id={id} w={170} />
      {Array.from({ length: 14 }).map((_, i) => (
        <ellipse key={i} cx="120" cy={292 - i * 9} rx="76" ry="18" fill={i % 2 ? v.bg : v.accent} />
      ))}
      <path d="M40 160 Q40 150 52 150 L188 150 Q200 150 200 160 L200 290 Q200 302 188 302 L52 302 Q40 302 40 290 Z" fill={`url(#${id}-glass)`} />
      <circle cx="120" cy="212" r="38" fill="#fff" />
      <circle cx="120" cy="212" r="33" fill="none" stroke={v.ink} strokeWidth="0.8" />
      <MiniLogo x={120} y={200} s={0.55} />
      <text x="120" y="226" textAnchor="middle" fill={v.ink} style={{ fontFamily: DIDONE, fontSize: 11 }}>
        TORTILLAS
      </text>
      <text x="120" y="237" textAnchor="middle" fill={v.ink} style={{ fontFamily: DIDONE, fontStyle: "italic", fontSize: 8 }}>
        de maíz
      </text>
    </>
  );
}

export function Pack({ product: p, variant = 0, className, shadow = true, title }: Props) {
  const raw = useId();
  const id = "pk" + raw.replace(/[^a-zA-Z0-9]/g, "");
  const v = p.variants[Math.min(variant, p.variants.length - 1)];
  const label = title ?? `${p.name} ${p.variants.length > 1 ? v.name : ""}`.trim();

  let shape: React.ReactNode;
  switch (p.shape) {
    case "pouch":
      shape = <Pouch id={id} p={p} v={v} />;
      break;
    case "kidpouch":
      shape = <KidPouch id={id} v={v} />;
      break;
    case "cup":
      shape = <Cup id={id} p={p} v={v} tall={p.slug !== "yogurt-copa"} />;
      break;
    case "parfait":
      shape = <Parfait id={id} v={v} />;
      break;
    case "yosnack":
      shape = <YoSnack id={id} v={v} />;
      break;
    case "tub":
      shape = <Tub id={id} p={p} v={v} />;
      break;
    case "soup":
      shape = <Tub id={id} p={p} v={v} soup />;
      break;
    case "bag":
      shape = <Bag id={id} p={p} v={v} />;
      break;
    case "tray":
      shape = <Tray id={id} p={p} v={v} />;
      break;
    case "vacuum":
      shape = <Vacuum id={id} p={p} v={v} />;
      break;
    case "bottle":
      shape = <Bottle id={id} v={v} />;
      break;
    case "block":
      shape = <Block id={id} p={p} v={v} />;
      break;
    case "arepas":
      shape = <Arepas id={id} p={p} v={v} />;
      break;
    case "tortillas":
      shape = <Tortillas id={id} v={v} />;
      break;
    default:
      shape = null;
  }

  return (
    <svg viewBox="0 0 240 320" className={className} role="img" aria-label={label} data-shadow={shadow ? undefined : "off"}>
      <Shade id={id} />
      {shape}
    </svg>
  );
}

import { CLOCK_TIMES, type Look } from "./scene";

/** Procedural item art. Draws one item in a -50..50 box. All original shapes. */

const INK = "#2a0a14";
const PAPER = "#fff8fa";
const SW = 3.5;

export const mainColor = (hue: number) => `oklch(0.7 0.16 ${hue})`;
const lightColor = (hue: number) => `oklch(0.88 0.08 ${hue})`;

export function Glyph({ look }: { look: Look }) {
  const s = look.scale;
  return <g transform={`scale(${s})`}>{draw(look)}</g>;
}

function draw(l: Look) {
  switch (l.theme) {
    case "tiles":
      return <Tile l={l} />;
    case "critters":
      return <Critter l={l} />;
    case "flowers":
      return <Flower l={l} />;
    case "clocks":
      return <Clock l={l} />;
    case "arrows":
      return <Arrow l={l} />;
    case "fish":
      return <Fish l={l} />;
    case "urchins":
      return <Urchin l={l} />;
  }
}

function Tile({ l }: { l: Look }) {
  const inner = [
    <circle key="c" r="17" fill={PAPER} stroke={INK} strokeWidth={SW} />,
    <path key="t" d="M0 -21 L19 13 L-19 13 Z" fill={PAPER} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />,
    <path key="d" d="M0 -22 L18 0 L0 22 L-18 0 Z" fill={PAPER} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />,
    <g key="r">
      <circle r="16" fill="none" stroke={INK} strokeWidth="11" />
      <circle r="16" fill="none" stroke={PAPER} strokeWidth="5" />
    </g>,
    <path
      key="p"
      d="M-6 -20 H6 V-6 H20 V6 H6 V20 H-6 V6 H-20 V-6 H-6 Z"
      fill={PAPER}
      stroke={INK}
      strokeWidth={SW}
      strokeLinejoin="round"
    />,
  ][l.alt];
  return (
    <g transform={`rotate(${l.rot})`}>
      <rect x="-40" y="-40" width="80" height="80" rx="17" fill={mainColor(l.hue)} stroke={INK} strokeWidth={SW + 0.5} />
      {inner}
      {l.detail && <circle cx="-25" cy="-25" r="5" fill={INK} />}
    </g>
  );
}

function Critter({ l }: { l: Look }) {
  const body = [
    <circle key="0" cx="0" cy="6" r="36" />,
    <rect key="1" x="-35" y="-26" width="70" height="66" rx="24" />,
    <path key="2" d="M0 -32 C 22 -32 26 -10 34 14 C 40 34 22 42 0 42 C -22 42 -40 34 -34 14 C -26 -10 -22 -32 0 -32 Z" />,
  ][l.alt];
  const eyeXs = l.count === 1 ? [0] : l.count === 2 ? [-13, 13] : [-19, 0, 19];
  return (
    <g transform={`scale(${l.mirror ? -1 : 1} 1)`}>
      {/* Antenna (only on one side, so the critter has a handedness) */}
      <path d="M12 -26 Q 20 -40 30 -44" fill="none" stroke={INK} strokeWidth={SW} strokeLinecap="round" />
      <circle cx="31" cy="-44" r="6" fill={lightColor(l.hue + 180)} stroke={INK} strokeWidth={SW - 0.5} />
      <g fill={mainColor(l.hue)} stroke={INK} strokeWidth={SW + 0.5} strokeLinejoin="round">
        {body}
      </g>
      {eyeXs.map((x) => (
        <g key={x}>
          <circle cx={x} cy="0" r="8.5" fill={PAPER} stroke={INK} strokeWidth={SW - 1} />
          <circle cx={x + 3} cy="1" r="3.8" fill={INK} />
        </g>
      ))}
      <path d="M-11 17 Q 0 27 11 17" fill="none" stroke={INK} strokeWidth={SW} strokeLinecap="round" />
      {l.detail && <rect x="2" y="20" width="6" height="6" rx="1" fill={PAPER} stroke={INK} strokeWidth="1.8" />}
      <circle cx="-22" cy="14" r="4.5" fill={INK} opacity="0.15" />
    </g>
  );
}

function Flower({ l }: { l: Look }) {
  const petals = Array.from({ length: l.count }, (_, i) => (i * 360) / l.count);
  return (
    <g>
      {petals.map((a) =>
        l.alt === 0 ? (
          <ellipse
            key={a}
            cx="0"
            cy="-26"
            rx="11"
            ry="17"
            transform={`rotate(${a})`}
            fill={mainColor(l.hue)}
            stroke={INK}
            strokeWidth={SW - 0.5}
          />
        ) : (
          <path
            key={a}
            d="M0 -10 C 13 -20 11 -36 0 -46 C -11 -36 -13 -20 0 -10 Z"
            transform={`rotate(${a})`}
            fill={mainColor(l.hue)}
            stroke={INK}
            strokeWidth={SW - 0.5}
            strokeLinejoin="round"
          />
        ),
      )}
      <circle r="13" fill="#ffd23f" stroke={INK} strokeWidth={SW} />
      {l.detail && (
        <g fill={INK}>
          <circle cx="-4.5" cy="-3" r="2.2" />
          <circle cx="4.5" cy="-3" r="2.2" />
          <circle cx="0" cy="4.5" r="2.2" />
        </g>
      )}
    </g>
  );
}

function Clock({ l }: { l: Look }) {
  const [h, m] = CLOCK_TIMES[l.alt];
  const sgn = l.mirror ? -1 : 1;
  const hourA = sgn * (h + m / 60) * 30;
  const minA = sgn * m * 6 + l.rot;
  return (
    <g>
      <circle r="40" fill={PAPER} stroke={mainColor(l.hue)} strokeWidth="8" />
      <circle r="44" fill="none" stroke={INK} strokeWidth="2.5" />
      <circle r="36" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.4" />
      {Array.from({ length: 12 }, (_, i) =>
        i === 0 ? null : (
          <line
            key={i}
            x1="0"
            y1={i % 3 === 0 ? -26 : -29}
            x2="0"
            y2="-33"
            stroke={INK}
            strokeWidth={i % 3 === 0 ? 3 : 1.6}
            transform={`rotate(${i * 30})`}
          />
        ),
      )}
      {l.detail && <path d="M0 -24 L5 -33 L-5 -33 Z" fill={mainColor(l.hue)} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />}
      <line x1="0" y1="4" x2="0" y2="-19" stroke={INK} strokeWidth="6" strokeLinecap="round" transform={`rotate(${hourA})`} />
      <line x1="0" y1="5" x2="0" y2="-30" stroke={INK} strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${minA})`} />
      <circle r="4.5" fill={mainColor(l.hue)} stroke={INK} strokeWidth="2" />
    </g>
  );
}

function Arrow({ l }: { l: Look }) {
  const head = [
    "M0 -46 L26 -12 L-26 -12 Z",
    "M0 -46 L28 -8 L10 -14 L-10 -14 L-28 -8 Z",
    "M0 -46 C 18 -46 26 -26 22 -12 L -22 -12 C -26 -26 -18 -46 0 -46 Z",
  ][l.alt];
  return (
    <g transform={`rotate(${l.rot}) scale(${l.mirror ? -1 : 1} 1)`}>
      <path d="M8 18 L26 38 L8 38 Z" fill={lightColor(l.hue)} stroke={INK} strokeWidth={SW - 0.5} strokeLinejoin="round" />
      <rect x="-8" y="-16" width="16" height="58" rx="5" fill={mainColor(l.hue)} stroke={INK} strokeWidth={SW} />
      <path d={head} fill={mainColor(l.hue)} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      {l.detail && <circle cx="0" cy="-25" r="4.5" fill={PAPER} stroke={INK} strokeWidth="1.8" />}
    </g>
  );
}

function Fish({ l }: { l: Look }) {
  const tail =
    l.alt === 0
      ? "M-26 0 L-48 -20 L-41 0 L-48 20 Z"
      : "M-26 0 C -40 -26 -52 -14 -48 0 C -52 14 -40 26 -26 0 Z";
  const stripes = l.count === 1 ? [-2] : l.count === 2 ? [-8, 4] : [-12, -2, 8];
  return (
    <g transform={`rotate(${l.rot}) scale(${l.mirror ? -1 : 1} 1)`}>
      <path d={tail} fill={lightColor(l.hue)} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M-6 -20 Q 4 -36 18 -20 Z" fill={lightColor(l.hue)} stroke={INK} strokeWidth={SW - 0.5} strokeLinejoin="round" />
      <ellipse cx="2" cy="0" rx="34" ry="22" fill={mainColor(l.hue)} stroke={INK} strokeWidth={SW} />
      {stripes.map((x) => (
        <path key={x} d={`M${x} -19 Q ${x + 7} 0 ${x} 19`} fill="none" stroke={INK} strokeWidth="2.5" opacity="0.55" strokeLinecap="round" />
      ))}
      {l.detail && (
        <g>
          <circle cx="21" cy="-6" r="6" fill={PAPER} stroke={INK} strokeWidth="2" />
          <circle cx="23" cy="-6" r="2.8" fill={INK} />
        </g>
      )}
      <path d="M31 6 Q 27 9 24 7" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Urchin({ l }: { l: Look }) {
  const n = l.count;
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n - Math.PI / 2;
    const r = i % 2 === 0 ? 44 : 23;
    pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return (
    <g transform={`rotate(${l.rot})`}>
      <polygon
        points={pts.join(" ")}
        fill={mainColor(l.hue)}
        stroke={INK}
        strokeWidth={SW}
        strokeLinejoin={l.alt === 1 ? "round" : "miter"}
      />
      {l.alt === 1 &&
        Array.from({ length: n }, (_, i) => {
          const a = ((i * 2) * Math.PI) / n - Math.PI / 2;
          return <circle key={i} cx={Math.cos(a) * 44} cy={Math.sin(a) * 44} r="5.5" fill={lightColor(l.hue)} stroke={INK} strokeWidth="2.2" />;
        })}
      <circle r="13" fill={lightColor(l.hue)} stroke={INK} strokeWidth={SW - 1} />
      {l.detail && <circle r="5" fill={INK} />}
    </g>
  );
}

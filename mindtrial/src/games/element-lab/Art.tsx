/**
 * Cover art: a pixel-grid cross-section of a tiny universe — sand pouring,
 * a pool of water, a stone ledge, a lava pocket and a column of fire.
 */

const CELL = 10;
const COLS = 40;
const ROWS = 30;

type Px = { x: number; y: number; c: string };

/** Deterministic hash noise so the art is identical on server and client. */
function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pick(cs: string[], x: number, y: number) {
  return cs[Math.floor(hash(x, y) * cs.length)];
}

const SAND = ["#e8c27a", "#dcb46c", "#f0cd8a", "#d9ae63"];
const WATER = ["#2f8fe8", "#3a9cf0", "#2a83d8", "#3dc6ff"];
const STONE = ["#7f7972", "#746e67", "#8a847c"];
const LAVA = ["#ff5a1f", "#ff7a2a", "#ffb02e", "#e8441c"];
const PLANT = ["#4cbb4a", "#43a842", "#5bcc58"];
const FIRE = ["#fff3b0", "#ffb347", "#ff9b3d", "#e8441c"];

function buildScene() {
  const ground: Px[] = [];
  const fire: Px[] = [];
  const stream: Px[] = [];
  for (let x = 0; x < COLS; x++) {
    // Sand dune height on the left two thirds.
    const dune = Math.round(9 + 4 * Math.sin(x * 0.22) - Math.max(0, x - 18) * 0.7);
    for (let y = 0; y < ROWS; y++) {
      const depth = ROWS - 1 - y;
      // Bedrock.
      if (depth < 3) {
        ground.push({ x, y, c: pick(STONE, x, y) });
        continue;
      }
      // Lava pocket in the bedrock.
      if (depth < 6 && x > 6 && x < 15 && depth >= 3 && Math.abs(x - 10.5) < 4.5 - (depth - 3)) {
        ground.push({ x, y, c: pick(LAVA, x, y) });
        continue;
      }
      // Water pool on the right, held by a stone wall.
      if (x === 25 && depth < 11) {
        ground.push({ x, y, c: pick(STONE, x, y) });
        continue;
      }
      if (x > 25 && depth < 9) {
        ground.push({ x, y, c: depth === 8 ? "#7fd9ff" : pick(WATER, x, y) });
        continue;
      }
      if (x <= 24 && depth < dune) {
        ground.push({ x, y, c: depth < 6 && hash(x, y) < 0.12 ? "#9fdcd8" : pick(SAND, x, y) });
      }
    }
  }
  // Plant growing on the stone wall.
  for (let y = 8; y < 19; y++) ground.push({ x: 25 + (y % 3 === 0 ? 1 : 0), y, c: pick(PLANT, 25, y) });
  ground.push({ x: 24, y: 10, c: PLANT[0] }, { x: 26, y: 12, c: PLANT[2] }, { x: 24, y: 14, c: PLANT[1] });
  // Fire column above the dune crest.
  for (let y = 2; y < 17; y++) {
    const spread = (17 - y) * 0.28 + 0.8;
    for (let x = 6; x < 18; x++) {
      const d = Math.abs(x - 11.5);
      if (d > spread) continue;
      const r = hash(x * 3, y * 7);
      if (r < 0.25 + (y / 17) * 0.4) continue;
      const heat = 1 - d / spread;
      const idx = heat > 0.7 && y > 9 ? 0 : heat > 0.45 ? 1 : y < 7 ? 3 : 2;
      fire.push({ x, y, c: FIRE[idx] });
    }
  }
  // Sand pouring in from the top-right.
  for (let y = 0; y < 12; y++) {
    if (hash(33, y) < 0.8) stream.push({ x: 33 + (hash(y, 1) < 0.3 ? 1 : 0), y, c: pick(SAND, 33, y) });
  }
  return { ground, fire, stream };
}

const SCENE = buildScene();

export default function ElementLabArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Element Lab cover art">
      <style>{`
        .el-fire { animation: el-flicker 0.9s steps(3) infinite; transform-origin: 115px 170px; }
        .el-pour { animation: el-pour 0.6s steps(2) infinite; }
        @keyframes el-flicker { 0% { transform: scaleY(1); opacity: 1; } 50% { transform: scaleY(1.05) translateY(-2px); opacity: 0.92; } 100% { transform: scaleY(0.97); opacity: 1; } }
        @keyframes el-pour { 0% { transform: translateY(0); } 100% { transform: translateY(10px); } }
        @media (prefers-reduced-motion: reduce) { .el-fire, .el-pour { animation: none; } }
      `}</style>
      <defs>
        <radialGradient id="el-glow" cx="0.29" cy="0.55" r="0.45">
          <stop offset="0" stopColor="#ff9b3d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff9b3d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="el-glow2" cx="0.27" cy="0.9" r="0.3">
          <stop offset="0" stopColor="#ff5a1f" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="#14110f" />
      {/* faint grid */}
      <g stroke="#f6efe2" strokeOpacity="0.05" strokeWidth="1">
        {Array.from({ length: COLS + 1 }, (_, i) => (
          <line key={`v${i}`} x1={i * CELL} y1={0} x2={i * CELL} y2={300} />
        ))}
        {Array.from({ length: ROWS + 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * CELL} x2={400} y2={i * CELL} />
        ))}
      </g>
      <rect width="400" height="300" fill="url(#el-glow)" />
      <g shapeRendering="crispEdges">
        {SCENE.ground.map((p, i) => (
          <rect key={i} x={p.x * CELL} y={p.y * CELL} width={CELL} height={CELL} fill={p.c} />
        ))}
        <g className="el-pour">
          {SCENE.stream.map((p, i) => (
            <rect key={i} x={p.x * CELL} y={p.y * CELL - 10} width={CELL} height={CELL} fill={p.c} />
          ))}
        </g>
        <g className="el-fire">
          {SCENE.fire.map((p, i) => (
            <rect key={i} x={p.x * CELL} y={p.y * CELL} width={CELL} height={CELL} fill={p.c} />
          ))}
        </g>
      </g>
      <rect width="400" height="300" fill="url(#el-glow2)" style={{ mixBlendMode: "screen" }} />
      {/* steam puffs over the pool */}
      <g fill="#c9d6df" opacity="0.5" shapeRendering="crispEdges">
        <rect x="300" y="160" width="10" height="10" />
        <rect x="320" y="140" width="10" height="10" />
        <rect x="350" y="150" width="10" height="10" />
        <rect x="370" y="120" width="10" height="10" />
        <rect x="340" y="110" width="10" height="10" opacity="0.6" />
      </g>
    </svg>
  );
}

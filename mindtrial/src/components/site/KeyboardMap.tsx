import { PLAYER_COLORS } from "@/lib/players";

/**
 * Stylised keyboard showing each Party Mode player's key cluster.
 * Pure SVG, decorative (the real controls are listed as text nearby).
 */
const ROWS = ["1234567890", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const OWNER: Record<string, number> = {
  W: 0, A: 0, S: 0, D: 0, Q: 0,
  I: 2, J: 2, K: 2, L: 2, U: 2,
  T: 3, F: 3, G: 3, H: 3, R: 3,
};

export function KeyboardMap({ className = "" }: { className?: string }) {
  const k = 38;
  const gap = 5;
  const offsets = [0, 18, 30, 50];
  return (
    <svg viewBox="0 0 690 230" className={className} role="img" aria-label="Keyboard map: Coral uses W A S D and Q, Azure uses the arrow keys and Enter, Lime uses I J K L and U, Amber uses T F G H and R">
      {ROWS.map((row, r) =>
        row.split("").map((ch, c) => {
          const owner = OWNER[ch];
          const x = 10 + offsets[r] + c * (k + gap);
          const y = 10 + r * (k + gap);
          const col = owner !== undefined ? PLAYER_COLORS[owner].color : undefined;
          return (
            <g key={ch}>
              <rect x={x} y={y + 3} width={k} height={k} rx={7} fill={col ? PLAYER_COLORS[owner].shade : "#000"} opacity={col ? 1 : 0.35} />
              <rect x={x} y={y} width={k} height={k} rx={7} fill={col ?? "#2a2622"} stroke={col ? "none" : "#4a443d"} />
              <text x={x + k / 2} y={y + k / 2 + 5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="14" fontWeight="700" fill={col ? "#141210" : "#8d857b"}>
                {ch}
              </text>
            </g>
          );
        }),
      )}
      {/* Enter */}
      <g>
        <rect x={10 + 18 + 10 * (k + gap)} y={10 + (k + gap) + 3} width={k + 22} height={2 * k + gap} rx={7} fill={PLAYER_COLORS[1].shade} />
        <rect x={10 + 18 + 10 * (k + gap)} y={10 + (k + gap)} width={k + 22} height={2 * k + gap} rx={7} fill={PLAYER_COLORS[1].color} />
        <text x={10 + 18 + 10 * (k + gap) + (k + 22) / 2} y={10 + (k + gap) + k + 6} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="12" fontWeight="700" fill="#141210">
          ENTER
        </text>
      </g>
      {/* Arrows */}
      {[
        { x: 1, y: 0, l: "↑" },
        { x: 0, y: 1, l: "←" },
        { x: 1, y: 1, l: "↓" },
        { x: 2, y: 1, l: "→" },
      ].map((a) => {
        const x = 545 + a.x * (k + gap);
        const y = 10 + 2 * (k + gap) + a.y * (k + gap) + 4;
        return (
          <g key={a.l}>
            <rect x={x} y={y + 3} width={k} height={k} rx={7} fill={PLAYER_COLORS[1].shade} />
            <rect x={x} y={y} width={k} height={k} rx={7} fill={PLAYER_COLORS[1].color} />
            <text x={x + k / 2} y={y + k / 2 + 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#141210">
              {a.l}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

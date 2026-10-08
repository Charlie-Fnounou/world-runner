/**
 * Handcrafted levels. Logical space is 1200 × 750 (see physics.ts).
 * Every level was verified headlessly with a reference solution.
 */
import type { LevelGeometry, Part, PartKind, WallDef } from "./physics";

export interface Level extends LevelGeometry {
  id: number;
  name: string;
  hint: string;
  inventory: Partial<Record<PartKind, number>>;
  /** Pre-placed, immovable parts. */
  fixed?: Omit<Part, "id" | "fixed">[];
}

const deg = (d: number) => (d * Math.PI) / 180;

/** Floor plus side walls, shared by most levels. */
function box(floorY = 700): WallDef[] {
  return [
    { ax: 30, ay: floorY, bx: 1170, by: floorY },
    { ax: 30, ay: 40, bx: 30, by: floorY },
    { ax: 1170, ay: 40, bx: 1170, by: floorY },
  ];
}

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "First Slope",
    hint: "The ball falls straight down. Give it a ramp so it rolls toward the star.",
    start: { x: 180, y: 90 },
    walls: box(),
    targets: [{ x: 900, y: 668 }],
    inventory: { ramp: 1 },
  },
  {
    id: 2,
    name: "Bounce House",
    hint: "Bumpers kick the ball away from their centre. Aim the kick at the shelf.",
    start: { x: 880, y: 80 },
    walls: [...box(), { ax: 460, ay: 390, bx: 700, by: 390 }, { ax: 460, ay: 330, bx: 460, by: 390 }],
    targets: [{ x: 560, y: 358 }],
    inventory: { bumper: 1, ramp: 1 },
  },
  {
    id: 3,
    name: "Mind the Gap",
    hint: "Dominoes topple into each other. Fill the gap so the last one reaches the star.",
    start: { x: 130, y: 80 },
    walls: box(),
    targets: [{ x: 790, y: 625 }],
    fixed: [400, 450, 500, 650, 700, 750].map((x) => ({ kind: "domino" as const, x, y: 692, angle: 0 })),
    inventory: { ramp: 1, domino: 2 },
  },
  {
    id: 4,
    name: "Spring Loaded",
    hint: "Springs launch the ball along the direction they face. Rotate to aim.",
    start: { x: 1000, y: 80 },
    walls: [...box(), { ax: 640, ay: 420, bx: 640, by: 700, r: 10 }],
    targets: [{ x: 330, y: 600 }],
    inventory: { spring: 1, ramp: 1 },
  },
  {
    id: 5,
    name: "Demolition",
    hint: "The star is caged. A bomb's blast reaches through walls.",
    start: { x: 160, y: 80 },
    walls: [
      ...box(),
      { ax: 880, ay: 560, bx: 1020, by: 560 },
      { ax: 880, ay: 560, bx: 880, by: 700 },
      { ax: 1020, ay: 560, bx: 1020, by: 700 },
    ],
    targets: [{ x: 950, y: 640 }],
    inventory: { ramp: 1, bomb: 1 },
  },
  {
    id: 6,
    name: "Ricochet",
    hint: "One ball, two stars. Bank it off a bumper.",
    start: { x: 220, y: 80 },
    walls: [...box(), { ax: 760, ay: 260, bx: 1060, by: 260 }],
    targets: [
      { x: 520, y: 668 },
      { x: 910, y: 228 },
    ],
    inventory: { ramp: 2, bumper: 1, spring: 1 },
  },
  {
    id: 7,
    name: "Relay",
    hint: "Dominoes can push other balls. Pass the baton.",
    start: { x: 120, y: 80 },
    walls: [...box(), { ax: 560, ay: 420, bx: 860, by: 420 }, { ax: 860, ay: 420, bx: 860, by: 380 }],
    balls: [{ x: 830, y: 398 }],
    fixed: [600, 650, 700, 750].map((x) => ({ kind: "domino" as const, x, y: 412, angle: 0 })),
    targets: [
      { x: 700, y: 330 },
      { x: 1040, y: 160 },
    ],
    inventory: { ramp: 2, spring: 1, domino: 2 },
  },
  {
    id: 8,
    name: "Chain Gang",
    hint: "Bombs set off nearby bombs. Bridge the gaps to light the whole fuse.",
    start: { x: 140, y: 80 },
    walls: box(),
    fixed: [
      { kind: "bomb", x: 420, y: 674, angle: 0 },
      { kind: "bomb", x: 760, y: 674, angle: 0 },
      { kind: "bomb", x: 1090, y: 674, angle: 0 },
    ],
    targets: [
      { x: 430, y: 520 },
      { x: 770, y: 520 },
      { x: 1100, y: 520 },
    ],
    inventory: { ramp: 1, bomb: 2 },
  },
  {
    id: 9,
    name: "Grand Machine",
    hint: "Everything you have learned, all at once.",
    start: { x: 110, y: 70 },
    walls: [
      ...box(),
      { ax: 30, ay: 300, bx: 330, by: 360 },
      { ax: 520, ay: 470, bx: 820, by: 470 },
      { ax: 1170, ay: 300, bx: 980, by: 340 },
    ],
    fixed: [
      { kind: "domino", x: 560, y: 462, angle: 0 },
      { kind: "domino", x: 610, y: 462, angle: 0 },
      { kind: "bomb", x: 1080, y: 674, angle: 0 },
    ],
    targets: [
      { x: 430, y: 400 },
      { x: 760, y: 420 },
      { x: 1090, y: 260 },
      { x: 300, y: 668 },
    ],
    inventory: { ramp: 2, bumper: 1, domino: 2, bomb: 1, spring: 1 },
  },
];

export { deg };

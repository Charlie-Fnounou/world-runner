/**
 * Element definitions for Element Lab. Pure data — no DOM.
 */

export const EMPTY = 0;
export const SAND = 1;
export const WATER = 2;
export const STONE = 3;
export const WOOD = 4;
export const PLANT = 5;
export const FIRE = 6;
export const LAVA = 7;
export const STEAM = 8;
export const ICE = 9;
export const OIL = 10;
export const SMOKE = 11;
export const ACID = 12;
// Internal products (not in the palette).
export const OBSIDIAN = 13;
export const GLASS = 14;
export const EMBER = 15;
export const ASH = 16;
export const ELEMENT_COUNT = 17;

/** Palette-only tool id. */
export const ERASER = 255;

export const KIND_NONE = 0;
export const KIND_POWDER = 1;
export const KIND_LIQUID = 2;
export const KIND_GAS = 3;
export const KIND_STATIC = 4;

export const KIND = new Uint8Array(ELEMENT_COUNT);
export const DENSITY = new Uint8Array(ELEMENT_COUNT);

function def(id: number, kind: number, density: number) {
  KIND[id] = kind;
  DENSITY[id] = density;
}
def(EMPTY, KIND_NONE, 0);
def(SAND, KIND_POWDER, 100);
def(ASH, KIND_POWDER, 70);
def(WATER, KIND_LIQUID, 60);
def(OIL, KIND_LIQUID, 50);
def(ACID, KIND_LIQUID, 62);
def(LAVA, KIND_LIQUID, 90);
def(STEAM, KIND_GAS, 2);
def(SMOKE, KIND_GAS, 1);
def(FIRE, KIND_GAS, 1);
def(STONE, KIND_STATIC, 255);
def(WOOD, KIND_STATIC, 255);
def(PLANT, KIND_STATIC, 255);
def(ICE, KIND_STATIC, 255);
def(OBSIDIAN, KIND_STATIC, 255);
def(GLASS, KIND_STATIC, 255);
def(EMBER, KIND_STATIC, 255);

/** Base colours (hex RGB) used for rendering. */
export const BASE_COLOR: Record<number, number> = {
  [EMPTY]: 0x17130f,
  [SAND]: 0xe8c27a,
  [WATER]: 0x2f8fe8,
  [STONE]: 0x7f7972,
  [WOOD]: 0x8a5a2e,
  [PLANT]: 0x4cbb4a,
  [FIRE]: 0xff9b3d,
  [LAVA]: 0xff5a1f,
  [STEAM]: 0x9fb0ba,
  [ICE]: 0xbfe9ff,
  [OIL]: 0x5b4426,
  [SMOKE]: 0x4c4642,
  [ACID]: 0x9cff3d,
  [OBSIDIAN]: 0x2c2140,
  [GLASS]: 0x9fdcd8,
  [EMBER]: 0xd8481c,
  [ASH]: 0x9a948c,
};

export interface PaletteEntry {
  id: number;
  name: string;
  /** CSS colour for the swatch. */
  swatch: string;
  tip: string;
  /** Keyboard code that selects it. */
  key?: string;
  keyLabel?: string;
}

export const PALETTE: PaletteEntry[] = [
  { id: SAND, name: "Sand", swatch: "#e8c27a", tip: "Falls and piles up. Sinks in liquids.", key: "Digit1", keyLabel: "1" },
  { id: WATER, name: "Water", swatch: "#2f8fe8", tip: "Flows and fills. Puts out fire.", key: "Digit2", keyLabel: "2" },
  { id: STONE, name: "Stone", swatch: "#7f7972", tip: "Solid wall. Does not move.", key: "Digit3", keyLabel: "3" },
  { id: WOOD, name: "Wood", swatch: "#8a5a2e", tip: "Solid and flammable. Burns slowly.", key: "Digit4", keyLabel: "4" },
  { id: PLANT, name: "Plant", swatch: "#4cbb4a", tip: "Drinks water to grow. Very flammable.", key: "Digit5", keyLabel: "5" },
  { id: FIRE, name: "Fire", swatch: "#ff9b3d", tip: "Rises, flickers and spreads to anything that burns.", key: "Digit6", keyLabel: "6" },
  { id: LAVA, name: "Lava", swatch: "#ff5a1f", tip: "Slow, molten, hot. Ignites and melts.", key: "Digit7", keyLabel: "7" },
  { id: OIL, name: "Oil", swatch: "#7a5a30", tip: "Floats on water. Extremely flammable.", key: "Digit8", keyLabel: "8" },
  { id: ICE, name: "Ice", swatch: "#bfe9ff", tip: "Freezes water around it. Melts near heat.", key: "Digit9", keyLabel: "9" },
  { id: ACID, name: "Acid", swatch: "#9cff3d", tip: "Eats through solids, using itself up.", key: "Digit0", keyLabel: "0" },
  { id: STEAM, name: "Steam", swatch: "#b8c6ce", tip: "Rises, then cools back into something wet." },
  { id: SMOKE, name: "Smoke", swatch: "#6b625c", tip: "Drifts up and fades away." },
  { id: ERASER, name: "Eraser", swatch: "transparent", tip: "Removes anything. Right-click also erases.", key: "KeyE", keyLabel: "E" },
];

export const ELEMENT_NAMES: Record<number, string> = Object.fromEntries(PALETTE.map((p) => [p.id, p.name]));

/** Fraction of brush cells filled per frame while painting. */
export function paintDensity(id: number): number {
  switch (KIND[id]) {
    case KIND_STATIC:
      return 1;
    case KIND_GAS:
      return 0.25;
    default:
      return id === LAVA ? 0.45 : 0.4;
  }
}

export interface Reaction {
  name: string;
  recipe: string;
  hint: string;
}

/** Order matters: index = bit in the discovery mask. */
export const REACTIONS: Reaction[] = [
  { name: "Wildfire", recipe: "Fire + Plant", hint: "Something green meets something hungry." },
  { name: "Kindling", recipe: "Fire + Wood", hint: "Logs remember what heat feels like." },
  { name: "Oil fire", recipe: "Fire + Oil", hint: "A slick puddle and a single spark." },
  { name: "Douse", recipe: "Water + Fire", hint: "The oldest rivalry there is." },
  { name: "Obsidian", recipe: "Lava + Water", hint: "Molten meets wet, and both are changed." },
  { name: "Glassblowing", recipe: "Lava + Sand", hint: "Hold the beach against the heat." },
  { name: "Rain cycle", recipe: "Steam → Water", hint: "What goes up as vapour…" },
  { name: "Overgrowth", recipe: "Plant + Water", hint: "Give the green a drink." },
  { name: "Frostbite", recipe: "Ice + Water", hint: "Cold is contagious." },
  { name: "Thaw", recipe: "Ice + Fire", hint: "Warm the frozen." },
  { name: "Cold front", recipe: "Lava + Ice", hint: "The hottest thing meets the coldest." },
  { name: "Corrosion", recipe: "Acid + Solids", hint: "Some liquids have an appetite for rock." },
];

export const R_WILDFIRE = 0;
export const R_KINDLING = 1;
export const R_OILFIRE = 2;
export const R_DOUSE = 3;
export const R_OBSIDIAN = 4;
export const R_GLASS = 5;
export const R_RAIN = 6;
export const R_OVERGROWTH = 7;
export const R_FROSTBITE = 8;
export const R_THAW = 9;
export const R_COLDFRONT = 10;
export const R_CORROSION = 11;

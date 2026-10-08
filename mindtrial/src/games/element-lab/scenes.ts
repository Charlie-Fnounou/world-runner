/**
 * Starting scenes. Each one is laid out in fractions of the grid so it works
 * for any aspect ratio. Reacting elements are kept apart on purpose: the
 * player has to make the discoveries happen.
 */
import { ICE, LAVA, OIL, PLANT, SAND, STONE, WATER, WOOD } from "./elements";
import type { Sim } from "./sim";

export interface Scene {
  id: string;
  name: string;
  build: (sim: Sim) => void;
}

function tree(sim: Sim, cx: number, groundY: number, height: number, crown: number) {
  sim.fillRect(cx - 1, groundY - height, cx + 1, groundY - 1, WOOD);
  // Rounded leafy crown.
  const cy = groundY - height - crown * 0.4;
  for (let y = Math.floor(cy - crown); y <= cy + crown * 0.6; y++) {
    for (let x = Math.floor(cx - crown * 1.3); x <= cx + crown * 1.3; x++) {
      const dx = (x - cx) / (crown * 1.3);
      const dy = (y - cy) / crown;
      if (dx * dx + dy * dy <= 1 && sim.rand() < 0.88) sim.set(x, y, PLANT);
    }
  }
}

function volcano(sim: Sim) {
  const { w, h } = sim;
  sim.clear();
  const ground = h - 6;
  sim.fillRect(0, ground, w - 1, h - 1, STONE);
  // Cone.
  const cx = Math.round(w * 0.5);
  const base = Math.round(w * 0.26);
  const peakY = Math.round(h * 0.38);
  const crater = Math.max(4, Math.round(w * 0.04));
  for (let y = peakY; y < ground; y++) {
    const t = (y - peakY) / (ground - peakY);
    const half = crater + (base - crater) * t;
    for (let x = Math.round(cx - half); x <= cx + half; x++) {
      sim.set(x, y, STONE);
    }
  }
  // Magma chamber and vent.
  const vent = Math.max(2, Math.round(crater * 0.45));
  sim.fillRect(cx - vent, peakY + 3, cx + vent, ground - 4, LAVA);
  const chamberY = Math.round(ground - (ground - peakY) * 0.3);
  for (let y = chamberY; y < ground - 2; y++) {
    const half = Math.round(base * 0.35 * Math.sin(((y - chamberY) / (ground - 2 - chamberY)) * Math.PI));
    sim.fillRect(cx - half, y, cx + half, y, LAVA);
  }
  sim.fillRect(cx - crater + 2, peakY, cx + crater - 2, peakY + 3, LAVA);
  // Lake on the left, held by a stone bank.
  const lakeR = Math.round(w * 0.2);
  const bankH = Math.round(h * 0.1);
  sim.fillRect(lakeR, ground - bankH, lakeR + 2, ground - 1, STONE);
  sim.fillRect(0, ground - bankH + 2, lakeR - 1, ground - 1, WATER);
  // Forest on the right, on a strip of sand.
  sim.fillRect(Math.round(w * 0.76), ground - 2, w - 1, ground - 1, SAND);
  const trees = Math.max(2, Math.round(w / 70));
  for (let k = 0; k < trees; k++) {
    const tx = Math.round(w * (0.8 + (0.16 * k) / Math.max(1, trees - 1)));
    tree(sim, tx, ground - 2, Math.round(h * 0.08), Math.max(4, Math.round(h * 0.05)));
  }
}

function garden(sim: Sim) {
  const { w, h } = sim;
  sim.clear();
  sim.fillRect(0, h - 3, w - 1, h - 1, STONE);
  const soil = h - 3 - Math.round(h * 0.09);
  sim.fillRect(0, soil, w - 1, h - 4, SAND);
  // Stone-lined pond.
  const px0 = Math.round(w * 0.28);
  const px1 = Math.round(w * 0.5);
  const depth = Math.round(h * 0.075);
  sim.fillRect(px0, soil, px1, soil + depth, STONE);
  sim.fillRect(px0 + 2, soil - 1, px1 - 2, soil + depth - 2, WATER);
  sim.fillRect(px0, soil - 3, px0 + 1, soil - 1, STONE);
  sim.fillRect(px1 - 1, soil - 3, px1, soil - 1, STONE);
  // Flower stems on the left.
  for (let k = 0; k < 4; k++) {
    const sx = Math.round(w * (0.06 + k * 0.035));
    const sh = Math.round(h * (0.06 + ((k * 37) % 5) * 0.012));
    sim.fillRect(sx, soil - sh, sx, soil - 1, PLANT);
    sim.fillRect(sx - 1, soil - sh - 1, sx + 1, soil - sh + 1, PLANT);
  }
  // Big tree.
  tree(sim, Math.round(w * 0.66), soil, Math.round(h * 0.16), Math.max(5, Math.round(h * 0.08)));
  // Oil tank on stilts.
  const ox0 = Math.round(w * 0.82);
  const ox1 = Math.round(w * 0.94);
  const oy = soil - Math.round(h * 0.2);
  sim.fillRect(ox0, oy, ox1, oy + 1, STONE);
  sim.fillRect(ox0, oy - Math.round(h * 0.08), ox0 + 1, oy, STONE);
  sim.fillRect(ox1 - 1, oy - Math.round(h * 0.08), ox1, oy, STONE);
  sim.fillRect(ox0 + 2, oy - Math.round(h * 0.06), ox1 - 2, oy - 1, OIL);
  sim.fillRect(ox0 + 2, oy + 2, ox0 + 3, soil - 1, WOOD);
  sim.fillRect(ox1 - 3, oy + 2, ox1 - 2, soil - 1, WOOD);
  // Ice block cooling in the corner.
  sim.fillRect(Math.round(w * 0.215), soil - Math.round(h * 0.05), Math.round(w * 0.25), soil - 1, ICE);
}

function glacier(sim: Sim) {
  const { w, h } = sim;
  sim.clear();
  const land = Math.round(w * 0.46);
  const top = Math.round(h * 0.58);
  // Bedrock and sea floor.
  sim.fillRect(0, h - 4, w - 1, h - 1, STONE);
  sim.fillRect(0, top, land, h - 1, STONE);
  // Hidden magma pocket under the glacier.
  const mx0 = Math.round(land * 0.25);
  const mx1 = Math.round(land * 0.75);
  sim.fillRect(mx0, top + 6, mx1, top + 6 + Math.round(h * 0.12), LAVA);
  // Glacier mound.
  const peak = Math.round(h * 0.3);
  for (let x = 0; x <= land; x++) {
    const t = x / land;
    const y = top - Math.round((top - peak) * Math.sin(Math.min(1, t * 1.15) * Math.PI) * (1 - t * 0.35));
    sim.fillRect(x, Math.min(y, top - 1), x, top - 1, ICE);
  }
  // Ocean with a floating oil slick.
  sim.fillRect(land + 1, top + 2, w - 1, h - 5, WATER);
  sim.fillRect(Math.round(w * 0.7), top - 1, Math.round(w * 0.9), top + 1, OIL);
  // Pebble beach.
  sim.fillRect(land + 1, h - 8, Math.round(w * 0.62), h - 5, SAND);
}

export const SCENES: Scene[] = [
  { id: "volcano", name: "Volcano", build: volcano },
  { id: "garden", name: "Garden", build: garden },
  { id: "glacier", name: "Glacier", build: glacier },
];

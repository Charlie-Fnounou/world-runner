/**
 * Converts the simulation grid into RGBA pixels (one pixel per cell) plus a
 * quarter-resolution emissive "glow" buffer that gets upscaled with smoothing
 * for a cheap bloom. Pure functions over typed arrays.
 */
import { BASE_COLOR, ELEMENT_COUNT, EMBER, EMPTY, FIRE, LAVA, SMOKE, STEAM, WATER, ACID } from "./elements";
import type { Sim } from "./sim";

const SHADES = 16;
const BG = 0x14110f;

/** Pack r,g,b into a little-endian ABGR uint32 (ImageData byte order RGBA). */
function pack(r: number, g: number, b: number, a = 255): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
function rgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}
function mix(a: number, b: number, t: number): [number, number, number] {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return [ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t];
}
function clamp255(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/** Static element colours: [element * SHADES + shade]. */
const LUT = new Uint32Array(ELEMENT_COUNT * SHADES);
for (let e = 0; e < ELEMENT_COUNT; e++) {
  const [r, g, b] = rgb(BASE_COLOR[e] ?? 0xff00ff);
  for (let s = 0; s < SHADES; s++) {
    const amt = e === EMPTY ? 0.035 : 0.12;
    const f = 1 + (s / (SHADES - 1) - 0.5) * 2 * amt;
    LUT[e * SHADES + s] = pack(clamp255(r * f), clamp255(g * f), clamp255(b * f));
  }
}

/** Fire colour by remaining life (0..63). */
const FIRE_LUT = new Uint32Array(64);
const FIRE_GLOW: [number, number, number][] = [];
for (let i = 0; i < 64; i++) {
  const t = i / 63;
  let c: [number, number, number];
  if (t > 0.6) c = mix(0xffb347, 0xfff3b0, (t - 0.6) / 0.4);
  else if (t > 0.25) c = mix(0xe8441c, 0xffb347, (t - 0.25) / 0.35);
  else c = mix(0x5a1d10, 0xe8441c, t / 0.25);
  FIRE_LUT[i] = pack(clamp255(c[0]), clamp255(c[1]), clamp255(c[2]));
  FIRE_GLOW.push([c[0] * 0.9, c[1] * 0.55, c[2] * 0.25]);
}

/** Smoke / steam fade by life (0..63), mixed toward background. */
const SMOKE_LUT = new Uint32Array(64);
const STEAM_LUT = new Uint32Array(64);
for (let i = 0; i < 64; i++) {
  const t = Math.min(1, i / 40);
  const s = mix(BG, BASE_COLOR[SMOKE], 0.25 + t * 0.75);
  SMOKE_LUT[i] = pack(clamp255(s[0]), clamp255(s[1]), clamp255(s[2]));
  const st = mix(BG, BASE_COLOR[STEAM], 0.35 + t * 0.65);
  STEAM_LUT[i] = pack(clamp255(st[0]), clamp255(st[1]), clamp255(st[2]));
}

/** Lava shimmer palette. */
const LAVA_LUT = new Uint32Array(32);
for (let i = 0; i < 32; i++) {
  const t = 0.5 + 0.5 * Math.sin((i / 32) * Math.PI * 2);
  const c = mix(0xd8380f, 0xffb02e, t * 0.85);
  LAVA_LUT[i] = pack(clamp255(c[0]), clamp255(c[1]), clamp255(c[2]));
}
const EMBER_LUT = new Uint32Array(32);
for (let i = 0; i < 32; i++) {
  const t = 0.5 + 0.5 * Math.sin((i / 32) * Math.PI * 2);
  const c = mix(0x7a2410, 0xff7a2a, t);
  EMBER_LUT[i] = pack(clamp255(c[0]), clamp255(c[1]), clamp255(c[2]));
}

/** Glow buffers sized ceil(w/G) × ceil(h/G). */
export const GLOW_SCALE = 4;

export interface RenderBuffers {
  pixels: Uint32Array;
  glow: Uint32Array;
  glowAcc: Float32Array;
  gw: number;
  gh: number;
}

export function makeBuffers(w: number, h: number, pixels: Uint32Array, glow: Uint32Array): RenderBuffers {
  const gw = Math.ceil(w / GLOW_SCALE);
  const gh = Math.ceil(h / GLOW_SCALE);
  return { pixels, glow, glowAcc: new Float32Array(gw * gh * 3), gw, gh };
}

export function renderSim(sim: Sim, buf: RenderBuffers, frame: number) {
  const { w, h, type, life, shade } = sim;
  const { pixels, glow, glowAcc, gw, gh } = buf;
  glowAcc.fill(0);
  const n = w * h;
  const ph = frame >> 1;
  for (let i = 0; i < n; i++) {
    const t = type[i];
    const s = shade[i];
    switch (t) {
      case FIRE: {
        const l = life[i] > 63 ? 63 : life[i];
        pixels[i] = FIRE_LUT[l];
        const g = FIRE_GLOW[l];
        addGlow(glowAcc, i, w, gw, g[0], g[1], g[2]);
        break;
      }
      case LAVA: {
        const x = i % w;
        const y = (i / w) | 0;
        pixels[i] = LAVA_LUT[(s + ph + x + (y >> 1)) & 31];
        addGlow(glowAcc, i, w, gw, 200, 70, 15);
        break;
      }
      case EMBER: {
        pixels[i] = EMBER_LUT[(s + ph * 2) & 31];
        addGlow(glowAcc, i, w, gw, 140, 45, 10);
        break;
      }
      case SMOKE:
        pixels[i] = SMOKE_LUT[life[i] > 63 ? 63 : life[i]];
        break;
      case STEAM:
        pixels[i] = STEAM_LUT[life[i] > 63 ? 63 : life[i]];
        break;
      case WATER: {
        // Gentle shimmer.
        const sh = (s + ph) & 31;
        pixels[i] = LUT[WATER * SHADES + (sh < 16 ? sh : 31 - sh)];
        break;
      }
      case ACID:
        pixels[i] = LUT[ACID * SHADES + (s & 15)];
        addGlow(glowAcc, i, w, gw, 18, 40, 4);
        break;
      default:
        pixels[i] = LUT[t * SHADES + (s & 15)];
    }
  }
  // Resolve glow accumulators to RGBA.
  const gn = gw * gh;
  const norm = 1 / (GLOW_SCALE * GLOW_SCALE);
  for (let j = 0; j < gn; j++) {
    const r = glowAcc[j * 3] * norm * 1.6;
    const g = glowAcc[j * 3 + 1] * norm * 1.6;
    const b = glowAcc[j * 3 + 2] * norm * 1.6;
    if (r + g + b < 2) {
      glow[j] = 0;
      continue;
    }
    glow[j] = pack(clamp255(r), clamp255(g), clamp255(b), 255);
  }
}

function addGlow(acc: Float32Array, i: number, w: number, gw: number, r: number, g: number, b: number) {
  const x = i % w;
  const y = (i / w) | 0;
  const j = (((y / GLOW_SCALE) | 0) * gw + ((x / GLOW_SCALE) | 0)) * 3;
  acc[j] += r;
  acc[j + 1] += g;
  acc[j + 2] += b;
}

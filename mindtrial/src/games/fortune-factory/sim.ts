/**
 * Fortune Factory — pure, deterministic economy simulation.
 * All randomness for year N comes from rng(seed, N), so the same seed always
 * produces the same market (only your portfolio choices change the outcome).
 */
import { rng } from "@/lib/random";

export const START_CASH = 100_000_000_000;
export const YEARS = 20;
/** Below this net worth the run ends early. */
export const BANKRUPT_AT = 1_000_000_000;

export type VentureId = "bonds" | "bubble" | "bakery" | "haunted" | "cloud" | "cats" | "moon" | "fusion";
export type Asset = VentureId | "cash";

export interface Upgrade {
  name: string;
  desc: string;
  cost: number;
}

export interface Venture {
  id: VentureId;
  name: string;
  tagline: string;
  color: string;
  /** Typical yearly return (shown to the player as a rough guide). */
  mean: number;
  vol: number;
  /** Sensitivity to the overall market mood. Negative = counter-cyclical. */
  beta: number;
  /** 1..5 risk dots. */
  risk: number;
  upgrades: Upgrade[];
}

const B = 1_000_000_000;

export const VENTURES: Venture[] = [
  {
    id: "bonds",
    name: "Atlantis Bonds",
    tagline: "Backed by the full faith of a sunken kingdom.",
    color: "#7fd1ff",
    mean: 0.025,
    vol: 0.006,
    beta: 0,
    risk: 1,
    upgrades: [],
  },
  {
    id: "bubble",
    name: "Bubble-Wrap Mines",
    tagline: "Deep-earth veins of premium pop.",
    color: "#c8f55a",
    mean: 0.05,
    vol: 0.04,
    beta: 0.15,
    risk: 1,
    upgrades: [],
  },
  {
    id: "bakery",
    name: "Robot Bakeries",
    tagline: "Croissants folded by 6-axis arms.",
    color: "#ffcf4a",
    mean: 0.06,
    vol: 0.08,
    beta: 0.5,
    risk: 2,
    upgrades: [
      { name: "Croissant AI", desc: "+1.5% yearly return", cost: 6 * B },
      { name: "Self-kneading dough", desc: "+1.5% return, steadier", cost: 15 * B },
    ],
  },
  {
    id: "haunted",
    name: "Haunted Hotels",
    tagline: "Thrives when everyone else is scared.",
    color: "#b69cff",
    mean: 0.065,
    vol: 0.11,
    beta: -0.8,
    risk: 2,
    upgrades: [],
  },
  {
    id: "cloud",
    name: "Cloud Real Estate",
    tagline: "Fluffy plots, great views, no floors.",
    color: "#e9f2ff",
    mean: 0.1,
    vol: 0.2,
    beta: 1,
    risk: 3,
    upgrades: [{ name: "Weather machine", desc: "+3% return, less volatile", cost: 10 * B }],
  },
  {
    id: "cats",
    name: "Cat Influencer Agency",
    tagline: "Rides the hype. Hype bites back.",
    color: "#ff8fb1",
    mean: 0.06,
    vol: 0.12,
    beta: 0.6,
    risk: 4,
    upgrades: [{ name: "Cat whisperer", desc: "Softens hype crashes", cost: 6 * B }],
  },
  {
    id: "moon",
    name: "Moon Time-Shares",
    tagline: "Two weeks a year. Bring your own air.",
    color: "#ff9a4a",
    mean: 0.13,
    vol: 0.38,
    beta: 1.4,
    risk: 5,
    upgrades: [{ name: "Moon elevator", desc: "+4% return, less volatile", cost: 15 * B }],
  },
  {
    id: "fusion",
    name: "Fusion Lemonade",
    tagline: "Burns cash for years. Then: sunshine in a cup.",
    color: "#5ef2a0",
    mean: -0.04,
    vol: 0.04,
    beta: 0.2,
    risk: 4,
    upgrades: [
      { name: "Lab tier I", desc: "Better breakthrough odds", cost: 5 * B },
      { name: "Lab tier II", desc: "Even better odds", cost: 10 * B },
      { name: "Lab tier III", desc: "Best odds, bigger payoff", cost: 20 * B },
    ],
  },
];

export const VENTURE_BY_ID = Object.fromEntries(VENTURES.map((v) => [v.id, v])) as Record<VentureId, Venture>;
export const IDS = VENTURES.map((v) => v.id);

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export interface MarketEvent {
  id: string;
  headline: string;
  deck: string;
  /** Additive return modifiers for this year (0.4 = +40 points). */
  effects: Partial<Record<Asset, number>>;
  weight: number;
  /** Only eligible when this returns true. */
  when?: (s: State) => boolean;
  /** Optional state change (hype, research). */
  apply?: (s: State) => void;
}

export const EVENTS: MarketEvent[] = [
  {
    id: "cats-over",
    headline: "Cats Are Over, Declares Teen",
    deck: "A single shrug on a livestream wipes out the feline attention economy.",
    effects: { cats: -0.6 },
    weight: 1,
    apply: (s) => {
      s.catHype = Math.min(s.catHype, -0.6);
    },
  },
  {
    id: "cat-galactic",
    headline: "Cat Video Reaches Orbit, Views Exceed Population",
    deck: "A loaf-shaped tabby is now the most watched object in the solar system.",
    effects: { cats: 1.1 },
    weight: 1,
    apply: (s) => {
      s.catHype = Math.max(s.catHype, 0.7);
    },
  },
  {
    id: "moon-boom",
    headline: "Moon Tourism Booms",
    deck: "Honeymooners discover that low gravity makes everyone a good dancer.",
    effects: { moon: 0.8 },
    weight: 1,
  },
  {
    id: "solar-flare",
    headline: "Solar Flare Fries Lunar Wi-Fi",
    deck: "Time-share owners stranded without streaming. Clouds also look singed.",
    effects: { moon: -0.45, cloud: -0.15 },
    weight: 1,
  },
  {
    id: "wrap-shortage",
    headline: "Global Bubble-Wrap Shortage",
    deck: "Panic buyers pop prices to record highs. Miners work triple shifts.",
    effects: { bubble: 0.4 },
    weight: 1,
  },
  {
    id: "stress-balls",
    headline: "World Discovers Stress Balls",
    deck: "Bubble-wrap demand deflates as calmer citizens squeeze foam instead.",
    effects: { bubble: -0.25 },
    weight: 0.9,
  },
  {
    id: "rainy-decade",
    headline: "Forecasters Predict Rainy Decade",
    deck: "Cloud plots now come with built-in water features. Prices soar.",
    effects: { cloud: 0.5 },
    weight: 1,
  },
  {
    id: "clear-skies",
    headline: "Clear Skies Forever, Say Scientists",
    deck: "Cloud real estate market evaporates. Literally.",
    effects: { cloud: -0.4 },
    weight: 1,
  },
  {
    id: "robot-union",
    headline: "Bakery Robots Unionize, Demand Croissants",
    deck: "Production halts while machines negotiate a butter-based pension.",
    effects: { bakery: -0.2 },
    weight: 1,
  },
  {
    id: "sourdough",
    headline: "Sourdough Craze 2.0 Sweeps Nation",
    deck: "Starter cultures named after grandparents. Robot bakeries cannot keep up.",
    effects: { bakery: 0.35 },
    weight: 1,
  },
  {
    id: "inflation",
    headline: "Inflation Hits Imaginary Money Too",
    deck: "A sandwich now costs three sandwiches. Idle cash quietly shrinks.",
    effects: { cash: -0.08, bonds: -0.03 },
    weight: 1.1,
  },
  {
    id: "atlantis-found",
    headline: "Atlantis Found Behind Sofa",
    deck: "The lost kingdom was under the cushions all along. Bond holders rejoice.",
    effects: { bonds: 0.15 },
    weight: 0.6,
  },
  {
    id: "ghosts",
    headline: "Ghost Sightings Up 400%",
    deck: "Paranormal tourism is the hottest ticket in town. Haunted rooms sold out.",
    effects: { haunted: 0.6 },
    weight: 1,
  },
  {
    id: "exorcist",
    headline: "Exorcist Discount Week",
    deck: "Half-price spirit removal leaves haunted hotels eerily un-haunted.",
    effects: { haunted: -0.35 },
    weight: 1,
  },
  {
    id: "lemon-blight",
    headline: "Lemon Blight Sours Fusion Plans",
    deck: "Labs scramble for citrus as prices quadruple.",
    effects: { fusion: -0.3 },
    weight: 0.8,
    when: (s) => !s.fusionOnline,
  },
  {
    id: "lab-explodes",
    headline: "Fusion Lemonade Lab Explodes (Deliciously)",
    deck: "No injuries, but the town smells of lemon tart for a month. Valuable data recovered.",
    effects: { fusion: -0.45 },
    weight: 0.7,
    when: (s) => !s.fusionOnline,
    apply: (s) => {
      s.fusionBonusOdds += 0.12;
    },
  },
  {
    id: "euphoria",
    headline: "Markets Gripped by Euphoria",
    deck: "Everyone is a genius. Risky ventures float on pure vibes.",
    effects: { cloud: 0.15, moon: 0.2, cats: 0.15, bakery: 0.08, haunted: -0.1 },
    weight: 1,
  },
  {
    id: "wobble",
    headline: "The Great Wobble",
    deck: "A sudden market tremor. Safe havens and spooky hotels gain as panic spreads.",
    effects: { cloud: -0.25, moon: -0.3, cats: -0.2, bakery: -0.12, bubble: -0.05, bonds: 0.05, haunted: 0.25 },
    weight: 1,
  },
  {
    id: "wealth-tax",
    headline: "Wealth Tax on Imaginary Fortunes",
    deck: "The Ministry of Make-Believe takes a modest slice of everything.",
    effects: { cash: -0.03, bonds: -0.03, bubble: -0.03, bakery: -0.03, haunted: -0.03, cloud: -0.03, cats: -0.03, moon: -0.03, fusion: -0.03 },
    weight: 0.7,
  },
  {
    id: "rates-up",
    headline: "Interest Rates Rise",
    deck: "Cash finally earns something. Bonds and clouds feel the squeeze.",
    effects: { cash: 0.04, bonds: -0.05, cloud: -0.1 },
    weight: 1,
  },
  {
    id: "meteor-fireworks",
    headline: "Meteor Shower Rebranded as Fireworks",
    deck: "Best seats in the house are on the Moon. Time-share bookings rocket.",
    effects: { moon: 0.3 },
    weight: 0.8,
  },
  {
    id: "pigeon-wifi",
    headline: "Pigeons Begin Selling Cloud Storage",
    deck: "Unregulated bird-based competition rattles cloud landlords.",
    effects: { cloud: -0.2, cats: 0.1 },
    weight: 0.7,
  },
];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface YearReport {
  year: number;
  events: { id: string; headline: string; deck: string; effects: Partial<Record<Asset, number>> }[];
  /** Realised return for each asset this year. */
  returns: Record<Asset, number>;
  before: number;
  after: number;
  /** Notable one-liners (breakthroughs, etc). */
  notes: string[];
}

export interface State {
  seed: number;
  /** Completed years (0..YEARS). */
  year: number;
  cash: number;
  holdings: Record<VentureId, number>;
  tiers: Record<VentureId, number>;
  catHype: number;
  fusionOnline: boolean;
  fusionAge: number;
  fusionBonusOdds: number;
  researchSpent: number;
  /** Cumulative coin profit per asset. */
  gains: Record<Asset, number>;
  /** Net worth at the start and after each completed year. */
  worth: number[];
  /** Realised return per venture per year (for sparklines). */
  returnHistory: Record<Asset, number[]>;
  reports: YearReport[];
  eventsSeen: number;
}

const zeroRecord = <K extends string>(keys: readonly K[], v = 0) => Object.fromEntries(keys.map((k) => [k, v])) as Record<K, number>;

export function newGame(seed: number): State {
  return {
    seed,
    year: 0,
    cash: START_CASH,
    holdings: zeroRecord(IDS),
    tiers: zeroRecord(IDS),
    catHype: 0.15,
    fusionOnline: false,
    fusionAge: 0,
    fusionBonusOdds: 0,
    researchSpent: 0,
    gains: zeroRecord<Asset>([...IDS, "cash"]),
    worth: [START_CASH],
    returnHistory: Object.fromEntries([...IDS, "cash"].map((k) => [k, [] as number[]])) as unknown as Record<Asset, number[]>,
    reports: [],
    eventsSeen: 0,
  };
}

export function netWorth(s: State): number {
  return s.cash + IDS.reduce((a, id) => a + s.holdings[id], 0);
}

/** Move coins from cash into a venture (clamped to available cash). */
export function buy(s: State, id: VentureId, amount: number): State {
  const amt = Math.max(0, Math.min(amount, s.cash));
  if (amt <= 0) return s;
  return { ...s, cash: s.cash - amt, holdings: { ...s.holdings, [id]: s.holdings[id] + amt } };
}

/** Move coins from a venture back to cash (clamped to holding). */
export function sell(s: State, id: VentureId, amount: number): State {
  const amt = Math.max(0, Math.min(amount, s.holdings[id]));
  if (amt <= 0) return s;
  const left = s.holdings[id] - amt;
  // snap dust to zero so "sold out" really means zero
  const clean = left < 1 ? 0 : left;
  return { ...s, cash: s.cash + (s.holdings[id] - clean), holdings: { ...s.holdings, [id]: clean } };
}

export function nextUpgrade(s: State, id: VentureId): Upgrade | null {
  const v = VENTURE_BY_ID[id];
  if (id === "fusion" && s.fusionOnline && s.tiers.fusion >= v.upgrades.length) return null;
  return v.upgrades[s.tiers[id]] ?? null;
}

/** Buy the next research tier for a venture with cash (sunk cost). */
export function research(s: State, id: VentureId): State {
  const up = nextUpgrade(s, id);
  if (!up || s.cash < up.cost) return s;
  return { ...s, cash: s.cash - up.cost, researchSpent: s.researchSpent + up.cost, tiers: { ...s.tiers, [id]: s.tiers[id] + 1 } };
}

/** Rough "expected" return shown on cards (reflects upgrades and fusion state). */
export function expectedReturn(s: State, id: VentureId): number {
  const v = VENTURE_BY_ID[id];
  const t = s.tiers[id];
  switch (id) {
    case "bakery":
      return v.mean + 0.015 * t;
    case "cloud":
      return v.mean + 0.03 * t;
    case "moon":
      return v.mean + 0.04 * t;
    case "cats":
      return 0.05 + 0.4 * s.catHype;
    case "fusion":
      return s.fusionOnline ? fusionMean(s) : v.mean;
    default:
      return v.mean;
  }
}

export function fusionOdds(s: State): number {
  return Math.min(0.8, 0.05 + 0.13 * s.tiers.fusion + s.fusionBonusOdds);
}

function fusionMean(s: State): number {
  return Math.max(0.08, 0.24 + 0.03 * s.tiers.fusion - 0.025 * s.fusionAge);
}

function gauss(r: ReturnType<typeof rng>): number {
  const u = Math.max(1e-9, r.next());
  const v = r.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function yearRng(seed: number, year: number) {
  return rng((seed ^ Math.imul(year + 1, 0x9e3779b1)) >>> 0);
}

/** Pick this year's headline events (1, sometimes 2). Deterministic per seed+year. */
function pickEvents(s: State, r: ReturnType<typeof rng>): MarketEvent[] {
  const recent = new Set(s.reports.slice(-3).flatMap((rep) => rep.events.map((e) => e.id)));
  const pool = EVENTS.filter((e) => (!e.when || e.when(s)) && !recent.has(e.id));
  const out: MarketEvent[] = [];
  const count = r.next() < 0.3 ? 2 : 1;
  for (let k = 0; k < count && pool.length; k++) {
    const total = pool.reduce((a, e) => a + e.weight, 0);
    let x = r.next() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      x -= pool[idx].weight;
      if (x <= 0) break;
    }
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

/** Advance one year. Returns the new state (with the report appended). */
export function simulateYear(prev: State): State {
  const s: State = {
    ...prev,
    holdings: { ...prev.holdings },
    tiers: { ...prev.tiers },
    gains: { ...prev.gains },
    returnHistory: Object.fromEntries(Object.entries(prev.returnHistory).map(([k, v]) => [k, [...v]])) as Record<Asset, number[]>,
    reports: [...prev.reports],
    worth: [...prev.worth],
  };
  const r = yearRng(s.seed, s.year);
  const before = netWorth(s);
  const market = gauss(r);
  const events = pickEvents(s, r);
  for (const e of events) e.apply?.(s);
  const notes: string[] = [];

  // cat hype random walk with a pull toward reversal at the extremes
  const whisper = s.tiers.cats > 0;
  const hypeShock = gauss(r) * 0.45;
  const reversal = s.catHype > 0.55 && r.next() < 0.45 ? -1.2 : s.catHype < -0.55 && r.next() < 0.4 ? 1 : 0;
  s.catHype = Math.max(-1, Math.min(1, s.catHype * 0.55 + hypeShock + reversal + market * 0.1));
  if (whisper && s.catHype < -0.3) s.catHype = -0.3 + (s.catHype + 0.3) * 0.5;

  // fusion breakthrough roll
  let breakthroughNow = false;
  if (!s.fusionOnline) {
    const roll = r.next();
    if (s.year >= 2 && roll < fusionOdds(s)) {
      s.fusionOnline = true;
      breakthroughNow = true;
      notes.push("BREAKTHROUGH: Fusion Lemonade plant goes online. Sunshine in a cup is real.");
    }
  } else {
    s.fusionAge += 1;
  }

  const returns = {} as Record<Asset, number>;
  for (const v of VENTURES) {
    const eps = gauss(r);
    const t = s.tiers[v.id];
    let mean = v.mean;
    let vol = v.vol;
    switch (v.id) {
      case "bakery":
        mean += 0.015 * t;
        vol *= t >= 2 ? 0.75 : 1;
        break;
      case "cloud":
        mean += 0.03 * t;
        vol *= t ? 0.8 : 1;
        break;
      case "moon":
        mean += 0.04 * t;
        vol *= t ? 0.8 : 1;
        break;
      case "cats":
        mean = 0.05 + 0.4 * s.catHype;
        vol = whisper ? 0.09 : v.vol;
        break;
      case "fusion":
        if (breakthroughNow) {
          mean = 0.8 + 0.2 * t;
          vol = 0.3;
        } else if (s.fusionOnline) {
          mean = fusionMean(s);
          vol = 0.22;
        }
        break;
    }
    let ret = mean + v.beta * market * 0.1 + vol * eps;
    for (const e of events) ret += e.effects[v.id] ?? 0;
    if (v.id === "cats" && whisper) ret = ret < 0 ? ret * 0.7 : ret;
    ret = Math.max(-0.9, ret);
    returns[v.id] = ret;
  }
  returns.cash = events.reduce((a, e) => a + (e.effects.cash ?? 0), 0);

  // apply
  for (const id of IDS) {
    const g = s.holdings[id] * returns[id];
    s.holdings[id] = Math.max(0, s.holdings[id] + g);
    s.gains[id] += g;
    s.returnHistory[id].push(returns[id]);
  }
  const cashGain = s.cash * returns.cash;
  s.cash = Math.max(0, s.cash + cashGain);
  s.gains.cash += cashGain;
  s.returnHistory.cash.push(returns.cash);

  s.year += 1;
  s.eventsSeen += events.length;
  const after = netWorth(s);
  s.worth.push(after);
  s.reports.push({
    year: s.year,
    events: events.map((e) => ({ id: e.id, headline: e.headline, deck: e.deck, effects: e.effects })),
    returns,
    before,
    after,
    notes,
  });
  return s;
}

export function isBankrupt(s: State): boolean {
  return netWorth(s) < BANKRUPT_AT;
}

export function isOver(s: State): boolean {
  return s.year >= YEARS || isBankrupt(s);
}

export interface Summary {
  final: number;
  returnPct: number;
  bestYear: { year: number; pct: number } | null;
  bestVenture: { id: Asset; gain: number } | null;
  events: number;
  cagr: number;
}

export function summarize(s: State): Summary {
  const final = netWorth(s);
  let bestYear: Summary["bestYear"] = null;
  for (const rep of s.reports) {
    const pct = rep.before > 0 ? rep.after / rep.before - 1 : 0;
    if (!bestYear || pct > bestYear.pct) bestYear = { year: rep.year, pct };
  }
  let bestVenture: Summary["bestVenture"] = null;
  for (const id of IDS) {
    if (s.gains[id] > 0 && (!bestVenture || s.gains[id] > bestVenture.gain)) bestVenture = { id, gain: s.gains[id] };
  }
  const years = Math.max(1, s.year);
  return {
    final,
    returnPct: final / START_CASH - 1,
    bestYear,
    bestVenture,
    events: s.eventsSeen,
    cagr: final > 0 ? (final / START_CASH) ** (1 / years) - 1 : -1,
  };
}

/* ------------------------------------------------------------------ */
/* Absurd purchases                                                    */
/* ------------------------------------------------------------------ */

export const PURCHASES: { name: string; price: number }[] = [
  { name: "golden rubber ducks", price: 25_000 },
  { name: "Olympic pools of hot chocolate", price: 6_000_000 },
  { name: "slightly haunted private islands", price: 40_000_000 },
  { name: "pet blimps (with captain)", price: 90_000_000 },
  { name: "skyscrapers made of cheese", price: 3 * B },
  { name: "lifetime pizza plans for a whole city", price: 2 * B },
  { name: "brand-new volcanoes (dormant, mostly)", price: 45 * B },
  { name: "custom moons (pre-owned)", price: 800 * B },
  { name: "lighthouses that play jazz", price: 12_000_000 },
  { name: "tuxedos for every penguin in Antarctica", price: 9 * B },
];

export const PEOPLE_ON_EARTH = 8_100_000_000;

/** A few fun equivalents for a net worth (picked deterministically by magnitude). */
export function purchasesFor(worth: number, year: number): { count: number; name: string }[] {
  const fits = PURCHASES.map((p) => ({ name: p.name, count: worth / p.price })).filter((p) => p.count >= 1 && p.count < 5e7);
  if (!fits.length) return [];
  const out: { count: number; name: string }[] = [];
  for (let i = 0; i < Math.min(2, fits.length); i++) out.push(fits[(year * 3 + i * 5) % fits.length]);
  if (out.length === 2 && out[0].name === out[1].name) out.pop();
  return out;
}

/**
 * Shared contracts between the game shell and individual games.
 * Every game lives in `src/games/<slug>/` and default-exports a
 * React component that accepts `GameProps`.
 */

export type GameMode = "solo" | "party";

export interface PlayerControls {
  /** KeyboardEvent.code values. Index 0 is the primary binding. */
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  action: string[];
  /** Human readable labels for the help panel, e.g. "W A S D" / "Q". */
  moveLabel: string;
  actionLabel: string;
}

export interface PlayerConfig {
  /** 0..3, stable slot index. Also the index used in `placements`. */
  index: number;
  name: string;
  /** Main color (hex). */
  color: string;
  /** Darker shade for outlines / shadows (hex). */
  shade: string;
  controls: PlayerControls;
  /** Controlled by the computer instead of a human. */
  cpu: boolean;
}

export interface GameStat {
  label: string;
  value: string;
}

export interface GameResult {
  /** Short line shown big on the end screen ("Blue wins!", "11 ms off"). */
  headline: string;
  /** Optional supporting sentence. */
  subline?: string;
  /** Primary numeric score used for personal records (solo only). */
  score?: number;
  /** Formatted score ("12 ms", "Level 7"). Shown on the end screen. */
  scoreLabel?: string;
  stats?: GameStat[];
  /**
   * Multiplayer games: rank per player index (0 = first place).
   * Ties share the same rank. Length must equal players.length.
   */
  placements?: number[];
}

export interface GameProps {
  mode: GameMode;
  /** Solo games receive a single human player. */
  players: PlayerConfig[];
  /** When true the game must freeze its simulation, timers and input. */
  paused: boolean;
  /** Respect prefers-reduced-motion: tone down shakes, flashes, particles. */
  reducedMotion: boolean;
  /** Call exactly once when a run ends. */
  onFinish: (result: GameResult) => void;
}

export type Category = "experiment" | "brain" | "arcade";

export interface ControlHint {
  keys: string;
  action: string;
}

export interface GameMeta {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: Category;
  /** Number of human players supported. min 1 for solo-capable games. */
  players: { min: number; max: number };
  /** Multiplayer games can fill empty seats with CPU opponents. */
  cpuOpponents: boolean;
  /** Total seats when a single human plays a CPU-capable game. */
  cpuFill?: number;
  /** Included in Party Mode rotation. */
  party: boolean;
  /** Visual identity. */
  theme: { bg: string; ink: string; accent: string; accent2: string };
  instructions: string[];
  controls: ControlHint[];
  /** Personal record definition; omit for open-ended toys. */
  record?: { better: "higher" | "lower"; label: string; unit?: string };
  /** Rough session length, e.g. "2 min". */
  duration: string;
  tags: string[];
  featured?: boolean;
  /** Plays well on touch screens. */
  touch: boolean;
}

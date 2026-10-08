import type { PlayerConfig, PlayerControls } from "./types";

/**
 * Four keyboard clusters chosen to stay far apart on a physical keyboard
 * and to avoid modifier keys (Shift/Ctrl/Alt) which trigger OS shortcuts
 * and ghosting. Codes are physical positions (KeyboardEvent.code), so
 * the layout works on AZERTY/QWERTZ too.
 */
export const PLAYER_CONTROLS: PlayerControls[] = [
  {
    up: ["KeyW"],
    down: ["KeyS"],
    left: ["KeyA"],
    right: ["KeyD"],
    action: ["KeyQ"],
    moveLabel: "W A S D",
    actionLabel: "Q",
  },
  {
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    action: ["Enter", "NumpadEnter"],
    moveLabel: "← ↑ → ↓",
    actionLabel: "Enter",
  },
  {
    up: ["KeyI"],
    down: ["KeyK"],
    left: ["KeyJ"],
    right: ["KeyL"],
    action: ["KeyU"],
    moveLabel: "I J K L",
    actionLabel: "U",
  },
  {
    up: ["Numpad8", "KeyT"],
    down: ["Numpad5", "KeyG"],
    left: ["Numpad4", "KeyF"],
    right: ["Numpad6", "KeyH"],
    action: ["Numpad0", "KeyR"],
    moveLabel: "T F G H  (or Num 8 4 5 6)",
    actionLabel: "R  (or Num 0)",
  },
];

export const PLAYER_COLORS = [
  { name: "Coral", color: "#ff5a3c", shade: "#b52c14" },
  { name: "Azure", color: "#2f7bff", shade: "#1446a8" },
  { name: "Lime", color: "#3fcf5a", shade: "#1f8a33" },
  { name: "Amber", color: "#ffbf1f", shade: "#b07f00" },
] as const;

export function makePlayer(index: number, opts: { name?: string; cpu?: boolean } = {}): PlayerConfig {
  const c = PLAYER_COLORS[index];
  return {
    index,
    name: opts.name ?? (opts.cpu ? `CPU ${c.name}` : c.name),
    color: c.color,
    shade: c.shade,
    controls: PLAYER_CONTROLS[index],
    cpu: opts.cpu ?? false,
  };
}

/** Build a roster: `humans` human players, padded with CPUs up to `total`. */
export function makeRoster(humans: number, total = humans): PlayerConfig[] {
  return Array.from({ length: Math.max(humans, total) }, (_, i) => makePlayer(i, { cpu: i >= humans }));
}

/** Every key code used by any player (so the shell can block page scrolling). */
export const ALL_PLAYER_CODES = new Set(
  PLAYER_CONTROLS.flatMap((c) => [...c.up, ...c.down, ...c.left, ...c.right, ...c.action]),
);

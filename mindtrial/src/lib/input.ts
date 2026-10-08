"use client";

import { useEffect, useRef } from "react";
import type { PlayerConfig } from "./types";

export interface KeyState {
  /** Codes currently held. */
  down: Set<string>;
  /** Codes pressed since the last `consume()` call (edge-triggered). */
  pressed: Set<string>;
  /** Clears `pressed`. Call once per frame after reading it. */
  consume: () => void;
}

const BLOCK_DEFAULT = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "Enter",
  "NumpadEnter",
]);

/**
 * Global keyboard tracker for games. Ignores key repeat for `pressed`,
 * clears held keys when the window loses focus (avoids stuck keys), and
 * stops arrows/space from scrolling the page while the game is mounted.
 * Typing into inputs is left alone.
 */
export function useKeys(enabled = true): React.RefObject<KeyState> {
  const ref = useRef<KeyState>({
    down: new Set(),
    pressed: new Set(),
    consume() {
      this.pressed.clear();
    },
  });

  useEffect(() => {
    if (!enabled) return;
    const state = ref.current;
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };
    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
      if (!e.repeat) state.pressed.add(e.code);
      state.down.add(e.code);
    };
    const onUp = (e: KeyboardEvent) => {
      state.down.delete(e.code);
    };
    const clear = () => {
      state.down.clear();
      state.pressed.clear();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      clear();
    };
  }, [enabled]);

  return ref;
}

export interface Axis {
  x: number;
  y: number;
  /** Action key held. */
  action: boolean;
  /** Action key pressed this frame (edge). */
  actionPressed: boolean;
}

/** Read a player's directional input. x/y are -1, 0 or 1 (diagonals normalised by caller if needed). */
export function readPlayer(keys: KeyState, player: PlayerConfig): Axis {
  const c = player.controls;
  const any = (codes: string[]) => codes.some((k) => keys.down.has(k));
  const anyPressed = (codes: string[]) => codes.some((k) => keys.pressed.has(k));
  return {
    x: (any(c.right) ? 1 : 0) - (any(c.left) ? 1 : 0),
    y: (any(c.down) ? 1 : 0) - (any(c.up) ? 1 : 0),
    action: any(c.action),
    actionPressed: anyPressed(c.action),
  };
}

import type { ComponentType } from "react";
import type { GameProps } from "@/lib/types";

type Loader = () => Promise<{ default: ComponentType<GameProps> }>;

/** Lazy loaders, so each game ships in its own chunk. */
export const GAME_LOADERS: Record<string, Loader> = {
  "element-lab": () => import("./element-lab/Game"),
  "impossible-scale": () => import("./impossible-scale/Game"),
  "fortune-factory": () => import("./fortune-factory/Game"),
  "chain-reaction": () => import("./chain-reaction/Game"),
  "perfect-timing": () => import("./perfect-timing/Game"),
  "pattern-breaker": () => import("./pattern-breaker/Game"),
  "ghost-memory": () => import("./ghost-memory/Game"),
  "visual-hunt": () => import("./visual-hunt/Game"),
  "mini-football": () => import("./mini-football/Game"),
  "bumper-arena": () => import("./bumper-arena/Game"),
  "speed-duel": () => import("./speed-duel/Game"),
  "micro-racers": () => import("./micro-racers/Game"),
};

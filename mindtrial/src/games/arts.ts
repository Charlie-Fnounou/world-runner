import type { ComponentType } from "react";
import ElementLabArt from "./element-lab/Art";
import ImpossibleScaleArt from "./impossible-scale/Art";
import FortuneFactoryArt from "./fortune-factory/Art";
import ChainReactionArt from "./chain-reaction/Art";
import PerfectTimingArt from "./perfect-timing/Art";
import PatternBreakerArt from "./pattern-breaker/Art";
import GhostMemoryArt from "./ghost-memory/Art";
import VisualHuntArt from "./visual-hunt/Art";
import MiniFootballArt from "./mini-football/Art";
import BumperArenaArt from "./bumper-arena/Art";
import SpeedDuelArt from "./speed-duel/Art";
import MicroRacersArt from "./micro-racers/Art";

/** Static SVG cover art per game (cheap, no canvas needed on the homepage). */
export const GAME_ART: Record<string, ComponentType<{ className?: string }>> = {
  "element-lab": ElementLabArt,
  "impossible-scale": ImpossibleScaleArt,
  "fortune-factory": FortuneFactoryArt,
  "chain-reaction": ChainReactionArt,
  "perfect-timing": PerfectTimingArt,
  "pattern-breaker": PatternBreakerArt,
  "ghost-memory": GhostMemoryArt,
  "visual-hunt": VisualHuntArt,
  "mini-football": MiniFootballArt,
  "bumper-arena": BumperArenaArt,
  "speed-duel": SpeedDuelArt,
  "micro-racers": MicroRacersArt,
};

import type { Category, GameMeta } from "./types";

/**
 * Single source of truth for every game shown on the site.
 * Strings are English; see `src/lib/i18n` for UI strings and the
 * plan for Spanish. Game copy can be moved to message files later
 * by keying on `slug`.
 */
export const GAMES: GameMeta[] = [
  {
    slug: "element-lab",
    title: "Element Lab",
    tagline: "A tiny universe of sand, water, fire and life.",
    description:
      "Paint with elements and watch them interact. Water drowns fire, fire spreads through plants, lava turns water to steam and stone. Discover every reaction.",
    category: "experiment",
    players: { min: 1, max: 1 },
    cpuOpponents: false,
    party: false,
    theme: { bg: "#14110f", ink: "#f6efe2", accent: "#ff9b3d", accent2: "#3dc6ff" },
    instructions: [
      "Pick an element from the palette and paint on the canvas.",
      "Elements react to each other. Find all the hidden reactions.",
      "Press Finish when you are done to see your discoveries.",
    ],
    controls: [
      { keys: "Click / drag", action: "Paint" },
      { keys: "Right-click", action: "Erase" },
      { keys: "1–9", action: "Choose element" },
      { keys: "[ ]", action: "Brush size" },
    ],
    record: { better: "higher", label: "Reactions found" },
    duration: "Endless",
    tags: ["physics", "sandbox", "creative"],
    featured: true,
    touch: true,
  },
  {
    slug: "impossible-scale",
    title: "Impossible Scale",
    tagline: "Zoom from a quantum crumb to a galaxy of soup.",
    description:
      "A seamless zoom journey through 30 orders of magnitude of strange fictional objects. Guess how big each thing is before you scroll past it.",
    category: "experiment",
    players: { min: 1, max: 1 },
    cpuOpponents: false,
    party: false,
    theme: { bg: "#0b0d1f", ink: "#eef0ff", accent: "#9b7bff", accent2: "#5ef2d6" },
    instructions: [
      "Scroll, drag or use the slider to zoom through scales.",
      "At each checkpoint, guess the size of the next object.",
      "Score points for close guesses. Reach the edge of everything.",
    ],
    controls: [
      { keys: "Scroll / drag", action: "Zoom" },
      { keys: "↑ ↓", action: "Zoom" },
      { keys: "Click", action: "Answer" },
    ],
    record: { better: "higher", label: "Guess score", unit: "pts" },
    duration: "4 min",
    tags: ["zoom", "science", "discovery"],
    featured: true,
    touch: true,
  },
  {
    slug: "fortune-factory",
    title: "Fortune Factory",
    tagline: "You just got 100 billion coins. Build an empire.",
    description:
      "An idle economy simulator. Invest an absurd imaginary fortune in factories, research and wild ventures. Survive market events and grow your net worth.",
    category: "experiment",
    players: { min: 1, max: 1 },
    cpuOpponents: false,
    party: false,
    theme: { bg: "#0f1a14", ink: "#f2f7e9", accent: "#c8f55a", accent2: "#ffcf4a" },
    instructions: [
      "Allocate your fortune across ventures. Each has its own risk and return.",
      "Every year, market events shake things up.",
      "After 20 years, your final net worth is your score.",
    ],
    controls: [
      { keys: "Click", action: "Buy / sell" },
      { keys: "Space", action: "Next year" },
    ],
    record: { better: "higher", label: "Final net worth", unit: "coins" },
    duration: "5 min",
    tags: ["economy", "strategy", "simulation"],
    touch: true,
  },
  {
    slug: "chain-reaction",
    title: "Chain Reaction",
    tagline: "One spark. Thirty dominoes. Pure chaos.",
    description:
      "Place ramps, bumpers, dominoes and bombs, then drop one ball. Get the chain reaction to hit every target with as few pieces as possible.",
    category: "experiment",
    players: { min: 1, max: 1 },
    cpuOpponents: false,
    party: false,
    theme: { bg: "#f4ecdf", ink: "#1b1b1b", accent: "#ff4f2e", accent2: "#2e6bff" },
    instructions: [
      "Pick a part and click to place it. Rotate with R or the wheel.",
      "Press Run to drop the ball and trigger the chain reaction.",
      "Hit every star target to clear the level. Fewer parts = more points.",
    ],
    controls: [
      { keys: "Click", action: "Place part" },
      { keys: "R / wheel", action: "Rotate" },
      { keys: "Space", action: "Run / reset" },
    ],
    record: { better: "higher", label: "Total score", unit: "pts" },
    duration: "6 min",
    tags: ["physics", "puzzle", "builder"],
    featured: true,
    touch: true,
  },
  {
    slug: "perfect-timing",
    title: "Perfect Timing",
    tagline: "Stop the clock at exactly the right moment.",
    description:
      "A target time appears. The clock starts and then hides. Stop it as close to the target as you can feel. Five rounds, total error is your score.",
    category: "brain",
    players: { min: 1, max: 4 },
    cpuOpponents: false,
    party: true,
    theme: { bg: "#fff3d6", ink: "#1a1300", accent: "#ff3d7f", accent2: "#1a1300" },
    instructions: [
      "Read the target time.",
      "The clock fades out after a moment. Keep counting in your head.",
      "Press your key to stop. Lowest total error wins.",
    ],
    controls: [
      { keys: "Space / click", action: "Stop (solo)" },
      { keys: "Player action key", action: "Stop (party)" },
    ],
    record: { better: "lower", label: "Total error", unit: "ms" },
    duration: "1 min",
    tags: ["reflex", "time", "focus"],
    featured: true,
    touch: true,
  },
  {
    slug: "pattern-breaker",
    title: "Pattern Breaker",
    tagline: "Crack the rule hiding in the sequence.",
    description:
      "Numbers, shapes and colors follow a hidden rule. Find what comes next before the timer runs out. Levels get stranger fast.",
    category: "brain",
    players: { min: 1, max: 1 },
    cpuOpponents: false,
    party: false,
    theme: { bg: "#eaf2ff", ink: "#0a1a3a", accent: "#2457ff", accent2: "#ff8a00" },
    instructions: [
      "Study the sequence or grid.",
      "Pick the option that continues the hidden rule.",
      "You have three lives. Faster answers earn bonus points.",
    ],
    controls: [
      { keys: "Click", action: "Choose" },
      { keys: "1–4", action: "Choose" },
    ],
    record: { better: "higher", label: "Score", unit: "pts" },
    duration: "3 min",
    tags: ["logic", "math", "patterns"],
    touch: true,
  },
  {
    slug: "ghost-memory",
    title: "Ghost Memory",
    tagline: "Ghosts flash. You remember. They get sneakier.",
    description:
      "Glowing ghosts light up a haunted grid in a sequence. Repeat it exactly. Every level adds a step, and the grid keeps growing.",
    category: "brain",
    players: { min: 1, max: 1 },
    cpuOpponents: false,
    party: false,
    theme: { bg: "#120d24", ink: "#efe8ff", accent: "#7cf7c9", accent2: "#ff6bd6" },
    instructions: [
      "Watch the ghosts appear in order.",
      "Tap the tiles in the same order.",
      "One mistake ends the run. How far can you go?",
    ],
    controls: [
      { keys: "Click / tap", action: "Select tile" },
      { keys: "Keys 1–9", action: "Select tile (3×3)" },
    ],
    record: { better: "higher", label: "Level reached" },
    duration: "2 min",
    tags: ["memory", "sequence", "focus"],
    touch: true,
  },
  {
    slug: "visual-hunt",
    title: "Visual Hunt",
    tagline: "One of these is not like the others.",
    description:
      "Find the odd one out in procedurally generated scenes. Shapes, hues, rotations and tiny details. The differences shrink as you climb.",
    category: "brain",
    players: { min: 1, max: 1 },
    cpuOpponents: false,
    party: false,
    theme: { bg: "#fdf0f3", ink: "#2a0a14", accent: "#e8175d", accent2: "#00a88f" },
    instructions: [
      "Each scene hides exactly one anomaly.",
      "Click it before the time bar empties.",
      "Wrong clicks cost time. Reach the highest stage you can.",
    ],
    controls: [{ keys: "Click / tap", action: "Pick the anomaly" }],
    record: { better: "higher", label: "Stage reached" },
    duration: "2 min",
    tags: ["perception", "speed", "observation"],
    touch: true,
  },
  {
    slug: "mini-football",
    title: "Mini Football",
    tagline: "Tiny pitch. Huge rivalries.",
    description:
      "Fast top-down football for 1–4 players. Dash, kick, score. First to 3 goals or the most goals after 90 seconds wins.",
    category: "arcade",
    players: { min: 1, max: 4 },
    cpuOpponents: true,
    cpuFill: 2,
    party: true,
    theme: { bg: "#0e3b22", ink: "#f2fff4", accent: "#e9ff57", accent2: "#ffffff" },
    instructions: [
      "Move into the ball to dribble. Press your action key to kick.",
      "2 players: 1 vs 1. 3–4 players: Coral & Lime vs Azure & Amber.",
      "First to 3 goals, or most goals when time runs out.",
    ],
    controls: [
      { keys: "Move", action: "Player keys" },
      { keys: "Action key", action: "Kick" },
    ],
    duration: "90 s",
    tags: ["sports", "versus", "local multiplayer"],
    featured: true,
    touch: false,
  },
  {
    slug: "bumper-arena",
    title: "Bumper Arena",
    tagline: "Push your friends off the edge. Be the last one standing.",
    description:
      "Sumo bumper cars on a shrinking island. Build momentum, dash into rivals and knock them into the void. Best of three rounds.",
    category: "arcade",
    players: { min: 1, max: 4 },
    cpuOpponents: true,
    cpuFill: 4,
    party: true,
    theme: { bg: "#1b0f2e", ink: "#fff1f8", accent: "#ff4fa3", accent2: "#5af0ff" },
    instructions: [
      "Steer with your movement keys. Momentum matters.",
      "Press your action key to dash (short cooldown).",
      "Last bumper on the platform wins the round. Win 2 rounds.",
    ],
    controls: [
      { keys: "Move", action: "Player keys" },
      { keys: "Action key", action: "Dash" },
    ],
    duration: "1–2 min",
    tags: ["physics", "versus", "local multiplayer"],
    featured: true,
    touch: false,
  },
  {
    slug: "speed-duel",
    title: "Speed Duel",
    tagline: "Wait for it… wait for it… NOW.",
    description:
      "A western-style reflex showdown for up to four players. React to the signal first, but fire too early and you are out of the round.",
    category: "arcade",
    players: { min: 1, max: 4 },
    cpuOpponents: true,
    cpuFill: 2,
    party: true,
    theme: { bg: "#2b1408", ink: "#fff2df", accent: "#ffb23e", accent2: "#ff3b1f" },
    instructions: [
      "Wait for the signal. Each round uses a different kind of trap.",
      "Press your action key first when it is time.",
      "Fire early and you are frozen for the round. First to 5 points wins.",
    ],
    controls: [
      { keys: "Action key", action: "Fire" },
      { keys: "Tap your zone", action: "Fire (touch)" },
    ],
    record: { better: "lower", label: "Best reaction", unit: "ms" },
    duration: "1 min",
    tags: ["reflex", "versus", "local multiplayer"],
    touch: true,
  },
  {
    slug: "micro-racers",
    title: "Micro Racers",
    tagline: "Desk-sized cars. Full-sized drama.",
    description:
      "Top-down racing on tabletop tracks for 1–4 players. Drift through corners, hit boost pads, and finish 3 laps first.",
    category: "arcade",
    players: { min: 1, max: 4 },
    cpuOpponents: true,
    cpuFill: 4,
    party: true,
    theme: { bg: "#e9e4d8", ink: "#16161a", accent: "#ff2f4f", accent2: "#16161a" },
    instructions: [
      "Up to accelerate, down to brake/reverse, left/right to steer.",
      "Action key = handbrake for tight drifts.",
      "Pass every checkpoint. First to finish 3 laps wins.",
    ],
    controls: [
      { keys: "Move", action: "Drive / steer" },
      { keys: "Action key", action: "Handbrake" },
    ],
    record: { better: "lower", label: "Best race time", unit: "s" },
    duration: "2 min",
    tags: ["racing", "versus", "local multiplayer"],
    featured: true,
    touch: false,
  },
];

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: "experiment", label: "Experiments", blurb: "Interactive toys and simulations to poke at." },
  { id: "brain", label: "Brain challenges", blurb: "Test your timing, memory, logic and eyes." },
  { id: "arcade", label: "Multiplayer arcade", blurb: "Share one keyboard. Ruin friendships." },
];

export function getGame(slug: string): GameMeta | undefined {
  return GAMES.find((g) => g.slug === slug);
}

export const PARTY_GAMES = GAMES.filter((g) => g.party);

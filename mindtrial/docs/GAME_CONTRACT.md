# MINDTRIAL — Game contract

Every game is a self-contained folder in `src/games/<slug>/` and is wired into the site
by three central files (already set up — do not change them):

- `src/lib/catalog.ts` — title, copy, theme colors, instructions, controls, record definition.
- `src/games/registry.ts` — `() => import("./<slug>/Game")` lazy loader.
- `src/games/arts.ts` — `import Art from "./<slug>/Art"` cover art for cards.

## Required files

| File | Export | Purpose |
| --- | --- | --- |
| `src/games/<slug>/Game.tsx` | `default` React component `(props: GameProps) => JSX` with `"use client"` | The game itself |
| `src/games/<slug>/Art.tsx` | `default` component `({ className }: { className?: string }) => JSX` | Static SVG cover (no `"use client"` needed, no state, no canvas). `viewBox="0 0 400 300"`, `preserveAspectRatio="xMidYMid slice"`, fills its box (`className` gets `w-full h-full`). Use the game's theme colors from `catalog.ts`. Original, bold, editorial/arcade illustration. Can include CSS animations via `<style>` + classes that respect `prefers-reduced-motion`. |

Helpers/subfiles inside the folder are fine (`logic.ts`, `levels.ts`, …). Keep pure logic in
`.ts` files so it can be reasoned about separately from rendering.

## What the shell (`GameShell`) already does — do NOT re-implement

- Start screen with title, instructions, controls, player-count picker.
- 3-2-1 countdown for `arcade` category games before mounting/unpausing.
- Pause overlay (Esc / P), restart (re-mounts your component with a new `key`), mute, fullscreen.
- End screen with headline, score, stats, standings podium, replay, back to catalog.
- Personal records in localStorage (from `result.score`, solo only).

Your component is mounted **when the player presses Start** (and re-mounted on restart / replay).
It is rendered inside an absolutely positioned box that fills the stage under the top bar:
make your root `className="relative h-full w-full …"`. The stage background is `theme.bg`.

## Props (`src/lib/types.ts`)

```ts
interface GameProps {
  mode: "solo" | "party";
  players: PlayerConfig[];   // solo games get 1 human. Multiplayer: 1–4, some may be cpu:true
  paused: boolean;           // true during countdown, pause menu, and after finishing. FREEZE EVERYTHING.
  reducedMotion: boolean;    // tone down screen shake, flashes, particle storms
  onFinish: (r: GameResult) => void; // call EXACTLY ONCE when the run ends
}
interface GameResult {
  headline: string;      // "Coral wins!", "Level 9", "So close."
  subline?: string;
  score?: number;        // numeric value for personal record (see catalog record.better / unit)
  scoreLabel?: string;   // pretty score: "12 ms", "4,200 pts"
  stats?: { label: string; value: string }[];  // 2–6 items
  placements?: number[]; // MULTIPLAYER/PARTY: rank per player index, 0 = first. Ties share rank. length === players.length
}
```

`PlayerConfig` = `{ index, name, color, shade, controls, cpu }`. Use `player.color` for everything
that identifies a player (Coral `#ff5a3c`, Azure `#2f7bff`, Lime `#3fcf5a`, Amber `#ffbf1f`).

## Shared helpers — use them

- `useKeys(enabled)` + `readPlayer(keys.current, player)` from `@/lib/input` →
  `{ x, y, action, actionPressed }`. `keys.current.pressed` is edge-triggered; call
  `keys.current.consume()` once at the end of each frame. Uses `KeyboardEvent.code`.
  For solo keyboard shortcuts you can also add your own `keydown` listener (ignore when `paused`).
- `useGameLoop((dt, t) => …, running)` from `@/lib/loop` — rAF loop, dt in seconds (clamped).
  Pass `running = !paused` (the loop stops while paused, so time does not advance).
- `<FitCanvas ref width height />` from `@/components/game/FitCanvas` — fixed logical resolution,
  letterboxed to fit, DPR-crisp. `ref.current.ctx` is pre-scaled to logical units;
  `ref.current.toLocal(e)` converts pointer events. Re-read `ctx` every frame.
- `rng(seed)`, `randomSeed()`, `clamp`, `lerp` from `@/lib/random`.
- `sfx.click/good/bad/win/tick/hit/boom()` and `tone({freq,to,duration,type,volume,delay})`,
  `noise(duration, volume)` from `@/lib/sound` (respects global mute).

## Rules

1. **Pause correctness**: when `paused` is true no time may pass (timers, spawns, physics, countdowns,
   reaction-time measurements). Prefer accumulating `dt` from `useGameLoop` over `Date.now()` diffs.
   If you use `performance.now()` for precise timing (reaction games), subtract paused durations.
2. **No `setState` per frame** for canvas games — keep simulation state in refs and draw to canvas.
   React state is fine for HUD values that change rarely (score, level), or for DOM/SVG-based games.
3. **Input**: Never use Shift/Ctrl/Alt/Meta/Tab. Don't use Escape or `P` (shell uses them).
   Space is fine for solo games. Multiplayer games must use each player's `controls`.
   Pointer events should use `onPointerDown` etc. so touch works on `touch: true` games.
4. **CPU players** (`player.cpu === true`) must be driven by simple, fair AI — beatable but not dumb.
5. **Responsiveness**: the stage can be anything from 360×560 (phone portrait) to 2560×1300.
   Canvas games: use `FitCanvas` with a sensible logical size. DOM games: use flex/grid with
   `clamp()` / responsive Tailwind classes. No horizontal page scroll. Put an in-game HUD on top
   of / around the play area using the game's theme colors.
6. **Visual identity**: each game has its own theme in `catalog.ts` (`bg`, `ink`, `accent`, `accent2`).
   Make it look polished and distinctive — juicy feedback (particles, easing, squash/stretch,
   sound), clear typography (`font-display` = Bricolage Grotesque, `font-serif` = Instrument Serif
   italic, `font-mono` = JetBrains Mono — these Tailwind classes exist).
7. **No placeholders, no fake data**. Everything shown must be real and functional.
8. **SSR safety**: games are only rendered client-side, but avoid touching `window` at module top level.
9. **Lint/type clean**: `npx tsc --noEmit` and `npx eslint src/games/<slug>` must pass for your files.
   (React 19 lint rules are strict: no `setState` synchronously inside `useEffect` bodies
   unless unavoidable, no reading `ref.current` during render, no impure calls like
   `Math.random()` during render — use `useState(() => …)` initialisers or effects.)

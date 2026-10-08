# MINDTRIAL

An arcade, a museum and an intelligence playground: 12 original browser games —
physics experiments, brain challenges and local-multiplayer arcade games — plus a
Party Mode tournament for 2–4 players sharing one keyboard.

- No accounts, no backend, no database. Personal records live in `localStorage`.
- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Canvas/SVG · Lucide icons.

> This app lives in the `mindtrial/` folder of the `world-runner` repository and is
> completely independent of the root app (own `package.json`, lockfile and config).

## Run locally

Requirements: Node.js 20.9+ (tested on Node 22) and npm.

```bash
cd mindtrial
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build (also type-checks)
npm run start        # serve the production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

The build downloads the three Google fonts (Bricolage Grotesque, Instrument Serif,
JetBrains Mono) through `next/font`, so it needs network access the first time.

## Deploy to Vercel

1. Push the repository to GitHub (already the case for `world-runner`).
2. In Vercel: **Add New… → Project → Import** the `world-runner` repository.
3. Set **Root Directory** to `mindtrial`. Framework preset: **Next.js** (auto-detected).
   Build command `next build`, output directory default — no changes needed.
4. Optional environment variable: `NEXT_PUBLIC_SITE_URL=https://your-domain` (used for
   absolute Open Graph URLs). Nothing else is required.
5. Deploy. Every route is statically prerendered, so it runs on the free tier.

CLI alternative:

```bash
cd mindtrial
npx vercel        # preview deployment (link the project when asked; root = mindtrial)
npx vercel --prod # production
```

## Project structure

```
src/
  app/                    routes: / , /play/[slug] , /party , /records
  components/
    game/                 GameShell (start/pause/end flow), FitCanvas, GameLoader, Standings
    party/                Party Mode tournament (rotation, scoring, results, champion)
    site/                 header, footer, hero, catalog, cards
  games/<slug>/           one folder per game: Game.tsx (+ logic) and Art.tsx (cover)
  games/registry.ts       lazy loaders (each game is its own JS chunk)
  games/arts.ts           cover art map
  lib/                    catalog, types, input, loop, sound, records, players, i18n
docs/GAME_CONTRACT.md     how to build a new game
```

### Adding a game

1. Create `src/games/<slug>/Game.tsx` (default export, accepts `GameProps`) and `Art.tsx`.
2. Add its metadata to `src/lib/catalog.ts`, a loader to `src/games/registry.ts` and the
   art to `src/games/arts.ts`.
3. Read `docs/GAME_CONTRACT.md` — the shell already handles start screen, countdown,
   pause, restart, results, records and Party Mode.

### Keyboard layout for local multiplayer

| Player | Move | Action |
| --- | --- | --- |
| Coral | W A S D | Q |
| Azure | Arrow keys | Enter |
| Lime | I J K L | U |
| Amber | T F G H (or Numpad 8 4 5 6) | R (or Numpad 0) |

Keys are read by physical position (`KeyboardEvent.code`), so AZERTY/QWERTZ keyboards
use the same physical keys. No modifier keys are used (avoids OS shortcuts and ghosting).
`Esc` or `P` pauses any game.

### Localisation

UI strings live in `src/lib/i18n/en.ts` (typed as `Messages`). To add Spanish, create
`es.ts` implementing `Messages` and register it in `src/lib/i18n/index.ts`. Game copy is
centralised in `src/lib/catalog.ts`.

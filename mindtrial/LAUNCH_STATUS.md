# MINDTRIAL — Launch status (public beta)

_Last updated: 2026-10-12_

## Summary

All 12 games are implemented and playable. The homepage, Party Mode, the records page and
the 404 page are complete, and the production build succeeds (`npm run build`, 23 static
routes). A **Preview deployment** on Vercel passes the browser test suite. **Production has
not been deployed** and is blocked until the owner approves it.

## Games

| # | Game | Category | Players | Touch | Personal record |
| --- | --- | --- | --- | --- | --- |
| 1 | Element Lab | Experiment | 1 | ✅ | Reactions found (12 to discover) |
| 2 | Impossible Scale | Experiment | 1 | ✅ | Guess score |
| 3 | Fortune Factory | Experiment | 1 | ✅ | Final net worth |
| 4 | Chain Reaction | Experiment | 1 | ✅ (best in landscape) | Total score, 9 levels |
| 5 | Perfect Timing | Brain | 1–4 (party) | ✅ | Total error (ms) |
| 6 | Pattern Breaker | Brain | 1 | ✅ | Score |
| 7 | Ghost Memory | Brain | 1 | ✅ | Level reached |
| 8 | Visual Hunt | Brain | 1 | ✅ | Stage reached |
| 9 | Mini Football | Arcade | 1 (vs CPU)–4 | ❌ keyboard | — |
| 10 | Bumper Arena | Arcade | 1 (vs 3 CPU)–4 | ❌ keyboard | — |
| 11 | Speed Duel | Arcade | 1 (vs CPU)–4 | ✅ tap zones | Best reaction (vs CPU) |
| 12 | Micro Racers | Arcade | 1 (vs 3 CPU)–4 | ❌ keyboard | Race time (vs CPU) |

Party Mode rotation: Perfect Timing, Mini Football, Bumper Arena, Speed Duel, Micro Racers.

## What was tested, and how

**In a real browser** (headless Chromium via Playwright, against the production build):

- Every route returns 200: `/`, `/party`, `/records`, and all 12 `/play/<slug>`. Unknown routes return the 404 page.
- Every game: start screen → Start → gameplay renders → keyboard and mouse input → **Esc opens the pause overlay** → resume → **Restart** re-mounts the game. All 12 passed with **no console errors or page errors**.
- Every game page was screenshotted and inspected (desktop 1440×900), along with eight touch-capable games at phone size (390×844). There is no horizontal overflow on the homepage, Party Mode or those game pages.
- **Full Party Mode tournament:** 2 players, 3 rounds, driven by keyboard. Covers setup, key check-in, round intro, game, results with points, scoreboard, champion screen and rematch.
- **Every solo game played to its results screen** (Element Lab, Impossible Scale, Fortune Factory, Chain Reaction, Perfect Timing, Pattern Breaker, Ghost Memory, Visual Hunt). All 8 runs then appear on `/records`.
- **CPU opponents:** with the human idle, every arcade game finished on its own against the CPU (Micro Racers in 50 s, Speed Duel 55 s, Mini Football 92 s, Bumper Arena 116 s). Screenshots show the CPUs chasing the ball, pushing rivals and racing laps.
- **Chain Reaction on touch:** a part can be selected and placed by tapping, and Run stays visible in portrait and landscape.
- **Preview deployment on Vercel:** the same route and per-game suite passes on the preview URL with no console errors.
- **Metadata:** Open Graph and Twitter image, favicon, apple icon and web manifest are all served.

**Headless logic tests by the game developers** (scripts kept outside the repo):

- Thousands of simulated all-CPU football, bumper, racing and duel matches; all of them finish.
- Puzzle uniqueness checks: 7,500 Pattern Breaker puzzles and 24,000 Visual Hunt stages.
- Reference solutions for all 9 Chain Reaction levels.
- Element Lab reactions checked one by one.
- Fortune Factory balance checked across 400 seeds per strategy.

**Static checks:** `tsc --noEmit` and ESLint (Next.js core-web-vitals and TypeScript rules) are clean.

**Not tested** (needs humans before or during the beta):

- Real people playing: difficulty, balance and "feel", especially the CPU opponents, racing handling and Chain Reaction's physics puzzles.
- Sound; there was no audio output in the test environment.
- Four people physically sharing one keyboard. Keyboard ghosting depends on the hardware; the key clusters were chosen to minimise it, but this hasn't been verified on real keyboards.
- Safari and Firefox (only Chromium was tested) and real iOS/Android devices.
- Long sessions and performance on low-end laptops.

## Known limitations / needs improvement

- **Chain Reaction on phones:** usable in portrait, where Run is pinned and a tip suggests rotating, but the machine is small. Landscape or a tablet is better.
- **Mini Football, Bumper Arena and Micro Racers need a physical keyboard.** The start screen tells touch users this.
- **Element Lab** sizes its grid once when it loads, so rotating a phone letterboxes the canvas rather than re-flowing it.
- **Time caps so Party Mode can't stall:** Mini Football's golden goal ends after 60 s (decided on possession), and a Micro Racers race ends after 3 minutes (ranked by distance).
- **Speed Duel with only idle humans** keeps voiding rounds until someone fires. Quit is always available.
- **Visual Hunt** uses `oklch()` colours and **Ghost Memory** uses container query units, so both need a 2023+ browser.
- **Records** are per browser, stored in `localStorage`. There are no global leaderboards, by design for the MVP.
- **Spanish:** UI strings are centralised in `src/lib/i18n/en.ts` and game copy in `src/lib/catalog.ts`, but no Spanish translation exists yet.
- **No analytics** (deliberately).

## Vercel setup

- Separate Vercel project **`mindtrial`** (team Charlie-Fnounou), Root Directory `mindtrial`, linked to this repo.
  The existing `world-runner` project was not touched.
- **Production builds are paused** by the project's *Ignored Build Step*, so merging to `main`
  cannot publish MINDTRIAL by accident. The same step skips builds of branches that don't contain
  this app. To launch: Project → Settings → Git → Ignored Build Step → remove the production
  line, then redeploy to production.
- Previews are protected by Vercel Authentication, the team default: only team members can open
  them, or use a share link.
- Builds use webpack, and the file-tracing root is the repo root, which Vercel requires for a
  subfolder app (see README).

## Deployment checklist

1. ✅ Vercel project `mindtrial` created (Root Directory `mindtrial`).
2. ✅ Preview deployed and tested.
3. ⏳ Owner approval → un-pause production, deploy, then set `NEXT_PUBLIC_SITE_URL` once a domain is chosen.
4. Note: the root `vercel.json` (cron for world-runner) belongs to the other app and does not apply to a project rooted at `mindtrial/`.

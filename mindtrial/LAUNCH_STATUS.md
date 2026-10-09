# MINDTRIAL — Launch status (public beta)

_Last updated: 2026-10-09_

## Summary

All 12 planned games are implemented and playable. The homepage, Party Mode, the records
page and the 404 page are complete, and the production build succeeds (`next build`, 18
static pages). The app is **ready to deploy as a public beta** to Vercel with the root
directory set to `mindtrial/`. It has **not** been deployed or published yet; that needs
the owner's go-ahead.

## Games

| # | Game | Category | Players | Touch | Personal record |
| --- | --- | --- | --- | --- | --- |
| 1 | Element Lab | Experiment | 1 | ✅ | Reactions found (12 to discover) |
| 2 | Impossible Scale | Experiment | 1 | ✅ | Guess score |
| 3 | Fortune Factory | Experiment | 1 | ✅ | Final net worth |
| 4 | Chain Reaction | Experiment | 1 | ✅ (cramped on phones) | Total score, 9 levels |
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
- **Solo run to completion (Perfect Timing):** end screen, "New personal best!", Play again, and the record shown on `/records`.

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

- **Chain Reaction on phones:** the play area is small in portrait, and the toolbar has to be scrolled sideways. It's usable but best on a tablet or desktop.
- **Mini Football, Bumper Arena and Micro Racers need a physical keyboard.** The start screen tells touch users this.
- **Element Lab** sizes its grid once when it loads, so rotating a phone letterboxes the canvas rather than re-flowing it.
- **Mini Football golden goal** is capped at 60 s. A sudden death still level after that is decided on possession.
- **Visual Hunt** uses `oklch()` colours and **Ghost Memory** uses container query units, so both need a 2023+ browser.
- **Records** are per browser, stored in `localStorage`. There are no global leaderboards, by design for the MVP.
- **Spanish:** UI strings are centralised in `src/lib/i18n/en.ts` and game copy in `src/lib/catalog.ts`, but no Spanish translation exists yet.
- **No Open Graph image yet;** link previews show title and description only.
- **No analytics** (deliberately).

## Deployment checklist

1. Vercel → New Project → import `world-runner` → **Root Directory: `mindtrial`**.
2. Optional: `NEXT_PUBLIC_SITE_URL` = final domain.
3. Deploy, then smoke-test `/`, `/party` and a few games on the preview URL.
4. Note: the root `vercel.json` (cron for world-runner) belongs to the other app and does not apply to a project rooted at `mindtrial/`.

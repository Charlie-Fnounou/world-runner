/**
 * UI strings. Add a sibling `es.ts` implementing `Messages` to ship Spanish;
 * components read strings via `useT()` / `messages` so no markup changes
 * are needed.
 */
export const en = {
  brand: "MINDTRIAL",
  nav: { games: "Games", party: "Party Mode", records: "My Records" },
  shell: {
    play: "Play",
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    restart: "Restart",
    playAgain: "Play again",
    backToCatalog: "All games",
    howToPlay: "How to play",
    controls: "Controls",
    players: "Players",
    vsCpu: "vs CPU",
    newBest: "New personal best!",
    best: "Your best",
    noBest: "No record yet",
    paused: "Paused",
    mute: "Mute sound",
    unmute: "Unmute sound",
    keyboardRequired: "This game needs a physical keyboard.",
    finish: "Finish",
  },
  party: {
    title: "Party Mode",
    continue: "Continue",
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Messages = Widen<typeof en>;

import Link from "next/link";
import { ArrowRight, Brain, FlaskConical, Joystick, Users } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HeroField } from "@/components/site/HeroField";
import { Catalog } from "@/components/site/Catalog";
import { GameCard } from "@/components/site/GameCard";
import { SurpriseButton } from "@/components/site/SurpriseButton";
import { KeyboardMap } from "@/components/site/KeyboardMap";
import { CATEGORIES, GAMES, PARTY_GAMES } from "@/lib/catalog";
import { PLAYER_COLORS, PLAYER_CONTROLS } from "@/lib/players";
import { GAME_ART } from "@/games/arts";

const CATEGORY_ICON = { experiment: FlaskConical, brain: Brain, arcade: Joystick } as const;

export default function Home() {
  const featured = GAMES.filter((g) => g.featured);
  const [lead, ...rest] = featured;
  return (
    <>
      <SiteHeader />
      <main className="grain">
        {/* HERO */}
        <section className="relative overflow-hidden border-b-2 border-ink">
          <HeroField />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-10 sm:px-6 md:pb-20 md:pt-16 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div className="animate-rise rounded-[28px] border-2 border-ink bg-paper/95 p-6 shadow-[0_8px_0_0_var(--color-ink)] sm:p-9">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-muted">
                Exhibit Nº 001 · Public beta · Oct 2026
              </p>
              <h1 className="mt-4 font-display text-[clamp(2.6rem,7.4vw,6.4rem)] font-black leading-[0.88] tracking-[-0.045em]">
                Twelve tiny <span className="font-serif font-normal italic tracking-[-0.02em] text-coral">trials</span> for your
                brain, reflexes <span className="whitespace-nowrap">&amp; friendships.</span>
              </h1>
              <p className="mt-5 max-w-xl font-serif text-xl italic leading-snug text-ink-2 sm:text-2xl">
                An arcade, a museum and an intelligence playground in one tab. No sign-up. No downloads. Just play.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="#games" className="btn bg-ink text-paper" style={{ boxShadow: "0 4px 0 0 #ff5a3c" }}>
                  Browse games <ArrowRight size={18} />
                </Link>
                <SurpriseButton />
                <Link href="/party" className="btn bg-paper">
                  <Users size={18} /> Party Mode
                </Link>
              </div>
            </div>
            <div className="hidden animate-rise flex-col gap-3 [animation-delay:150ms] lg:flex">
              {[
                ["12", "original games"],
                ["0", "accounts needed"],
                ["1–4", "players, one keyboard"],
              ].map(([n, l]) => (
                <div key={l} className="flex items-baseline gap-4 rounded-2xl border-2 border-ink bg-paper/95 px-5 py-3">
                  <span className="font-display text-5xl font-black tabular-nums tracking-tight">{n}</span>
                  <span className="font-serif text-xl italic text-ink-2">{l}</span>
                </div>
              ))}
              <p className="px-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">↖ Psst: poke the shapes.</p>
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="overflow-hidden border-b-2 border-ink bg-ink py-3 text-paper" aria-hidden>
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-2xl font-extrabold tracking-tight">
            {[...GAMES, ...GAMES].map((g, i) => (
              <span key={i} className="flex items-center gap-10">
                {g.title}
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: PLAYER_COLORS[i % 4].color }} />
              </span>
            ))}
          </div>
        </div>

        {/* FEATURED */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24" aria-labelledby="featured-title">
          <SectionHeading eyebrow="Featured exhibits" title="Start with these." id="featured-title" />
          <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:grid-rows-2">
            <div className="lg:col-span-2 lg:row-span-2">
              <GameCard game={lead} size="lg" />
            </div>
            {rest.slice(0, 2).map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {rest.slice(2, 6).map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="border-y-2 border-ink bg-paper-2" aria-labelledby="cat-title">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
            <SectionHeading eyebrow="Three wings" title="Pick your kind of trouble." id="cat-title" />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {CATEGORIES.map((c, i) => {
                const Icon = CATEGORY_ICON[c.id];
                const games = GAMES.filter((g) => g.category === c.id);
                return (
                  <div key={c.id} className="flex flex-col rounded-[22px] border-2 border-ink bg-paper p-6">
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink" style={{ background: PLAYER_COLORS[i].color }}>
                        <Icon size={22} />
                      </span>
                      <span className="font-mono text-xs text-muted">Wing {String.fromCharCode(65 + i)}</span>
                    </div>
                    <h3 className="mt-5 font-display text-3xl font-extrabold tracking-tight">{c.label}</h3>
                    <p className="mt-1 font-serif text-lg italic text-ink-2">{c.blurb}</p>
                    <ul className="mt-5 space-y-2">
                      {games.map((g) => {
                        const Art = GAME_ART[g.slug];
                        return (
                          <li key={g.slug}>
                            <Link href={`/play/${g.slug}`} className="group flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-ink hover:text-paper">
                              <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg border-[1.5px] border-ink" style={{ background: g.theme.bg }}>
                                {Art && <Art className="absolute inset-0 h-full w-full" />}
                              </span>
                              <span className="font-bold">{g.title}</span>
                              <ArrowRight size={16} className="ml-auto opacity-0 transition group-hover:opacity-100" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CATALOG */}
        <section id="games" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24" aria-labelledby="all-title">
          <SectionHeading eyebrow="The full collection" title="Every game, one click away." id="all-title" />
          <div className="mt-10">
            <Catalog />
          </div>
        </section>

        {/* PARTY */}
        <section className="border-t-2 border-ink bg-ink text-paper" aria-labelledby="party-title">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-paper/60">Party Mode · 2–4 players</p>
              <h2 id="party-title" className="mt-3 font-display text-[clamp(2.4rem,6vw,4.6rem)] font-black leading-[0.9] tracking-[-0.04em]">
                One keyboard. <span className="font-serif font-normal italic text-amber">Four rivals.</span> Zero mercy.
              </h2>
              <p className="mt-5 max-w-lg font-serif text-xl italic text-paper/80">
                A random tournament of {PARTY_GAMES.length} mini-games. Points every round, a live scoreboard and one undisputed champion.
              </p>
              <ul className="mt-7 grid gap-2 sm:grid-cols-2">
                {PLAYER_COLORS.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-3 rounded-xl border border-paper/15 px-3 py-2">
                    <span className="h-4 w-4 rounded-full" style={{ background: c.color }} />
                    <span className="font-bold">{c.name}</span>
                    <span className="ml-auto flex gap-1 text-xs text-paper/80">
                      <span className="kbd">{PLAYER_CONTROLS[i].moveLabel.split("  ")[0]}</span>
                      <span className="kbd">{PLAYER_CONTROLS[i].actionLabel.split("  ")[0]}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/party" className="btn mt-8 bg-amber text-ink" style={{ borderColor: "#ffbf1f", boxShadow: "0 4px 0 0 #b07f00" }}>
                <Users size={18} /> Start a party
              </Link>
            </div>
            <div className="rounded-[28px] border-2 border-paper/20 bg-[#1d1a17] p-5 sm:p-8">
              <KeyboardMap className="w-full" />
              <div className="mt-6 flex flex-wrap gap-2">
                {PARTY_GAMES.map((g) => (
                  <Link key={g.slug} href={`/play/${g.slug}`} className="rounded-full border border-paper/25 px-3 py-1 text-sm font-semibold transition hover:bg-paper hover:text-ink">
                    {g.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div className="flex flex-col gap-2 border-b-2 border-ink pb-5 sm:flex-row sm:items-end sm:justify-between">
      <h2 id={id} className="font-display text-[clamp(2rem,4.6vw,3.6rem)] font-black leading-[0.95] tracking-[-0.035em]">
        {title}
      </h2>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-muted">{eyebrow}</p>
    </div>
  );
}

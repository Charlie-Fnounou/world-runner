import { Reveal } from "@/components/Reveal";
import { WhatsAppIcon } from "@/components/Icons";
import { site, whatsappLink } from "@/data/site";

/** label colours, one per row on hover */
const sweep = ["#C3D2E1", "#F6C3CB", "#5B60D6", "#F2C14E", "#C3C59A", "#E9D8C4"];

export function Stores() {
  return (
    <section id="donde-comprar" aria-labelledby="stores-title" className="relative bg-paper-2 py-24 md:py-36">
      <div className="gutter grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="kicker text-ink/60">Dónde comprar</p>
          <h2 id="stores-title" className="font-display mt-6 text-[13vw] leading-[0.9] tracking-[-0.02em] md:text-[5vw]">
            En tu súper, <em>en todo el país.</em>
          </h2>
          <p className="mt-6 max-w-xs text-[1rem] leading-relaxed text-ink-2">
            Encuentra Fresh Lovers en las principales cadenas de supermercados de Panamá.
          </p>
        </div>
        <ol className="md:col-span-8">
          {site.stores.map((s, n) => (
            <Reveal as="li" key={s} delay={n * 0.05}>
              <div
                className="group relative flex items-baseline gap-5 overflow-hidden border-b border-ink/15 py-5 md:gap-8 md:py-6"
                style={{ ["--sweep" as string]: sweep[n % sweep.length] }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 origin-bottom scale-y-0 bg-[var(--sweep)] transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-y-100"
                />
                <span className="kicker relative w-8 text-ink/50">{String(n + 1).padStart(2, "0")}</span>
                <span className="font-display relative text-[9vw] leading-none transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-3 md:text-[4.2vw]">
                  {s}
                </span>
              </div>
            </Reveal>
          ))}
          <li className="list-none">
            <a
              href={whatsappLink("Hola Fresh Lovers, ¿dónde consigo sus productos cerca de mí?")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 text-[1rem] underline-offset-4 hover:underline"
            >
              <WhatsAppIcon className="h-4 w-4" />
              ¿No lo encuentras? Pregúntanos por WhatsApp
            </a>
          </li>
        </ol>
      </div>
    </section>
  );
}

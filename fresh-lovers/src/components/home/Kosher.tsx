import Link from "next/link";
import { Cartouche } from "@/components/Logo";
import { MaskLine, Reveal } from "@/components/Reveal";
import { products } from "@/data/catalog";
import { site } from "@/data/site";

export function Kosher() {
  const jalav = products.filter((p) => p.seals?.includes("jalav-israel"));
  return (
    <section id="kosher" aria-labelledby="kosher-title" className="relative overflow-hidden bg-ink py-24 text-paper md:py-36">
      <p className="absolute right-[var(--gutter)] top-8 text-sm text-paper/50" lang="he" aria-label="Be-siyata dishmaya">
        בס״ד
      </p>
      {/* cartouche outline as a quiet seal */}
      <Cartouche
        className="pointer-events-none absolute -right-[18vw] top-1/2 h-[120vw] w-[86vw] -translate-y-1/2 text-transparent opacity-20 md:-right-[6vw] md:h-[56vw] md:w-[40vw]"
        fill="none"
        stroke="#f4efe6"
        w={100}
        h={140}
      />
      <div className="gutter relative grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="kicker text-paper/60">Kosher</p>
          <h2 id="kosher-title" className="font-display mt-6 text-[17vw] leading-[0.86] tracking-[-0.02em] md:text-[9vw]">
            <MaskLine>Jalav</MaskLine>
            <MaskLine delay={0.1}>
              <em>Israel</em>
            </MaskLine>
          </h2>
        </div>
        <div className="md:col-span-5 md:pt-24">
          <Reveal>
            <p className="font-display text-[7vw] leading-[1.1] md:text-[2.2vw]">
              Nuestra producción cuenta con supervisión de kashrut de <em>{site.kashrut}</em>.
            </p>
            <p className="mt-6 max-w-md text-[1rem] leading-relaxed text-paper/75">
              Los lácteos que llevan el sello Jalav Israel en su etiqueta incluyen:
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {jalav.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/productos/${p.slug}`}
                    className="inline-block rounded-full border border-paper/25 px-3.5 py-1.5 text-sm transition-colors hover:bg-paper hover:text-ink"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-paper/55">Busca siempre el sello en el empaque de cada producto.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

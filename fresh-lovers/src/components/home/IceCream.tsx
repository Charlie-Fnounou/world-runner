import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/Icons";
import { MaskLine, Reveal } from "@/components/Reveal";
import { helado } from "@/data/helado";

const shots = [
  { src: "/helado/carrito.webp", w: 1100, h: 1139, alt: "Carrito de la estación de helado Fresh Lovers" },
  { src: "/helado/maquina.webp", w: 407, h: 594, alt: "Máquina de helado soft serve sobre su mueble" },
  { src: "/helado/activacion.webp", w: 509, h: 540, alt: "Helado soft serve servido en una activación de tienda" },
];

/** Home teaser for the soft-serve station; the full offer lives at /helado. */
export function IceCream() {
  return (
    <section id="helado" aria-labelledby="helado-title" className="relative overflow-hidden bg-[#EADFD2] py-20 text-[#3E2C20] md:py-28">
      <div className="gutter grid gap-12 md:grid-cols-12 md:items-center">
        <div className="md:col-span-5">
          <p className="kicker">Estación de helado</p>
          <h2 id="helado-title" className="font-display mt-5 text-[15vw] leading-[0.9] tracking-[-0.02em] md:text-[6.2vw]">
            <MaskLine>Helado</MaskLine>
            <MaskLine delay={0.08}>
              <em>soft serve.</em>
            </MaskLine>
          </h2>
          <Reveal className="mt-7 max-w-md text-[1.05rem] leading-relaxed">
            Llevamos la estación a tu evento: la máquina, el helado y el personal que la atiende. Para fiestas, aperturas, lanzamientos y activaciones en tiendas y
            centros comerciales. Sabores: {helado.flavours.join(", ").toLowerCase().replace(/, (?=[^,]*$)/, " o ")}.
          </Reveal>
          <Reveal delay={0.1}>
            <dl className="mt-9 grid max-w-md grid-cols-2 gap-4 border-t border-current/25 pt-5" style={{ borderColor: "color-mix(in srgb, currentColor 25%, transparent)" }}>
              {helado.packages.map((p) => (
                <div key={p.name}>
                  <dt className="font-display text-[1.35rem] italic">{p.name}</dt>
                  <dd className="mt-1 text-[0.95rem]">
                    {p.servings} helados · ${p.price}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={0.15}>
            <Link href="/helado" className="group mt-9 inline-flex items-center gap-3 rounded-full bg-[#3E2C20] px-6 py-3.5 text-[0.98rem] text-[#F4EFE6]">
              Ver la estación de helado
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-7 md:gap-4">
          <Reveal className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-[2rem] md:col-span-1 md:row-span-2 md:aspect-auto">
            <Image src={shots[0].src} alt={shots[0].alt} fill sizes="(min-width: 768px) 30vw, 92vw" className="object-cover" />
          </Reveal>
          {shots.slice(1).map((s, n) => (
            <Reveal key={s.src} delay={0.08 * (n + 1)} className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
              <Image src={s.src} alt={s.alt} fill sizes="(min-width: 768px) 28vw, 46vw" className="object-cover" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

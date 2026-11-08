import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { MaskLine, Reveal } from "@/components/Reveal";
import { helado } from "@/data/helado";
import { instagramLink, site } from "@/data/site";

export const metadata: Metadata = {
  title: "Estación de helado soft serve",
  description:
    "Alquiler de estación de helado soft serve Fresh Lovers en Panamá: máquina, helado, copas, conos y personal. 75 o 150 helados, toppings opcionales. Para eventos, tiendas y centros comerciales.",
  alternates: { canonical: "/helado" },
  openGraph: { title: "Estación de helado · Fresh Lovers", url: "/helado", images: [{ url: "/helado/carrito.webp", width: 1100, height: 1139 }] },
};

const mail = `mailto:${site.email}?subject=${encodeURIComponent("Reserva estación de helado")}&body=${encodeURIComponent(
  "Hola, quiero reservar la estación de helado.\n\nFecha del evento:\nLugar:\nCantidad de helados (75 o 150):\nSabores:\nToppings:\n",
)}`;

const money = (n: number) => `$${n.toFixed(2)}`;

export default function HeladoPage() {
  return (
    <div className="bg-[#EADFD2] text-[#3E2C20]">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Estación de helado soft serve Fresh Lovers",
          provider: { "@type": "Organization", name: site.legalName, url: site.url },
          areaServed: "Panamá",
          offers: helado.packages.map((p) => ({ "@type": "Offer", name: `${p.name} · ${p.servings} helados`, price: p.price, priceCurrency: "USD" })),
        }}
      />

      {/* hero */}
      <section className="gutter grid gap-10 pb-16 pt-28 md:grid-cols-12 md:items-end md:pb-24 md:pt-36">
        <div className="md:col-span-7">
          <nav aria-label="Ruta" className="kicker mb-8 flex flex-wrap gap-2 text-[0.62rem]">
            <Link href="/" className="hover:underline">
              Inicio
            </Link>
            /<span>Estación de helado</span>
          </nav>
          <h1 className="font-display text-[15vw] leading-[0.86] tracking-[-0.02em] md:text-[7.4vw]">
            <MaskLine>Estación</MaskLine>
            <MaskLine delay={0.08}>
              <em>de helado.</em>
            </MaskLine>
          </h1>
          <Reveal className="mt-8 max-w-lg text-[1.1rem] leading-relaxed">
            Helado soft serve Fresh Lovers para tu evento, tu tienda o tu centro comercial. Llevamos la máquina, el helado, las copas y los
            conos, y una persona que la atiende. Tú solo disfrutas.
          </Reveal>
          <Reveal delay={0.1} className="mt-9 flex flex-wrap gap-3">
            <a href={mail} className="rounded-full bg-[#3E2C20] px-6 py-3.5 text-[0.98rem] text-[#F4EFE6]">
              Reservar por correo
            </a>
            <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#3E2C20]/40 px-6 py-3.5 text-[0.98rem]">
              Escríbenos en Instagram
            </a>
          </Reveal>
        </div>
        <Reveal className="relative aspect-[1100/1139] overflow-hidden rounded-[2rem] md:col-span-5">
          <Image src="/helado/carrito.webp" alt="Carrito de la estación de helado Fresh Lovers" fill priority sizes="(min-width: 768px) 40vw, 92vw" className="object-cover" />
        </Reveal>
      </section>

      {/* packages */}
      <section aria-labelledby="paquetes" className="gutter border-t border-[#3E2C20]/20 py-16 md:py-24">
        <h2 id="paquetes" className="font-display text-[11vw] leading-[0.9] md:text-[4.4vw]">
          Elige tu <em>máquina</em>
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {helado.packages.map((p, n) => (
            <Reveal key={p.name} delay={n * 0.08} className="rounded-[2rem] bg-[#F4EFE6] p-7 md:p-9">
              <p className="kicker">{p.servings} helados</p>
              <div className="mt-3 flex items-baseline justify-between gap-4">
                <h3 className="font-display text-[2.2rem] italic leading-none md:text-[2.8rem]">{p.name}</h3>
                <p className="font-display text-[2rem] leading-none md:text-[2.4rem]">{money(p.price)}</p>
              </div>
              <ul className="mt-6 space-y-2 border-t border-[#3E2C20]/20 pt-5 text-[1rem]">
                {p.includes.map((x) => (
                  <li key={x} className="flex gap-3">
                    <span aria-hidden="true">·</span>
                    {x}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-[0.95rem]">
          Sabores: {helado.flavours.join(", ").toLowerCase().replace(/, (?=[^,]*$)/, " y ")}. Helado {helado.kashrut}. Podemos adaptar los planes a lo que necesites.
        </p>
      </section>

      {/* extras + menu */}
      <section aria-labelledby="extras" className="gutter grid gap-14 border-t border-[#3E2C20]/20 py-16 md:grid-cols-12 md:py-24">
        <div className="md:col-span-7">
          <h2 id="extras" className="font-display text-[11vw] leading-[0.9] md:text-[4.4vw]">
            Toppings <em>y extras</em>
          </h2>
          <ul className="mt-8">
            {helado.extras.map((x) => (
              <li key={x.name} className="flex items-baseline justify-between gap-6 border-b border-[#3E2C20]/20 py-4">
                <div>
                  <p className="text-[1.08rem]">{x.name}</p>
                  <p className="mt-0.5 text-[0.92rem] opacity-85">{x.detail}</p>
                </div>
                <p className="font-display shrink-0 text-[1.4rem]">{money(x.price)}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-4 md:col-start-9">
          <h2 className="font-display text-[11vw] leading-[0.9] md:text-[3vw]">
            Qué <em>servimos</em>
          </h2>
          <ul className="mt-8 space-y-4">
            {helado.menu.map((m) => (
              <li key={m.name}>
                <p className="font-display text-[1.5rem] italic leading-tight">{m.name}</p>
                <p className="text-[0.95rem] opacity-85">{m.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* photos + occasions */}
      <section aria-labelledby="ocasiones" className="gutter grid gap-10 border-t border-[#3E2C20]/20 py-16 md:grid-cols-12 md:py-24">
        <div className="grid grid-cols-2 gap-4 md:col-span-6">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
            <Image src="/helado/maquina.webp" alt="Máquina de helado soft serve sobre su mueble" fill sizes="(min-width: 768px) 24vw, 46vw" className="object-cover" />
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
            <Image src="/helado/activacion.webp" alt="Helado soft serve servido en una activación de tienda" fill sizes="(min-width: 768px) 24vw, 46vw" className="object-cover" />
          </div>
        </div>
        <div className="md:col-span-5 md:col-start-8">
          <h2 id="ocasiones" className="font-display text-[11vw] leading-[0.9] md:text-[4vw]">
            Para <em>cualquier ocasión</em>
          </h2>
          <ul className="mt-8 flex flex-wrap gap-2">
            {helado.occasions.map((o) => (
              <li key={o} className="rounded-full border border-[#3E2C20]/35 px-4 py-2 text-[0.95rem]">
                {o}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-md text-[1rem] leading-relaxed">
            En tiendas y centros comerciales, la estación atrae a los clientes y hace que se queden más tiempo. Podemos rotular el mueble, la
            máquina y las copas con tu marca.
          </p>
        </div>
      </section>

      {/* how to book */}
      <section aria-labelledby="reservar" className="bg-[#3E2C20] text-[#F4EFE6]">
        <div className="gutter grid gap-10 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-6">
            <h2 id="reservar" className="font-display text-[12vw] leading-[0.9] md:text-[5vw]">
              Reserva <em>tu fecha.</em>
            </h2>
            <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed">
              Escríbenos con la fecha, el lugar y cuántos helados necesitas, y te enviamos la cotización.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={mail} className="rounded-full bg-[#F4EFE6] px-6 py-3.5 text-[0.98rem] text-[#3E2C20]">
                {site.email}
              </a>
              <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#F4EFE6]/50 px-6 py-3.5 text-[0.98rem]">
                @{site.instagram}
              </a>
            </div>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <p className="kicker">Antes del evento</p>
            <ul className="mt-5 space-y-4 text-[1rem] leading-relaxed">
              {helado.requirements.map((r) => (
                <li key={r} className="border-b border-[#F4EFE6]/25 pb-4">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { photos, type PhotoKey } from "@/data/photos";

const GOLD = "#D6B46A";
const INK = "#16120D";
const CREAM = "#F4EDE0";

const shots: { photo: PhotoKey; alt: string; className: string }[] = [
  { photo: "studio-arepa-maiz-con-queso", alt: "Arepas de queso", className: "left-[4%] top-[6%] w-[46%] -rotate-[7deg]" },
  { photo: "studio-queso-prensado", alt: "Queso prensado", className: "right-[2%] top-0 w-[42%] rotate-[6deg]" },
  { photo: "studio-sopas", alt: "Sopas congeladas", className: "left-[26%] bottom-0 w-[44%] rotate-[2deg]" },
];

/** circular "Limited edition" stamp */
function Stamp({ className = "" }: { className?: string }) {
  const text = "LIMITED EDITION · SOLO PARA PESAJ · LIMITED EDITION · SOLO PARA PESAJ · ";
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="h-full w-full motion-safe:animate-[spin_22s_linear_infinite]">
        <defs>
          <path id="pesaj-stamp-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <circle cx="100" cy="100" r="98" fill={GOLD} />
        <circle cx="100" cy="100" r="62" fill="none" stroke={INK} strokeWidth="1.5" />
        <text fill={INK} fontSize="15.5" fontWeight="600" letterSpacing="3.2" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
          <textPath href="#pesaj-stamp-circle">{text}</textPath>
        </text>
      </svg>
      <span
        className="font-display absolute inset-0 grid place-items-center text-center italic leading-[0.95]"
        style={{ color: INK, fontSize: "clamp(1.1rem, 2.4vw, 1.9rem)" }}
      >
        Pesaj
      </span>
    </div>
  );
}

function Marquee() {
  const row = "Limited edition ✦ Pesaj ✦ Pedidos por WhatsApp ✦ Entregas 15 y 22 de marzo ✦ ";
  return (
    <div className="overflow-hidden border-y py-3" style={{ borderColor: `${GOLD}55`, color: GOLD }} aria-hidden="true">
      <div className="kicker flex w-max whitespace-nowrap text-[0.78rem] motion-safe:animate-[pesaj-marquee_28s_linear_infinite]">
        <span className="pr-4">{row.repeat(4)}</span>
        <span className="pr-4">{row.repeat(4)}</span>
      </div>
    </div>
  );
}

/**
 * Big Pesaj poster. On the home page it links to /pesaj; on /pesaj it is the hero
 * and points down to the order form.
 */
export function PesajPoster({ hero = false }: { hero?: boolean }) {
  const Title = hero ? "h1" : "h2";
  return (
    <section
      aria-labelledby="pesaj-poster-title"
      className="relative overflow-hidden"
      style={{ backgroundColor: INK, color: CREAM }}
    >
      {/* soft gold glow */}
      <div
        className="pointer-events-none absolute -right-[20%] -top-[30%] h-[90%] w-[80%] rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, ${GOLD}66, transparent 65%)` }}
        aria-hidden="true"
      />
      <Marquee />

      <div className="gutter relative grid items-center gap-12 py-16 md:grid-cols-12 md:py-24">
        <div className="relative md:col-span-6">
          <p className="kicker flex items-center gap-3" style={{ color: GOLD }}>
            <span className="inline-block h-px w-10" style={{ backgroundColor: GOLD }} />
            Limited edition
          </p>
          <Title id="pesaj-poster-title" className="font-display mt-6 leading-[0.8] tracking-[-0.02em]">
            <span className="block text-[26vw] md:text-[12.5vw]" style={{ color: GOLD }}>
              Pesaj
            </span>
            <em className="-mt-[0.12em] block pl-[28%] text-[12vw] md:text-[5.2vw]">edition</em>
          </Title>
          <p className="mt-8 max-w-md text-[1.1rem] leading-relaxed opacity-90">
            Quesos, arepas sin kitniot, sopas, yogurt Jalav Israel, arroz revisado y más. Solo por temporada: arma tu pedido y te lo llevamos
            las semanas del 15 y 22 de marzo.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href={hero ? "#pedido" : "/pesaj"}
              className="inline-flex h-14 items-center rounded-full px-8 text-[1.02rem] font-medium transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: GOLD, color: INK }}
            >
              {hero ? "Armar mi pedido" : "Ver menú de Pesaj"}
            </Link>
            <span className="text-[0.92rem] opacity-75">Pedidos por WhatsApp · Delivery $3.00</span>
          </div>
        </div>

        <div className="relative aspect-square w-full md:col-span-6">
          {shots.map((s, i) => (
            <div
              key={s.photo}
              className={`absolute aspect-[4/5] overflow-hidden rounded-[1.5rem] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ${s.className}`}
              style={{ ["--tw-ring-color" as string]: `${GOLD}66` }}
            >
              <Image src={photos[s.photo].src} alt={s.alt} fill sizes="(min-width: 768px) 22vw, 45vw" className="object-cover" priority={hero && i === 0} />
            </div>
          ))}
          <Stamp className="absolute -left-2 bottom-[8%] h-[30%] w-[30%] md:-left-6" />
        </div>
      </div>

      {!hero && <Marquee />}
    </section>
  );
}

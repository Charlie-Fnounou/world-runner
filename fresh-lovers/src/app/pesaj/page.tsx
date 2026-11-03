import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PesajOrder } from "@/components/pesaj/PesajOrder";
import { pesaj } from "@/data/pesaj";

export const metadata: Metadata = {
  title: "Pedidos de Pesaj",
  description:
    "Menú de Pesaj de Fresh Lovers: quesos, arepas sin kitniot, sopas, yogurt, arroz revisado, café y más. Arma tu pedido y envíalo por WhatsApp. Delivery $3.00.",
  alternates: { canonical: "/pesaj" },
  openGraph: { title: "Pesaj · Fresh Lovers", url: "/pesaj", images: [{ url: "/studio/arepa-maiz-con-queso.webp", width: 1200, height: 1500 }] },
};

export default function PesajPage() {
  return (
    <div className="bg-[#EFE9DC] text-[#3A3226]">
      <section className="gutter relative grid gap-10 pb-14 pt-28 md:grid-cols-12 md:items-end md:pb-20 md:pt-36">
        <p className="absolute right-[var(--gutter)] top-24 text-[1.1rem] md:top-28" dir="rtl" lang="he">
          בס״ד
        </p>
        <div className="md:col-span-7">
          <nav aria-label="Ruta" className="kicker mb-8 flex flex-wrap gap-2 text-[0.62rem]">
            <Link href="/" className="hover:underline">
              Inicio
            </Link>
            /<span>Pesaj</span>
          </nav>
          <h1 className="font-display leading-[0.82] tracking-[-0.02em]">
            <span className="block text-[24vw] text-[#C2A866] md:text-[11vw]">Pesaj</span>
            <em className="-mt-[0.15em] block pl-[30%] text-[11vw] md:text-[4.6vw]">edition</em>
          </h1>
          <p className="mt-8 max-w-lg text-[1.08rem] leading-relaxed">
            Arma tu pedido de Pesaj y envíalo por WhatsApp a {pesaj.contact}. Tendremos entrega las semanas del 15 y 22 de marzo, para su
            preferencia. Delivery $3.00.
          </p>
          <p className="mt-4 text-[0.95rem]">
            Pedidos al <span className="font-semibold tabular-nums">{pesaj.phoneDisplay}</span>
          </p>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] md:col-span-4 md:col-start-9">
          <Image src="/studio/arepa-maiz-con-queso.webp" alt="Arepas de queso Fresh Lovers" fill priority sizes="(min-width: 768px) 30vw, 92vw" className="object-cover" />
        </div>
      </section>

      <PesajOrder />
    </div>
  );
}

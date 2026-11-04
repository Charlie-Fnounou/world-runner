import type { Metadata } from "next";
import Link from "next/link";
import { PesajOrder } from "@/components/pesaj/PesajOrder";
import { PesajPoster } from "@/components/pesaj/PesajPoster";
import { pesaj } from "@/data/pesaj";

export const metadata: Metadata = {
  title: "Pesaj · Limited edition",
  description:
    "Menú de Pesaj de Fresh Lovers, edición limitada: quesos, arepas sin kitniot, sopas, yogurt, arroz revisado, café y más. Arma tu pedido y envíalo por WhatsApp. Delivery $3.00.",
  alternates: { canonical: "/pesaj" },
  openGraph: { title: "Pesaj · Limited edition · Fresh Lovers", url: "/pesaj", images: [{ url: "/studio/arepa-maiz-con-queso.webp", width: 1200, height: 1500 }] },
};

export default function PesajPage() {
  return (
    <div className="bg-[#EFE9DC] text-[#3A3226]">
      <div className="gutter flex items-center justify-between pb-6 pt-24 md:pt-28">
        <nav aria-label="Ruta" className="kicker flex flex-wrap gap-2 text-[0.62rem]">
          <Link href="/" className="hover:underline">
            Inicio
          </Link>
          /<span>Pesaj</span>
        </nav>
        <p className="text-[1.1rem]" dir="rtl" lang="he">
          בס״ד
        </p>
      </div>

      <PesajPoster hero />

      <div className="gutter flex flex-wrap items-baseline justify-between gap-4 pb-8 pt-14 md:pt-20">
        <h2 className="font-display text-[11vw] leading-[0.9] md:text-[4.4vw]">
          Arma tu <em>pedido</em>
        </h2>
        <p className="text-[0.95rem]">
          Pedidos al <span className="font-semibold tabular-nums">{pesaj.phoneDisplay}</span> · {pesaj.contact}
        </p>
      </div>
      <PesajOrder />
    </div>
  );
}

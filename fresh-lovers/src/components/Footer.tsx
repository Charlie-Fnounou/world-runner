import Link from "next/link";
import { categories } from "@/data/catalog";
import { instagramLink, site, whatsappLink } from "@/data/site";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink text-paper">
      <div className="gutter grid gap-12 pb-10 pt-20 md:grid-cols-12 md:pt-28">
        <div className="md:col-span-5">
          <p className="font-display max-w-md text-3xl leading-tight md:text-4xl">
            Yogurt, quesos, labne y arepas. <em>Calidad y sabor.</em>
          </p>
        </div>
        <nav aria-label="Categorías" className="md:col-span-3">
          <p className="kicker mb-5 text-paper/50">Productos</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-[0.95rem] text-paper/85 md:grid-cols-1">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/productos?c=${c.slug}`} className="hover:text-paper hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-4">
          <p className="kicker mb-5 text-paper/50">Contacto</p>
          <ul className="space-y-2 text-[0.95rem] text-paper/85">
            <li>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="hover:underline">
                WhatsApp {site.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="hover:underline">
                {site.email}
              </a>
            </li>
            <li>
              <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                Instagram @{site.instagram}
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* oversized wordmark, cropped by the page edge */}
      <div aria-hidden="true" className="pointer-events-none select-none">
        <p className="font-display gutter whitespace-nowrap text-[17.5vw] leading-[0.78] tracking-[-0.02em] text-paper">
          Fresh <em className="text-paper/90">lovers</em>
        </p>
      </div>

      <div className="gutter flex flex-col gap-2 border-t border-paper/10 py-6 pb-24 text-xs text-paper/50 md:flex-row md:items-center md:justify-between md:pb-6">
        <p>
          © {new Date().getFullYear()} {site.legalName} · {site.plant.line1}, {site.plant.line2}
        </p>
        <p>Kashrut bajo supervisión de {site.kashrut} · בס״ד</p>
      </div>
    </footer>
  );
}

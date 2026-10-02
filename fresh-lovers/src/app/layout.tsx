import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { site } from "@/data/site";
import { Header } from "@/components/Header";
import { MobileBar } from "@/components/MobileBar";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";

const display = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Fresh Lovers Panamá — Yogurt, quesos, labne, arepas y café",
    template: "%s · Fresh Lovers Panamá",
  },
  description:
    "Yogurt griego, quesos frescos, labne, arepas, granola y café artesanal hechos en La Chorrera, Panamá, desde 2018. Productos kosher bajo supervisión de Shevet Ahim.",
  applicationName: "Fresh Lovers",
  keywords: ["Fresh Lovers", "yogurt griego Panamá", "labne", "quesos frescos", "arepas", "kosher Panamá", "Jalav Israel"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_PA",
    siteName: "Fresh Lovers Panamá",
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f4efe6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-PA" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Saltar al contenido
        </a>
        <Providers>
          <SmoothScroll />
          <Header />
          <main id="contenido">{children}</main>
          <Footer />
          <MobileBar />
        </Providers>
      </body>
    </html>
  );
}

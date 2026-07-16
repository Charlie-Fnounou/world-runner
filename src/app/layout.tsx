import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { TrackerVisitas } from "@/components/TrackerVisitas";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "The World Runner — Toda carrera. Todo el planeta.",
    template: "%s · The World Runner",
  },
  description:
    "Miles de maratones, medias maratones, 10K, trails y ultras verificadas en más de 70 países. Descubre, compara y planifica tu próxima carrera con links de inscripción oficiales.",
  metadataBase: new URL("https://theworldrunner.com"),
  openGraph: {
    title: "The World Runner",
    description: "Miles de carreras de running verificadas en más de 70 países. Descubre, compara y planifica tu próxima carrera.",
    type: "website",
    images: ["/brand/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/og-image.png"],
  },
  verification: {
    google: "-GJMfg4_nwEkp1tZEyc3JvQTw4HTHphYvy7Dl9YneKE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      {adsenseClientId && (
        <head>
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        </head>
      )}
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TrackerVisitas />
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}

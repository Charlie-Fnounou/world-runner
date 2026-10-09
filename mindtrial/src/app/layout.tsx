import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000"),
  ),
  title: { default: "MINDTRIAL — games, experiments & party chaos", template: "%s · MINDTRIAL" },
  description:
    "An arcade, a museum and an intelligence playground. Free browser games, brain challenges, physics toys and local multiplayer party games. No sign-up.",
  applicationName: "MINDTRIAL",
  keywords: ["browser games", "brain games", "local multiplayer", "party games", "physics sandbox", "reaction test", "memory game"],
  openGraph: {
    title: "MINDTRIAL — games, experiments & party chaos",
    description: "12 free browser games: physics toys, brain challenges and 1–4 player party games. No sign-up.",
    type: "website",
    siteName: "MINDTRIAL",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MINDTRIAL — games, experiments & party chaos",
    description: "12 free browser games: physics toys, brain challenges and 1–4 player party games. No sign-up.",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3eee3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}

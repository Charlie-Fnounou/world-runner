import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Buscadores, redes sociales e IA que sí ejecutan JavaScript (por eso
// no alcanza con que el tracker sea del lado del cliente) y por lo
// tanto disparaban TrackerVisitas como si fueran una visita real.
const PATRON_BOTS =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview|headless|lighthouse|pingdom|uptimerobot|semrush|ahrefs|mj12|dotbot|blexbot|petalbot|bytespider|gptbot|chatgpt-user|claudebot|claude-web|anthropic-ai|ccbot|perplexitybot|amazonbot|diffbot|applebot/i;

export async function POST(request: Request) {
  const { ruta } = await request.json().catch(() => ({ ruta: null }));
  if (typeof ruta !== "string" || !ruta) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (PATRON_BOTS.test(userAgent)) {
    return NextResponse.json({ ok: true, descartado: "bot" });
  }

  await prisma.visitaPagina.create({ data: { ruta: ruta.slice(0, 300) } });
  return NextResponse.json({ ok: true });
}

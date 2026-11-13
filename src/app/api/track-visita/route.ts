import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ipDe, permitir } from "@/lib/limite";

// Buscadores, redes sociales e IA que sí ejecutan JavaScript (por eso
// no alcanza con que el tracker sea del lado del cliente) y por lo
// tanto disparaban TrackerVisitas como si fueran una visita real.
const PATRON_BOTS =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview|headless|lighthouse|pingdom|uptimerobot|semrush|ahrefs|mj12|dotbot|blexbot|petalbot|bytespider|gptbot|chatgpt-user|claudebot|claude-web|anthropic-ai|ccbot|perplexitybot|amazonbot|diffbot|applebot/i;

export async function POST(request: Request) {
  const { ruta } = await request.json().catch(() => ({ ruta: null }));
  if (typeof ruta !== "string" || !ruta.startsWith("/") || ruta.length > 300) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Ruta pública que escribe en la base: sin límite, un script podía
  // llenar la tabla (y gastar la cuota de Supabase) en minutos.
  if (!permitir(`visita:${ipDe(request.headers)}`, 60, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (PATRON_BOTS.test(userAgent)) {
    return NextResponse.json({ ok: true, descartado: "bot" });
  }

  await prisma.visitaPagina.create({ data: { ruta: ruta.split("?")[0] } });
  return NextResponse.json({ ok: true });
}

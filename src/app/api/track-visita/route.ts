import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { ruta } = await request.json().catch(() => ({ ruta: null }));
  if (typeof ruta !== "string" || !ruta) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await prisma.visitaPagina.create({ data: { ruta: ruta.slice(0, 300) } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { correrCollectorRunSignup } from "@/lib/collectors/runsignup";
import { correrCollectorFidal } from "@/lib/collectors/fidal";
import { correrCollectorCorro } from "@/lib/collectors/corro";

// Los collectors pueden tardar varios minutos (cientos de carreras, una
// consulta a la base de datos por cada una). Se le da el máximo de
// tiempo que permite Vercel para funciones de cron.
export const maxDuration = 300;

// Vercel Cron llama esta ruta una vez por semana (ver vercel.json).
// Protegida con CRON_SECRET para que nadie más la pueda disparar.
// Cada collector va en su propio try/catch: si uno falla, no tumba a
// los demás.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultados: Record<string, unknown> = {};

  try {
    resultados.runsignup = await correrCollectorRunSignup();
  } catch (e) {
    resultados.runsignup = { error: e instanceof Error ? e.message : "error desconocido" };
  }

  try {
    resultados.fidal = await correrCollectorFidal();
  } catch (e) {
    resultados.fidal = { error: e instanceof Error ? e.message : "error desconocido" };
  }

  try {
    resultados.corro = await correrCollectorCorro();
  } catch (e) {
    resultados.corro = { error: e instanceof Error ? e.message : "error desconocido" };
  }

  return NextResponse.json(resultados);
}

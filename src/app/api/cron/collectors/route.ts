import { NextResponse } from "next/server";
import { correrCollectorRunSignup } from "@/lib/collectors/runsignup";

// Vercel Cron llama esta ruta una vez por semana (ver vercel.json).
// Protegida con CRON_SECRET para que nadie más la pueda disparar.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultados: Record<string, unknown> = {};

  if (process.env.RUNSIGNUP_API_KEY && process.env.RUNSIGNUP_API_SECRET) {
    try {
      resultados.runsignup = await correrCollectorRunSignup();
    } catch (e) {
      resultados.runsignup = { error: e instanceof Error ? e.message : "error desconocido" };
    }
  } else {
    resultados.runsignup = { omitido: "faltan credenciales RUNSIGNUP_API_KEY/SECRET" };
  }

  return NextResponse.json(resultados);
}

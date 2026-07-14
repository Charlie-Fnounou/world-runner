import { NextResponse } from "next/server";
import { correrCollectorRunSignup } from "@/lib/collectors/runsignup";
import { correrCollectorFidal } from "@/lib/collectors/fidal";
import { correrCollectorCorro } from "@/lib/collectors/corro";
import { correrCollectorRunchile } from "@/lib/collectors/runchile";
import { correrCollectorRunRunners } from "@/lib/collectors/runrunners";
import { correrCollectorKms } from "@/lib/collectors/kms";
import { correrCollectorTim3 } from "@/lib/collectors/tim3";
import { correrCollectorChiptiming } from "@/lib/collectors/chiptiming";
import { correrCollectorAbuenpaso } from "@/lib/collectors/abuenpaso";
import { correrCollectorMaratonGuate } from "@/lib/collectors/maratonguate";
import { correrCollectorProdeporte } from "@/lib/collectors/prodeporte";
import { correrCollectorAsuncionRunners } from "@/lib/collectors/asuncionrunners";
import { correrCollectorRunnerBo } from "@/lib/collectors/runnerbo";
import { correrCollectorTimingEcuador } from "@/lib/collectors/timingecuador";
import { correrCollectorHipereventos } from "@/lib/collectors/hipereventos";
import { correrCollectorSdcTickets } from "@/lib/collectors/sdctickets";
import { correrCollectorMinhasInscricoes } from "@/lib/collectors/minhasinscricoes";
import { correrCollectorLaufen } from "@/lib/collectors/laufen";
import { correrCollectorInschrijven } from "@/lib/collectors/inschrijven";

// Los collectors pueden tardar varios minutos (cientos de carreras, una
// consulta a la base de datos por cada una). Se le da el máximo de
// tiempo que permite Vercel para funciones de cron.
export const maxDuration = 300;

// Cada collector corre de forma independiente: si uno falla, no tumba
// a los demás.
const COLLECTORES: { clave: string; correr: () => Promise<{ nuevas: number; actualizadas: number; errores: number }> }[] = [
  { clave: "runsignup", correr: correrCollectorRunSignup }, // EE. UU. / Canadá
  { clave: "fidal", correr: correrCollectorFidal }, // Italia
  { clave: "corro", correr: correrCollectorCorro }, // Argentina
  { clave: "runchile", correr: correrCollectorRunchile }, // Chile
  { clave: "runrunners", correr: correrCollectorRunRunners }, // Colombia
  { clave: "kms", correr: correrCollectorKms }, // Francia
  { clave: "tim3", correr: correrCollectorTim3 }, // México (regional)
  { clave: "chiptiming", correr: correrCollectorChiptiming }, // Perú
  { clave: "abuenpaso", correr: correrCollectorAbuenpaso }, // Costa Rica
  { clave: "maratonguate", correr: correrCollectorMaratonGuate }, // Guatemala
  { clave: "prodeporte", correr: correrCollectorProdeporte }, // Uruguay
  { clave: "asuncionrunners", correr: correrCollectorAsuncionRunners }, // Paraguay
  { clave: "runnerbo", correr: correrCollectorRunnerBo }, // Bolivia
  { clave: "timingecuador", correr: correrCollectorTimingEcuador }, // Ecuador
  { clave: "hipereventos", correr: correrCollectorHipereventos }, // Venezuela (sitio sin eventos futuros por ahora)
  { clave: "sdctickets", correr: correrCollectorSdcTickets }, // República Dominicana
  { clave: "minhasinscricoes", correr: correrCollectorMinhasInscricoes }, // Brasil
  { clave: "laufen", correr: correrCollectorLaufen }, // Alemania
  { clave: "inschrijven", correr: correrCollectorInschrijven }, // Países Bajos
];

// Vercel Cron llama esta ruta una vez por semana (ver vercel.json).
// Protegida con CRON_SECRET para que nadie más la pueda disparar.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultados: Record<string, unknown> = {};

  for (const { clave, correr } of COLLECTORES) {
    try {
      resultados[clave] = await correr();
    } catch (e) {
      resultados[clave] = { error: e instanceof Error ? e.message : "error desconocido" };
    }
  }

  return NextResponse.json(resultados);
}

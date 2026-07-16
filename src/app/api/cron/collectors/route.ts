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
import { correrCollectorInschrijvenBe } from "@/lib/collectors/inschrijven-be";
import { correrCollectorEpa } from "@/lib/collectors/epa";
import { correrCollectorRecordePessoal } from "@/lib/collectors/recordepessoal";
import { correrCollectorRunnetJp } from "@/lib/collectors/runnet-jp";
import { correrCollectorEthiopianRun } from "@/lib/collectors/ethiopianrun";
import { correrCollectorTheTriFactory } from "@/lib/collectors/thetrifactory";
import { correrCollectorMarrakechMarathon } from "@/lib/collectors/marrakechmarathon";
import { correrCollectorLagosCityMarathon } from "@/lib/collectors/lagoscitymarathon";
import { correrCollectorRunRio } from "@/lib/collectors/runrio";
import { correrCollectorAimsId } from "@/lib/collectors/aims-id";
import { correrCollectorAimsTh } from "@/lib/collectors/aims-th";
import { correrCollectorAimsVn } from "@/lib/collectors/aims-vn";
import { correrCollectorAimsSg } from "@/lib/collectors/aims-sg";
import { correrCollectorKosuTaf } from "@/lib/collectors/kosutaf";
import { correrCollectorIaaIsrael } from "@/lib/collectors/iaaisrael";
import { correrCollectorPremierOnlineAe } from "@/lib/collectors/premieronlineae";
import { correrCollectorProbeg } from "@/lib/collectors/probeg";
import { correrCollectorVsiprobihy } from "@/lib/collectors/vsiprobihy";
import { correrCollectorRunIndia } from "@/lib/collectors/runindia";
import { correrCollectorRunnet } from "@/lib/collectors/runnet";

// Los collectors pueden tardar varios minutos (cientos de carreras, una
// consulta a la base de datos por cada una). Se le da el máximo de
// tiempo que permite Vercel para funciones de cron.
export const maxDuration = 300;

type Frecuencia = "diaria" | "semanal";

// El plan gratis de Vercel solo permite disparar el cron 1 vez por día
// (no cada 1-3h como sería ideal). Para igual darle prioridad a las
// fuentes más grandes/con más movimiento real, se dividen en dos grupos:
// "diaria" corre TODOS los días, "semanal" rota entre los 7 días de la
// semana (cada una le toca 1 vez por semana, pero repartidas en vez de
// todas juntas el mismo día como antes).
const COLLECTORES: {
  clave: string;
  correr: () => Promise<{ nuevas: number; actualizadas: number; errores: number }>;
  frecuencia: Frecuencia;
}[] = [
  { clave: "runsignup", correr: correrCollectorRunSignup, frecuencia: "diaria" }, // EE. UU. / Canadá — el más grande, con más movimiento real
  { clave: "laufen", correr: correrCollectorLaufen, frecuencia: "diaria" }, // Alemania
  { clave: "inschrijven", correr: correrCollectorInschrijven, frecuencia: "diaria" }, // Países Bajos
  { clave: "minhasinscricoes", correr: correrCollectorMinhasInscricoes, frecuencia: "diaria" }, // Brasil
  { clave: "fidal", correr: correrCollectorFidal, frecuencia: "semanal" }, // Italia
  { clave: "corro", correr: correrCollectorCorro, frecuencia: "semanal" }, // Argentina
  { clave: "runchile", correr: correrCollectorRunchile, frecuencia: "semanal" }, // Chile
  { clave: "runrunners", correr: correrCollectorRunRunners, frecuencia: "semanal" }, // Colombia
  { clave: "kms", correr: correrCollectorKms, frecuencia: "semanal" }, // Francia
  { clave: "tim3", correr: correrCollectorTim3, frecuencia: "semanal" }, // México (regional)
  { clave: "chiptiming", correr: correrCollectorChiptiming, frecuencia: "semanal" }, // Perú
  { clave: "abuenpaso", correr: correrCollectorAbuenpaso, frecuencia: "semanal" }, // Costa Rica
  { clave: "maratonguate", correr: correrCollectorMaratonGuate, frecuencia: "semanal" }, // Guatemala
  { clave: "prodeporte", correr: correrCollectorProdeporte, frecuencia: "semanal" }, // Uruguay
  { clave: "asuncionrunners", correr: correrCollectorAsuncionRunners, frecuencia: "semanal" }, // Paraguay
  { clave: "runnerbo", correr: correrCollectorRunnerBo, frecuencia: "semanal" }, // Bolivia
  { clave: "timingecuador", correr: correrCollectorTimingEcuador, frecuencia: "semanal" }, // Ecuador
  { clave: "hipereventos", correr: correrCollectorHipereventos, frecuencia: "semanal" }, // Venezuela (sitio sin eventos futuros por ahora)
  { clave: "sdctickets", correr: correrCollectorSdcTickets, frecuencia: "semanal" }, // República Dominicana
  { clave: "inschrijven-be", correr: correrCollectorInschrijvenBe, frecuencia: "semanal" }, // Bélgica
  { clave: "epa", correr: correrCollectorEpa, frecuencia: "semanal" }, // Sudáfrica (regional)
  { clave: "recordepessoal", correr: correrCollectorRecordePessoal, frecuencia: "semanal" }, // Portugal
  { clave: "runnet-jp", correr: correrCollectorRunnetJp, frecuencia: "semanal" }, // Japón
  { clave: "ethiopianrun", correr: correrCollectorEthiopianRun, frecuencia: "semanal" }, // Etiopía
  { clave: "thetrifactory", correr: correrCollectorTheTriFactory, frecuencia: "semanal" }, // Egipto
  { clave: "marrakechmarathon", correr: correrCollectorMarrakechMarathon, frecuencia: "semanal" }, // Marruecos
  { clave: "lagoscitymarathon", correr: correrCollectorLagosCityMarathon, frecuencia: "semanal" }, // Nigeria
  { clave: "runrio", correr: correrCollectorRunRio, frecuencia: "semanal" }, // Filipinas
  { clave: "aims-id", correr: correrCollectorAimsId, frecuencia: "semanal" }, // Indonesia
  { clave: "aims-th", correr: correrCollectorAimsTh, frecuencia: "semanal" }, // Tailandia
  { clave: "aims-vn", correr: correrCollectorAimsVn, frecuencia: "semanal" }, // Vietnam
  { clave: "aims-sg", correr: correrCollectorAimsSg, frecuencia: "semanal" }, // Singapur
  { clave: "kosutaf", correr: correrCollectorKosuTaf, frecuencia: "semanal" }, // Turquía
  { clave: "iaaisrael", correr: correrCollectorIaaIsrael, frecuencia: "semanal" }, // Israel
  { clave: "premieronlineae", correr: correrCollectorPremierOnlineAe, frecuencia: "semanal" }, // Emiratos Árabes Unidos
  { clave: "probeg", correr: correrCollectorProbeg, frecuencia: "semanal" }, // Rusia
  { clave: "vsiprobihy", correr: correrCollectorVsiprobihy, frecuencia: "semanal" }, // Ucrania
  { clave: "runindia", correr: correrCollectorRunIndia, frecuencia: "semanal" }, // India
  { clave: "runnet", correr: correrCollectorRunnet, frecuencia: "semanal" }, // Japón (fuente 2, RUNNET/RECRUIT)
];

// Reparte los collectors "semanal" entre los 7 días de la semana según su
// posición en la lista, para que no corran todos juntos el mismo día.
function leTocaHoy(indiceEnSemanales: number): boolean {
  const diaSemana = new Date().getDay(); // 0=domingo .. 6=sábado
  return indiceEnSemanales % 7 === diaSemana;
}

// Vercel Cron llama esta ruta una vez por día (ver vercel.json).
// Protegida con CRON_SECRET para que nadie más la pueda disparar.
// Se le puede pasar ?todos=1 para forzar que corran todos sin importar
// la frecuencia (lo usa el botón "Correr ahora" del panel de admin).
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const forzarTodos = new URL(request.url).searchParams.get("todos") === "1";
  const resultados: Record<string, unknown> = {};
  let indiceSemanal = 0;

  for (const { clave, correr, frecuencia } of COLLECTORES) {
    const esSemanal = frecuencia === "semanal";
    const corresponde = forzarTodos || frecuencia === "diaria" || leTocaHoy(indiceSemanal);
    if (esSemanal) indiceSemanal++;
    if (!corresponde) continue;

    try {
      resultados[clave] = await correr();
    } catch (e) {
      resultados[clave] = { error: e instanceof Error ? e.message : "error desconocido" };
    }
  }

  return NextResponse.json(resultados);
}

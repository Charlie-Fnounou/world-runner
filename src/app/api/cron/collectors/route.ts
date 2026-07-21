import { NextResponse } from "next/server";
import { corregirCalidadDeDatos } from "@/lib/sanidad";
import { traducirDescripcionesFaltantes } from "@/lib/traducciones";
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
import { correrCollectorAimsCn } from "@/lib/collectors/aims-cn";
import { correrCollectorAimsKr } from "@/lib/collectors/aims-kr";
import { correrCollectorAimsSa } from "@/lib/collectors/aims-sa";
import { correrCollectorHasHr } from "@/lib/collectors/has-hr";
import { correrCollectorAthleticsLv } from "@/lib/collectors/athletics-lv";
import { correrCollectorEkjlEe } from "@/lib/collectors/ekjl-ee";
import { correrCollectorEqTimingSe } from "@/lib/collectors/eqtiming-se";
import { correrCollectorFutniszep } from "@/lib/collectors/futniszep";
import { correrCollectorKenyanAthlete } from "@/lib/collectors/kenyanathlete";
import { correrCollectorKilpailukalenteri } from "@/lib/collectors/kilpailukalenteri";
import { correrCollectorOelvAthmin } from "@/lib/collectors/oelvathmin";
import { correrCollectorRacetimeRo } from "@/lib/collectors/racetime-ro";
import { correrCollectorAtletikaCz } from "@/lib/collectors/atletikacz";
import { correrCollectorConnectAtletik } from "@/lib/collectors/connect-atletik";
import { correrCollectorAimsCa } from "@/lib/collectors/aims-ca";
import { correrCollectorAimsJm } from "@/lib/collectors/aims-jm";
import { correrCollectorAimsTt } from "@/lib/collectors/aims-tt";
import { correrCollectorAimsBs } from "@/lib/collectors/aims-bs";
import { correrCollectorAimsPa } from "@/lib/collectors/aims-pa";
import { correrCollectorAimsMy } from "@/lib/collectors/aims-my";
import { correrCollectorAimsLk } from "@/lib/collectors/aims-lk";
import { correrCollectorAimsBd } from "@/lib/collectors/aims-bd";
import { correrCollectorAimsNp } from "@/lib/collectors/aims-np";
import { correrCollectorAimGhana } from "@/lib/collectors/aimghana";
import { correrCollectorAimsTz } from "@/lib/collectors/aims-tz";
import { correrCollectorUgandaAthletics } from "@/lib/collectors/ugandaathletics";
import { correrCollectorAimsTn } from "@/lib/collectors/aims-tn";
import { correrCollectorAimsDz } from "@/lib/collectors/aims-dz";
import { correrCollectorCarrerasPanama } from "@/lib/collectors/carreraspanama";
import { correrCollectorRunningCalendarAu } from "@/lib/collectors/runningcalendar-au";
import { correrCollectorRunningCalendarNz } from "@/lib/collectors/runningcalendar-nz";
import { correrCollectorSwissRunning } from "@/lib/collectors/swissrunning";
import { correrCollectorRunEvents } from "@/lib/collectors/runevents";
import { correrCollectorRunningEventsJa } from "@/lib/collectors/runningeventsja";
import { correrCollectorSingletreeLk } from "@/lib/collectors/singletree-lk";
import { correrCollectorFinisherTn } from "@/lib/collectors/finisher-tn";
import { correrCollectorMillenniumMarathonGH } from "@/lib/collectors/millenniummarathon-gh";
import { correrCollectorCrdbBankMarathon } from "@/lib/collectors/crdbbankmarathon";
import { correrCollectorActiveSgSg } from "@/lib/collectors/activesg-sg";
import { correrCollectorNetskraning } from "@/lib/collectors/netskraning";
import { correrCollectorTimingLjubljana } from "@/lib/collectors/timingljubljana";
import { correrCollectorRaceTimingBg } from "@/lib/collectors/racetimingbg";
import { correrCollectorMyRaceRs } from "@/lib/collectors/myrace-rs";
import { correrCollectorKigaliMarathon } from "@/lib/collectors/kigalimarathon";
import { correrCollectorMarathonMn } from "@/lib/collectors/marathonmn";
import { correrCollectorDatasportPl } from "@/lib/collectors/datasportpl";
import { correrCollectorEqTimingNo } from "@/lib/collectors/eqtiming-no";
import { correrCollectorRfea } from "@/lib/collectors/rfea";
import { correrCollectorUltraPanamaTrailSeries } from "@/lib/collectors/ultrapanamatrailseries";

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
  { clave: "aims-cn", correr: correrCollectorAimsCn, frecuencia: "semanal" }, // China
  { clave: "aims-kr", correr: correrCollectorAimsKr, frecuencia: "semanal" }, // Corea del Sur
  { clave: "aims-sa", correr: correrCollectorAimsSa, frecuencia: "semanal" }, // Arabia Saudita
  { clave: "has-hr", correr: correrCollectorHasHr, frecuencia: "semanal" }, // Croacia
  { clave: "athletics-lv", correr: correrCollectorAthleticsLv, frecuencia: "semanal" }, // Letonia
  { clave: "ekjl-ee", correr: correrCollectorEkjlEe, frecuencia: "semanal" }, // Estonia
  { clave: "atletikacz", correr: correrCollectorAtletikaCz, frecuencia: "semanal" }, // República Checa
  { clave: "connect-atletik", correr: correrCollectorConnectAtletik, frecuencia: "semanal" }, // Dinamarca
  { clave: "aims-ca", correr: correrCollectorAimsCa, frecuencia: "semanal" }, // Canadá
  { clave: "aims-jm", correr: correrCollectorAimsJm, frecuencia: "semanal" }, // Jamaica
  { clave: "aims-tt", correr: correrCollectorAimsTt, frecuencia: "semanal" }, // Trinidad y Tobago
  { clave: "aims-bs", correr: correrCollectorAimsBs, frecuencia: "semanal" }, // Bahamas
  { clave: "aims-pa", correr: correrCollectorAimsPa, frecuencia: "semanal" }, // Panamá
  { clave: "carreraspanama", correr: correrCollectorCarrerasPanama, frecuencia: "semanal" }, // Panamá (fuente 2, plataforma local de inscripciones)
  { clave: "runningcalendar-au", correr: correrCollectorRunningCalendarAu, frecuencia: "semanal" }, // Australia
  { clave: "runningcalendar-nz", correr: correrCollectorRunningCalendarNz, frecuencia: "semanal" }, // Nueva Zelanda
  { clave: "swissrunning", correr: correrCollectorSwissRunning, frecuencia: "semanal" }, // Suiza
  { clave: "runevents", correr: correrCollectorRunEvents, frecuencia: "semanal" }, // Reino Unido
  { clave: "runningeventsja", correr: correrCollectorRunningEventsJa, frecuencia: "semanal" }, // Jamaica (fuente 2)
  { clave: "singletree-lk", correr: correrCollectorSingletreeLk, frecuencia: "semanal" }, // Sri Lanka (fuente 2)
  { clave: "finisher-tn", correr: correrCollectorFinisherTn, frecuencia: "semanal" }, // Túnez (fuente 2)
  { clave: "millenniummarathon-gh", correr: correrCollectorMillenniumMarathonGH, frecuencia: "semanal" }, // Ghana (fuente 2)
  { clave: "crdbbankmarathon", correr: correrCollectorCrdbBankMarathon, frecuencia: "semanal" }, // Tanzania (fuente 2)
  { clave: "activesg-sg", correr: correrCollectorActiveSgSg, frecuencia: "semanal" }, // Singapur (fuente 2)
  { clave: "netskraning", correr: correrCollectorNetskraning, frecuencia: "semanal" }, // Islandia
  { clave: "timingljubljana", correr: correrCollectorTimingLjubljana, frecuencia: "semanal" }, // Eslovenia
  { clave: "racetimingbg", correr: correrCollectorRaceTimingBg, frecuencia: "semanal" }, // Bulgaria
  { clave: "myrace-rs", correr: correrCollectorMyRaceRs, frecuencia: "semanal" }, // Serbia
  { clave: "kigalimarathon", correr: correrCollectorKigaliMarathon, frecuencia: "semanal" }, // Ruanda
  { clave: "marathonmn", correr: correrCollectorMarathonMn, frecuencia: "semanal" }, // Mongolia
  { clave: "datasport_pl", correr: correrCollectorDatasportPl, frecuencia: "semanal" }, // Polonia
  { clave: "eqtiming-no", correr: correrCollectorEqTimingNo, frecuencia: "semanal" }, // Noruega
  { clave: "rfea", correr: correrCollectorRfea, frecuencia: "semanal" }, // España
  { clave: "ultrapanamatrailseries", correr: correrCollectorUltraPanamaTrailSeries, frecuencia: "semanal" }, // Panamá (trail)
  { clave: "aims-my", correr: correrCollectorAimsMy, frecuencia: "semanal" }, // Malasia
  { clave: "aims-lk", correr: correrCollectorAimsLk, frecuencia: "semanal" }, // Sri Lanka
  { clave: "aims-bd", correr: correrCollectorAimsBd, frecuencia: "semanal" }, // Bangladesh
  { clave: "aims-np", correr: correrCollectorAimsNp, frecuencia: "semanal" }, // Nepal
  { clave: "aimghana", correr: correrCollectorAimGhana, frecuencia: "semanal" }, // Ghana
  { clave: "aims-tz", correr: correrCollectorAimsTz, frecuencia: "semanal" }, // Tanzania
  { clave: "ugandaathletics", correr: correrCollectorUgandaAthletics, frecuencia: "semanal" }, // Uganda
  { clave: "aims-tn", correr: correrCollectorAimsTn, frecuencia: "semanal" }, // Túnez
  { clave: "aims-dz", correr: correrCollectorAimsDz, frecuencia: "semanal" }, // Argelia
  { clave: "eqtiming-se", correr: correrCollectorEqTimingSe, frecuencia: "semanal" }, // Suecia
  { clave: "futniszep", correr: correrCollectorFutniszep, frecuencia: "semanal" }, // Hungría
  { clave: "kenyanathlete", correr: correrCollectorKenyanAthlete, frecuencia: "semanal" }, // Kenia
  { clave: "kilpailukalenteri", correr: correrCollectorKilpailukalenteri, frecuencia: "semanal" }, // Finlandia
  { clave: "oelv-athmin", correr: correrCollectorOelvAthmin, frecuencia: "semanal" }, // Austria
  { clave: "racetime-ro", correr: correrCollectorRacetimeRo, frecuencia: "semanal" }, // Rumania
];

// Reparte los collectors "semanal" entre los 7 días de la semana según su
// posición en la lista, para que no corran todos juntos el mismo día.
function leTocaHoy(indiceEnSemanales: number): boolean {
  const diaSemana = new Date().getDay(); // 0=domingo .. 6=sábado
  return indiceEnSemanales % 7 === diaSemana;
}

// Si un fetch de algún collector nunca responde (el sitio se cuelga sin
// cerrar la conexión), sin este límite el collector se queda esperando
// para siempre y, como corren uno detrás del otro, bloquea a todos los
// que le siguen ese día. 60s alcanza de sobra para cualquier fuente que
// esté respondiendo normal.
function conLimiteDeTiempo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`tardó más de ${ms / 1000}s`)), ms)),
  ]);
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
      resultados[clave] = await conLimiteDeTiempo(correr(), 60_000);
    } catch (e) {
      resultados[clave] = { error: e instanceof Error ? e.message : "error desconocido" };
    }
  }

  // Barrida de calidad de datos: corrige sola, todos los días, sin que
  // haga falta que nadie entre a revisar manualmente (ver sanidad.ts).
  try {
    resultados["_sanidad"] = await corregirCalidadDeDatos();
  } catch (e) {
    resultados["_sanidad"] = { error: e instanceof Error ? e.message : "error desconocido" };
  }

  // Traduce (con IA, gratis) las descripciones de carreras que todavía no
  // tienen versión en inglés/portugués/francés — así las que traen los
  // collectors nuevos quedan traducidas solas, sin intervención manual.
  try {
    resultados["_traducciones"] = await traducirDescripcionesFaltantes();
  } catch (e) {
    resultados["_traducciones"] = { error: e instanceof Error ? e.message : "error desconocido" };
  }

  return NextResponse.json(resultados);
}

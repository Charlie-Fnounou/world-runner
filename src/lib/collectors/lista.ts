// Lista única de recolectores: la usan el cron diario y el botón
// "Correr recolectores ahora" del panel de admin.
import { correrCollectorRunSignup } from "./runsignup";
import { correrCollectorFidal } from "./fidal";
import { correrCollectorCorro } from "./corro";
import { correrCollectorRunchile } from "./runchile";
import { correrCollectorRunRunners } from "./runrunners";
import { correrCollectorKms } from "./kms";
import { correrCollectorTim3 } from "./tim3";
import { correrCollectorChiptiming } from "./chiptiming";
import { correrCollectorAbuenpaso } from "./abuenpaso";
import { correrCollectorMaratonGuate } from "./maratonguate";
import { correrCollectorProdeporte } from "./prodeporte";
import { correrCollectorAsuncionRunners } from "./asuncionrunners";
import { correrCollectorRunnerBo } from "./runnerbo";
import { correrCollectorTimingEcuador } from "./timingecuador";
import { correrCollectorHipereventos } from "./hipereventos";
import { correrCollectorSdcTickets } from "./sdctickets";
import { correrCollectorMinhasInscricoes } from "./minhasinscricoes";
import { correrCollectorLaufen } from "./laufen";
import { correrCollectorInschrijven } from "./inschrijven";
import { correrCollectorInschrijvenBe } from "./inschrijven-be";
import { correrCollectorEpa } from "./epa";
import { correrCollectorRecordePessoal } from "./recordepessoal";
import { correrCollectorRunnetJp } from "./runnet-jp";
import { correrCollectorEthiopianRun } from "./ethiopianrun";
import { correrCollectorTheTriFactory } from "./thetrifactory";
import { correrCollectorMarrakechMarathon } from "./marrakechmarathon";
import { correrCollectorLagosCityMarathon } from "./lagoscitymarathon";
import { correrCollectorRunRio } from "./runrio";
import { correrCollectorAimsId } from "./aims-id";
import { correrCollectorAimsTh } from "./aims-th";
import { correrCollectorAimsVn } from "./aims-vn";
import { correrCollectorAimsSg } from "./aims-sg";
import { correrCollectorKosuTaf } from "./kosutaf";
import { correrCollectorIaaIsrael } from "./iaaisrael";
import { correrCollectorPremierOnlineAe } from "./premieronlineae";
import { correrCollectorProbeg } from "./probeg";
import { correrCollectorVsiprobihy } from "./vsiprobihy";
import { correrCollectorRunIndia } from "./runindia";
import { correrCollectorRunnet } from "./runnet";
import { correrCollectorAimsCn } from "./aims-cn";
import { correrCollectorAimsKr } from "./aims-kr";
import { correrCollectorAimsSa } from "./aims-sa";
import { correrCollectorHasHr } from "./has-hr";
import { correrCollectorAthleticsLv } from "./athletics-lv";
import { correrCollectorEkjlEe } from "./ekjl-ee";
import { correrCollectorEqTimingSe } from "./eqtiming-se";
import { correrCollectorFutniszep } from "./futniszep";
import { correrCollectorKenyanAthlete } from "./kenyanathlete";
import { correrCollectorKilpailukalenteri } from "./kilpailukalenteri";
import { correrCollectorOelvAthmin } from "./oelvathmin";
import { correrCollectorRacetimeRo } from "./racetime-ro";
import { correrCollectorAtletikaCz } from "./atletikacz";
import { correrCollectorConnectAtletik } from "./connect-atletik";
import { correrCollectorAimsCa } from "./aims-ca";
import { correrCollectorAimsJm } from "./aims-jm";
import { correrCollectorAimsTt } from "./aims-tt";
import { correrCollectorAimsBs } from "./aims-bs";
import { correrCollectorAimsPa } from "./aims-pa";
import { correrCollectorAimsMy } from "./aims-my";
import { correrCollectorAimsLk } from "./aims-lk";
import { correrCollectorAimsBd } from "./aims-bd";
import { correrCollectorAimsNp } from "./aims-np";
import { correrCollectorAimGhana } from "./aimghana";
import { correrCollectorAimsTz } from "./aims-tz";
import { correrCollectorUgandaAthletics } from "./ugandaathletics";
import { correrCollectorAimsTn } from "./aims-tn";
import { correrCollectorAimsDz } from "./aims-dz";
import { correrCollectorCarrerasPanama } from "./carreraspanama";
import { correrCollectorRunningCalendarAu } from "./runningcalendar-au";
import { correrCollectorRunningCalendarNz } from "./runningcalendar-nz";
import { correrCollectorSwissRunning } from "./swissrunning";
import { correrCollectorRunEvents } from "./runevents";
import { correrCollectorRunningEventsJa } from "./runningeventsja";
import { correrCollectorSingletreeLk } from "./singletree-lk";
import { correrCollectorFinisherTn } from "./finisher-tn";
import { correrCollectorMillenniumMarathonGH } from "./millenniummarathon-gh";
import { correrCollectorCrdbBankMarathon } from "./crdbbankmarathon";
import { correrCollectorActiveSgSg } from "./activesg-sg";
import { correrCollectorNetskraning } from "./netskraning";
import { correrCollectorTimingLjubljana } from "./timingljubljana";
import { correrCollectorRaceTimingBg } from "./racetimingbg";
import { correrCollectorMyRaceRs } from "./myrace-rs";
import { correrCollectorKigaliMarathon } from "./kigalimarathon";
import { correrCollectorMarathonMn } from "./marathonmn";
import { correrCollectorDatasportPl } from "./datasportpl";
import { correrCollectorEqTimingNo } from "./eqtiming-no";
import { correrCollectorRfea } from "./rfea";
import { correrCollectorUltraPanamaTrailSeries } from "./ultrapanamatrailseries";
import { correrCollectorRunningCalendarIe } from "./irlanda";
import { correrCollectorSportsnetTw } from "./taiwan";
import { correrCollectorPaobaodaoHk } from "./hong-kong";

export type Frecuencia = "diaria" | "semanal";

// El plan gratis de Vercel solo permite disparar el cron 1 vez por día
// (no cada 1-3h como sería ideal). Para igual darle prioridad a las
// fuentes más grandes/con más movimiento real, se dividen en dos grupos:
// "diaria" corre TODOS los días, "semanal" rota entre los 7 días de la
// semana (cada una le toca 1 vez por semana, pero repartidas en vez de
// todas juntas el mismo día como antes).
export const COLLECTORES: {
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
  { clave: "runningcalendar-ie", correr: correrCollectorRunningCalendarIe, frecuencia: "semanal" }, // Irlanda
  { clave: "sportsnet-tw", correr: correrCollectorSportsnetTw, frecuencia: "semanal" }, // Taiwán
  { clave: "paobaodao-hk", correr: correrCollectorPaobaodaoHk, frecuencia: "semanal" }, // Hong Kong
];

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
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

const COLLECTORES = [
  correrCollectorRunSignup,
  correrCollectorFidal,
  correrCollectorCorro,
  correrCollectorRunchile,
  correrCollectorRunRunners,
  correrCollectorKms,
  correrCollectorTim3,
  correrCollectorChiptiming,
  correrCollectorAbuenpaso,
  correrCollectorMaratonGuate,
  correrCollectorProdeporte,
  correrCollectorAsuncionRunners,
  correrCollectorRunnerBo,
  correrCollectorTimingEcuador,
  correrCollectorHipereventos,
  correrCollectorSdcTickets,
  correrCollectorMinhasInscricoes,
  correrCollectorLaufen,
  correrCollectorInschrijven,
  correrCollectorInschrijvenBe,
  correrCollectorEpa,
  correrCollectorRecordePessoal,
  correrCollectorRunnetJp,
  correrCollectorEthiopianRun,
  correrCollectorTheTriFactory,
  correrCollectorMarrakechMarathon,
  correrCollectorLagosCityMarathon,
  correrCollectorRunRio,
  correrCollectorAimsId,
  correrCollectorAimsTh,
  correrCollectorAimsVn,
  correrCollectorAimsSg,
  correrCollectorKosuTaf,
  correrCollectorIaaIsrael,
  correrCollectorPremierOnlineAe,
  correrCollectorProbeg,
  correrCollectorVsiprobihy,
  correrCollectorRunIndia,
  correrCollectorRunnet,
  correrCollectorAimsCn,
  correrCollectorAimsKr,
  correrCollectorAimsSa,
  correrCollectorHasHr,
  correrCollectorAthleticsLv,
  correrCollectorEkjlEe,
  correrCollectorAtletikaCz,
  correrCollectorConnectAtletik,
  correrCollectorAimsCa,
  correrCollectorAimsJm,
  correrCollectorAimsTt,
  correrCollectorAimsBs,
  correrCollectorAimsPa,
  correrCollectorAimsMy,
  correrCollectorAimsLk,
  correrCollectorAimsBd,
  correrCollectorAimsNp,
  correrCollectorAimGhana,
  correrCollectorAimsTz,
  correrCollectorUgandaAthletics,
  correrCollectorAimsTn,
  correrCollectorAimsDz,
  correrCollectorEqTimingSe,
  correrCollectorFutniszep,
  correrCollectorKenyanAthlete,
  correrCollectorKilpailukalenteri,
  correrCollectorOelvAthmin,
  correrCollectorRacetimeRo,
];

// Si un fetch de algún collector nunca responde, sin este límite se
// queda esperando para siempre y bloquea a todos los que le siguen.
function conLimiteDeTiempo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`tardó más de ${ms / 1000}s`)), ms)),
  ]);
}

export async function correrCollectoresAhora() {
  await requireAdmin();

  for (const correr of COLLECTORES) {
    await conLimiteDeTiempo(correr(), 60_000).catch(() => {});
  }

  revalidatePath("/admin/robots");
}

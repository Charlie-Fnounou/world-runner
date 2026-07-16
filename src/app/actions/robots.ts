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
];

export async function correrCollectoresAhora() {
  await requireAdmin();

  for (const correr of COLLECTORES) {
    await correr().catch(() => {});
  }

  revalidatePath("/admin/robots");
}

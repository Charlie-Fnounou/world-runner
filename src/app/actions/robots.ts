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
];

export async function correrCollectoresAhora() {
  await requireAdmin();

  for (const correr of COLLECTORES) {
    await correr().catch(() => {});
  }

  revalidatePath("/admin/robots");
}

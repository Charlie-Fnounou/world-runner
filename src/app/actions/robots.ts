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

export async function correrCollectoresAhora() {
  await requireAdmin();

  await correrCollectorRunSignup().catch(() => {});
  await correrCollectorFidal().catch(() => {});
  await correrCollectorCorro().catch(() => {});
  await correrCollectorRunchile().catch(() => {});
  await correrCollectorRunRunners().catch(() => {});
  await correrCollectorKms().catch(() => {});
  await correrCollectorTim3().catch(() => {});

  revalidatePath("/admin/robots");
}

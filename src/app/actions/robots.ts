"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { correrCollectorRunSignup } from "@/lib/collectors/runsignup";
import { correrCollectorFidal } from "@/lib/collectors/fidal";
import { correrCollectorCorro } from "@/lib/collectors/corro";

export async function correrCollectoresAhora() {
  await requireAdmin();

  await correrCollectorRunSignup().catch(() => {});
  await correrCollectorFidal().catch(() => {});
  await correrCollectorCorro().catch(() => {});

  revalidatePath("/admin/robots");
}

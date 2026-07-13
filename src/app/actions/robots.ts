"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { correrCollectorRunSignup } from "@/lib/collectors/runsignup";

export async function correrCollectoresAhora() {
  await requireAdmin();

  await correrCollectorRunSignup().catch(() => {});

  revalidatePath("/admin/robots");
}

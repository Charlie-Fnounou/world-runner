"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { correrCollectorRunSignup } from "@/lib/collectors/runsignup";

export async function correrCollectoresAhora() {
  await requireAdmin();

  const runsignupConectado = await prisma.integracionOAuth.findUnique({ where: { proveedor: "runsignup" } });
  if (runsignupConectado?.refreshToken) {
    await correrCollectorRunSignup().catch(() => {});
  }

  revalidatePath("/admin/robots");
}

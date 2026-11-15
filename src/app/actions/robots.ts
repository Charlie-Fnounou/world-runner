"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { soltarCandado, tomarCandado } from "@/lib/cronLock";
import { corregirCalidadDeDatos } from "@/lib/sanidad";
import { traducirDescripcionesFaltantes } from "@/lib/traducciones";
import { rellenarDatosFaltantes } from "@/lib/rellenoDatos";
import { enviarResumenesUbicacion } from "@/lib/resumenesUbicacion";
import { enriquecerCarrerasRunSignup } from "@/lib/collectors/runsignup";
import { COLLECTORES } from "@/lib/collectors/lista";
import { FUENTES_PAUSADAS } from "@/lib/collectors/pausadas";

// Si un fetch de algún collector nunca responde, sin este límite se
// queda esperando para siempre y bloquea a todos los que le siguen.
function conLimiteDeTiempo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`tardó más de ${ms / 1000}s`)), ms),
    ),
  ]);
}

export async function correrCollectoresAhora() {
  await requireAdmin();
  if (!(await tomarCandado())) return;
  try {
    for (const { clave, correr } of COLLECTORES) {
      if (FUENTES_PAUSADAS[clave]) continue; // bloqueada o rota (ver pausadas.ts)
      // RunSignup (EE. UU.) es la fuente más grande con diferencia y
      // necesita más tiempo que el resto (ver TIEMPOS_ESPECIALES en
      // api/cron/collectors/route.ts).
      const limite = clave === "runsignup" ? 130_000 : 60_000;
      await conLimiteDeTiempo(correr(), limite).catch(() => {});
    }

    await corregirCalidadDeDatos().catch(() => {});
    await traducirDescripcionesFaltantes().catch(() => {});
    await enviarResumenesUbicacion().catch(() => {});
    await enriquecerCarrerasRunSignup().catch(() => {});
    await rellenarDatosFaltantes().catch(() => {});

    revalidatePath("/", "layout");
  } finally {
    await soltarCandado();
  }
}

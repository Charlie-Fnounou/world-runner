// Deja la base legible para el código ANTERIOR a esta actualización.
//
// El código viejo no conoce el estado SIN_CONFIRMAR: si lo lee, Prisma
// falla ("Value 'SIN_CONFIRMAR' not found in enum") y se cae todo el
// listado. Después de publicar el código nuevo, el robot diario crea
// ediciones con ese estado aunque no se haya corrido la migración. Por eso,
// ANTES de volver a un deploy anterior en Vercel hay que correr esto.
//
//   npx tsx --env-file=.env scripts/preparar-reversion.ts
//       -> SIMULACIÓN: cuántas ediciones cambiaría.
//   ... --aplicar --confirmo-produccion
//       -> respalda y pasa SIN_CONFIRMAR -> PROXIMAMENTE (futuras) o CERRADA
//          (pasadas), que es lo que mostraba el código viejo.
//
// Para volver a la versión nueva: re-publicar el código nuevo y deshacer con
//   npx tsx --env-file=.env scripts/restaurar-veracidad.ts prisma/respaldos/<respaldo-de-este-script>.json --aplicar
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { identificarBase, type Cambio } from "./migrar-veracidad-lib";

const APLICAR = process.argv.includes("--aplicar");

async function main() {
  const { host, nombre } = identificarBase();
  console.log(`Base: ${host}/${nombre} · modo: ${APLICAR ? "APLICAR" : "SIMULACIÓN (no escribe nada)"}`);
  if (APLICAR && host !== "localhost" && !process.argv.includes("--confirmo-produccion")) {
    throw new Error("Para aplicar contra una base que no es localhost hay que agregar --confirmo-produccion");
  }
  const ahora = new Date();
  const filas = await prisma.edicion.findMany({ where: { estado: "SIN_CONFIRMAR" }, select: { id: true, fecha: true, ultimaVerificacion: true } });
  const cambios: Cambio[] = filas.map((f) => ({
    tabla: "Edicion",
    id: f.id,
    campo: "estado",
    antes: "SIN_CONFIRMAR",
    despues: f.fecha >= ahora ? "PROXIMAMENTE" : "CERRADA",
    motivo: "compatibilidad con el código anterior (reversión)",
  }));
  console.log(`Ediciones con SIN_CONFIRMAR: ${cambios.length}`);
  if (!APLICAR || cambios.length === 0) return;

  const archivo = path.join(process.cwd(), "prisma", "respaldos", `reversion-${host}-${nombre}-${Date.now()}.json`);
  mkdirSync(path.dirname(archivo), { recursive: true });
  writeFileSync(archivo, JSON.stringify({ version: 2, paso: "reversion", base: `${host}/${nombre}`, creado: ahora.toISOString(), cambios }, null, 1));
  console.log(`Respaldo: ${archivo}`);
  for (const despues of ["PROXIMAMENTE", "CERRADA"] as const) {
    const ids = cambios.filter((c) => c.despues === despues).map((c) => c.id);
    for (let i = 0; i < ids.length; i += 1000) {
      await prisma.edicion.updateMany({ where: { id: { in: ids.slice(i, i + 1000) }, estado: "SIN_CONFIRMAR" }, data: { estado: despues } });
    }
  }
  const quedan = await prisma.edicion.count({ where: { estado: "SIN_CONFIRMAR" } });
  console.log(`Listo. Quedan con SIN_CONFIRMAR: ${quedan} (si el robot corrió en el medio, volver a ejecutar).`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

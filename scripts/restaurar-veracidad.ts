// Deshace un paso de scripts/migrar-veracidad.ts usando su plan/respaldo.
//
//   npx tsx --env-file=.env scripts/restaurar-veracidad.ts prisma/respaldos/<plan>.json
//       -> SIMULACIÓN: cuenta qué restauraría.
//   ... --aplicar --confirmo-produccion
//       -> restaura cada campo a su valor anterior y libera el paso (se puede
//          volver a migrar).
//
// Restaurar en orden inverso: runsignup (si se aplicó), duplicados-v1,
// estados-v1, semilla-v1. Un campo que cambió después de la migración (un
// robot o un admin lo actualizó) NO se pisa salvo con --forzar.
import { readFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { identificarBase, iguales, type Cambio } from "./migrar-veracidad-lib";

const archivo = process.argv[2];
const APLICAR = process.argv.includes("--aplicar");
const FORZAR = process.argv.includes("--forzar");

async function main() {
  if (!archivo) throw new Error("Falta el archivo de plan/respaldo");
  const { host, nombre } = identificarBase();
  if (APLICAR && host !== "localhost" && !process.argv.includes("--confirmo-produccion")) {
    throw new Error("Para restaurar en una base que no es localhost hay que agregar --confirmo-produccion");
  }
  const plan = JSON.parse(readFileSync(archivo, "utf8")) as { paso?: string; base?: string; cambios: Cambio[] };
  if (plan.base && !plan.base.startsWith(host)) throw new Error(`Este respaldo es de ${plan.base}, no de ${host}`);
  console.log(`Base: ${host}/${nombre} · paso ${plan.paso ?? "?"} · ${plan.cambios.length} cambios · modo: ${APLICAR ? "APLICAR" : "SIMULACIÓN"}`);

  const r = { restaurados: 0, yaEstaban: 0, cambiadosDespues: 0, filasInexistentes: 0 };
  for (let i = 0; i < plan.cambios.length; i += 200) {
    const tanda = plan.cambios.slice(i, i + 200);
    const ejecutar = async (tx: Prisma.TransactionClient) => {
      const evs = new Map((await tx.evento.findMany({ where: { id: { in: tanda.filter((c) => c.tabla === "Evento").map((c) => c.id) } } })).map((e) => [e.id, e as Record<string, unknown>]));
      const eds = new Map((await tx.edicion.findMany({ where: { id: { in: tanda.filter((c) => c.tabla === "Edicion").map((c) => c.id) } } })).map((e) => [e.id, e as Record<string, unknown>]));
      for (const c of tanda) {
        const fila = (c.tabla === "Evento" ? evs : eds).get(c.id);
        if (!fila) {
          r.filasInexistentes++;
          continue;
        }
        if (iguales(fila[c.campo], c.antes)) {
          r.yaEstaban++;
          continue;
        }
        if (!iguales(fila[c.campo], c.despues) && !FORZAR) {
          r.cambiadosDespues++;
          continue;
        }
        r.restaurados++;
        if (!APLICAR) continue;
        const valor = c.campo === "perfilElevacion" && c.antes === null ? Prisma.DbNull : c.antes;
        const data = { [c.campo]: valor as never };
        if (c.tabla === "Evento") await tx.evento.update({ where: { id: c.id }, data, select: { id: true } });
        else await tx.edicion.update({ where: { id: c.id }, data, select: { id: true } });
      }
    };
    if (APLICAR) await prisma.$transaction(ejecutar);
    else await ejecutar(prisma);
  }
  console.log(r);

  if (APLICAR && plan.paso && plan.paso !== "runsignup" && r.cambiadosDespues === 0) {
    await prisma.estadoCollector.deleteMany({ where: { collector: `_migracion:${plan.paso}` } });
    console.log(`Paso ${plan.paso} liberado: se puede volver a migrar.`);
  } else if (APLICAR && r.cambiadosDespues > 0) {
    console.log("Quedaron campos cambiados después de la migración: el paso sigue marcado. Revisar o usar --forzar.");
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

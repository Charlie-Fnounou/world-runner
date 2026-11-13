// Corrige datos ya guardados que la web mostraba como reales sin serlo.
//
//   npx tsx --env-file=.env scripts/migrar-veracidad.ts            -> solo muestra qué cambiaría
//   npx tsx --env-file=.env scripts/migrar-veracidad.ts --aplicar  -> respalda y aplica
//   ... --aplicar --runsignup                                       -> además confirma estados con RunSignup
//
// Correr junto con el deploy del código nuevo (el código viejo vuelve a
// deducir estados y mostraría SIN_CONFIRMAR como "abre pronto").
// Es idempotente: correrlo dos veces no cambia nada la segunda vez.
// No borra filas: solo vacía campos inventados y cambia estados.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { marcarDuplicados } from "../src/lib/duplicados";
import { aCarreraExterna, type RaceRunSignup } from "../src/lib/collectors/runsignup";
import semilla from "../src/data/races-seed.json";

const APLICAR = process.argv.includes("--aplicar");
const CON_RUNSIGNUP = process.argv.includes("--runsignup");

// Fuentes que informan el estado de inscripción de verdad (ver validacion.ts).
const FUENTES_CON_ESTADO = ["paobaodao-hk", "marathonmn"];

// Duplicados entre el catálogo inicial y una fuente automática, revisados a
// mano el 2026-11-13 (los nombres difieren y la detección automática, que es
// conservadora, no los une). Se identifican por nombre exacto.
const DUPLICADOS_MANUALES: { semilla: string; fuenteTipo: string; nombreFuente: string }[] = [
  { semilla: "TCS Toronto Waterfront Marathon", fuenteTipo: "aims_ca", nombreFuente: "TCS Toronto Waterfront Marathon" },
  { semilla: "Maratón Internacional de Panamá", fuenteTipo: "aims_pa", nombreFuente: "Panama International Marathon" },
  { semilla: "Maratón Valencia Trinidad Alfonso", fuenteTipo: "rfea", nombreFuente: "Maratón Valencia Trinidad Alfonso Zurich" },
];

function log(...x: unknown[]) {
  console.log(APLICAR ? "[APLICAR]" : "[PRUEBA]", ...x);
}

async function main() {
  const hoy = new Date();
  // Solo las carreras del prototipo de diseño (src/data/races-seed.json):
  // traían valoraciones, perfiles e historiales inventados.
  const idsSemilla = (semilla as { id: string }[]).map((r) => r.id);
  const semillas = await prisma.evento.findMany({
    where: { id: { in: idsSemilla } },
    include: { ediciones: true },
  });
  log(`Catálogo inicial (sin fuente automática): ${semillas.length} carreras`);

  const ids = await prisma.$queryRawUnsafe<{ id: string; estado: string }[]>(
    `select ed.id, ed.estado::text estado
     from "Edicion" ed join "Evento" e on e.id = ed."eventoId"
     where ed.fecha >= now() and ed.estado in ('ABIERTA','PROXIMAMENTE','ULTIMOS_CUPOS')
       and not exists (select 1 from "FuenteDato" f where f."eventoId" = e.id and f.tipo = any($1))
       and not exists (select 1 from "HistorialCambio" h where h."edicionId" = ed.id and h.campo = 'actualización manual (admin)')`,
    FUENTES_CON_ESTADO,
  );
  const porEstado = ids.reduce<Record<string, number>>((acc, r) => ((acc[r.estado] = (acc[r.estado] ?? 0) + 1), acc), {});
  log(`Estados deducidos (no informados por la fuente) a pasar a SIN_CONFIRMAR: ${ids.length}`, porEstado);

  const camposInventados = semillas.flatMap((e) => e.ediciones).filter(
    (ed) => ed.ratingPromedio != null || ed.numResenas > 0 || ed.perfilElevacion != null || ed.dificultad != null,
  ).length;
  log(`Ediciones del catálogo inicial con valoraciones/perfil/dificultad inventados: ${camposInventados}`);

  if (!APLICAR) {
    log("Nada cambió. Para aplicar: agregar --aplicar");
    return;
  }

  // 1. Respaldo de todo lo que se va a tocar.
  const dir = path.join(process.cwd(), "prisma", "respaldos");
  mkdirSync(dir, { recursive: true });
  const archivo = path.join(dir, `veracidad-${hoy.toISOString().slice(0, 19).replace(/:/g, "")}.json`);
  writeFileSync(archivo, JSON.stringify({ fecha: hoy.toISOString(), semillas, estados: ids }, null, 1));
  log(`Respaldo: ${archivo}`);

  // 2. Valoraciones y datos inventados del catálogo inicial.
  for (const e of semillas) {
    const resenas = await prisma.resena.count({ where: { eventoId: e.id } });
    for (const ed of e.ediciones) {
      const esPasada = ed.fecha < hoy;
      await prisma.edicion.update({
        where: { id: ed.id },
        data: {
          // El rating real lo recalcula guardarResena; acá se quita el inventado.
          ratingPromedio: resenas > 0 ? ed.ratingPromedio : null,
          numResenas: resenas,
          dificultad: null,
          recordMasculino: null,
          recordFemenino: null,
          recordRecorridoM: null,
          recordRecorridoF: null,
          // El historial (ediciones pasadas) era estimado; la edición actual
          // queda sin precio/cupo/desnivel/límite hasta que el agente de IA
          // los busque en la fuente oficial (ultimaRevisionIA = null).
          numCorredores: null,
          precioDesde: null,
          moneda: esPasada ? ed.moneda : null,
          desnivelPositivoM: null,
          tiempoLimite: null,
          ultimaRevisionIA: null,
        },
      });
      await prisma.$executeRawUnsafe(`update "Edicion" set "perfilElevacion" = null where id = $1`, ed.id);
    }
    await prisma.evento.update({ where: { id: e.id }, data: { climaTempPromedioC: null } });
  }
  log(`Catálogo inicial limpiado: ${semillas.length} carreras`);

  // 3. Estados deducidos -> SIN_CONFIRMAR (en tandas).
  for (let i = 0; i < ids.length; i += 500) {
    const tanda = ids.slice(i, i + 500).map((r) => r.id);
    await prisma.edicion.updateMany({ where: { id: { in: tanda } }, data: { estado: "SIN_CONFIRMAR" } });
  }
  log(`Estados pasados a SIN_CONFIRMAR: ${ids.length}`);

  // 4. Duplicados entre catálogo inicial y fuentes.
  for (const d of DUPLICADOS_MANUALES) {
    const semilla = semillas.find((e) => e.nombre === d.semilla);
    const principal = await prisma.evento.findFirst({ where: { nombre: d.nombreFuente, fuentes: { some: { tipo: d.fuenteTipo } } } });
    if (!semilla || !principal || semilla.duplicadoDeId) continue;
    await prisma.evento.update({ where: { id: semilla.id }, data: { duplicadoDeId: principal.id } });
    await prisma.evento.update({
      where: { id: principal.id },
      data: {
        esWorldMarathonMajor: principal.esWorldMarathonMajor || semilla.esWorldMarathonMajor,
        descripcion: principal.descripcion || semilla.descripcion,
        sitioWeb: principal.sitioWeb || semilla.sitioWeb,
      },
    });
    log(`Duplicado: "${semilla.nombre}" -> "${principal.nombre}"`);
  }
  log("Duplicados automáticos:", await marcarDuplicados());

  // 5. Opcional: confirmar con RunSignup qué inscripciones están abiertas.
  if (CON_RUNSIGNUP) await confirmarRunSignup();
}

async function confirmarRunSignup() {
  let abiertas = 0;
  for (let mes = 0; mes < 18; mes++) {
    const base = new Date();
    const inicio = mes === 0 ? base : new Date(base.getFullYear(), base.getMonth() + mes, 1);
    const fin = new Date(base.getFullYear(), base.getMonth() + mes + 1, 0);
    for (let pagina = 1; pagina <= 50; pagina++) {
      const url = new URL("https://runsignup.com/rest/races");
      url.search = new URLSearchParams({
        format: "json",
        results_per_page: "100",
        page: String(pagina),
        event_type: "running_race",
        start_date: inicio.toISOString().slice(0, 10),
        end_date: fin.toISOString().slice(0, 10),
      }).toString();
      const res = await fetch(url, { headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" } });
      if (!res.ok) break;
      const data = (await res.json()) as { races?: RaceRunSignup[]; error?: unknown };
      const races = data.races ?? [];
      if (data.error || races.length === 0) break;
      const ids = races
        .map((r) => r.race)
        .filter((r) => aCarreraExterna(r)?.estado === "ABIERTA")
        .map((r) => String(r.race_id));
      if (ids.length > 0) {
        const fuentes = await prisma.fuenteDato.findMany({ where: { tipo: "runsignup", externalId: { in: ids } }, select: { eventoId: true } });
        const r = await prisma.edicion.updateMany({
          where: { eventoId: { in: fuentes.map((f) => f.eventoId) }, fecha: { gte: new Date() }, estado: "SIN_CONFIRMAR" },
          data: { estado: "ABIERTA" },
        });
        abiertas += r.count;
      }
      await new Promise((r) => setTimeout(r, 350));
    }
    log(`RunSignup mes +${mes}: ${abiertas} inscripciones confirmadas abiertas hasta ahora`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

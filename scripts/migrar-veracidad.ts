// Corrige datos ya guardados que la web mostraba como reales sin serlo.
//
//   npx tsx --env-file=.env scripts/migrar-veracidad.ts
//       -> SIMULACIÓN: qué cambiaría, campo por campo. No escribe nada.
//   npx tsx --env-file=.env scripts/migrar-veracidad.ts --aplicar --confirmo-produccion
//       -> guarda el plan/respaldo y aplica. Contra una base que no sea
//          localhost exige --confirmo-produccion.
//   ... --runsignup [--meses=N]
//       -> después, consulta RunSignup y confirma las inscripciones abiertas
//          (repetible: solo pasa SIN_CONFIRMAR -> ABIERTA, con respaldo).
//
// Tres pasos, cada uno se ejecuta UNA sola vez por base:
//   semilla-v1     51 carreras del prototipo: valoraciones, reseñas, perfil,
//                  dificultad y clima inventados; corredores/precio de
//                  ediciones anteriores (estimados). No toca la edición
//                  actual, récords ni ediciones editadas a mano.
//   estados-v1     estados deducidos por la fecha -> SIN_CONFIRMAR.
//   duplicados-v1  marca duplicadoDeId (no borra filas).
//
// Cómo garantiza idempotencia y recuperación ante cortes:
//   - En la base (tabla EstadoCollector, clave "_migracion:<paso>") queda
//     registrado si el paso está iniciado (cursor 0) o completado (cursor 1).
//     Un paso completado nunca se vuelve a ejecutar.
//   - Antes de escribir nada, el plan completo (cada campo con su valor
//     anterior) se guarda en prisma/respaldos/. Si el proceso se corta, la
//     próxima corrida retoma ESE plan, no uno recalculado.
//   - Cada fila se cambia solo si todavía tiene el valor anterior del plan
//     (y, en ediciones, si ningún robot la actualizó desde entonces). Lo que
//     otro proceso cambió mientras tanto se respeta y se informa.
//   - scripts/restaurar-veracidad.ts deshace un paso con su plan.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { buscarDuplicados } from "../src/lib/duplicados";
import { aCarreraExterna, type RaceRunSignup } from "../src/lib/collectors/runsignup";
import semilla from "../src/data/races-seed.json";
import { identificarBase, iguales, type Cambio } from "./migrar-veracidad-lib";

const APLICAR = process.argv.includes("--aplicar");
const CON_RUNSIGNUP = process.argv.includes("--runsignup");
const MESES = Number(process.argv.find((a) => a.startsWith("--meses="))?.split("=")[1] ?? 18);
const TANDA = 200;

const CAMPO_ADMIN = "actualización manual (admin)";
const CATEGORIAS_RESENA = ["organizacion", "paisajes", "dificultad", "medalla", "camiseta", "hidratacion", "expo", "seguridad", "calidadPrecio"] as const;
const ID_SEMILLA = (semilla as { id: string }[]).map((r) => r.id);

// Revisados a mano el 2026-11-13: nombres distintos, misma carrera.
const DUPLICADOS_MANUALES = [
  { semilla: "TCS Toronto Waterfront Marathon", fuenteTipo: "aims_ca", nombreFuente: "TCS Toronto Waterfront Marathon" },
  { semilla: "Maratón Internacional de Panamá", fuenteTipo: "aims_pa", nombreFuente: "Panama International Marathon" },
  { semilla: "Maratón Valencia Trinidad Alfonso", fuenteTipo: "rfea", nombreFuente: "Maratón Valencia Trinidad Alfonso Zurich" },
];


interface Plan {
  version: 2;
  paso: string;
  base: string;
  creado: string;
  cambios: Cambio[];
}

type Paso = { clave: string; calcular: () => Promise<Cambio[]> };


function anotar(cambios: Cambio[], c: Cambio) {
  if (!iguales(c.antes, c.despues)) cambios.push(c);
}


function archivoPlan(clave: string): string {
  const { host, nombre } = identificarBase();
  return path.join(process.cwd(), "prisma", "respaldos", `veracidad-${clave}-${host}-${nombre}.json`.replace(/[^a-zA-Z0-9._-]/g, "_"));
}

function escribirAtomico(archivo: string, contenido: string) {
  mkdirSync(path.dirname(archivo), { recursive: true });
  const tmp = `${archivo}.tmp`;
  writeFileSync(tmp, contenido);
  renameSync(tmp, archivo);
}

async function editadasAMano(): Promise<Set<string>> {
  const filas = await prisma.historialCambio.findMany({ where: { campo: CAMPO_ADMIN, edicionId: { not: null } }, select: { edicionId: true } });
  return new Set(filas.map((h) => h.edicionId!));
}

// ---------- Paso 1: catálogo inicial ----------
async function calcularSemilla(): Promise<Cambio[]> {
  const cambios: Cambio[] = [];
  const ahora = new Date();
  const aMano = await editadasAMano();
  const semillas = await prisma.evento.findMany({
    where: { id: { in: ID_SEMILLA } },
    include: { ediciones: { orderBy: { fecha: "asc" } }, resenas: true },
  });
  for (const e of semillas) {
    const actual = e.ediciones.find((ed) => ed.fecha >= ahora) ?? e.ediciones[e.ediciones.length - 1];
    const promedios = e.resenas.map((r) => CATEGORIAS_RESENA.reduce((s, c) => s + r[c], 0) / CATEGORIAS_RESENA.length);
    const ratingReal = promedios.length ? Math.round((promedios.reduce((a, b) => a + b, 0) / promedios.length) * 10) / 10 : null;
    anotar(cambios, { tabla: "Evento", id: e.id, campo: "climaTempPromedioC", antes: e.climaTempPromedioC, despues: null, motivo: "clima inventado (prototipo)" });
    for (const ed of e.ediciones) {
      const esActual = ed.id === actual?.id;
      const v = ed.ultimaVerificacion?.toISOString() ?? null;
      anotar(cambios, { tabla: "Edicion", id: ed.id, campo: "ratingPromedio", antes: ed.ratingPromedio, despues: esActual ? ratingReal : null, motivo: "valoración inventada; queda la de reseñas reales", verificadaEn: v });
      anotar(cambios, { tabla: "Edicion", id: ed.id, campo: "numResenas", antes: ed.numResenas, despues: esActual ? e.resenas.length : 0, motivo: "cantidad de reseñas inventada", verificadaEn: v });
      anotar(cambios, { tabla: "Edicion", id: ed.id, campo: "perfilElevacion", antes: ed.perfilElevacion, despues: null, motivo: "perfil de elevación inventado", verificadaEn: v });
      anotar(cambios, { tabla: "Edicion", id: ed.id, campo: "dificultad", antes: ed.dificultad, despues: null, motivo: "dificultad inventada", verificadaEn: v });
      if (!esActual && !aMano.has(ed.id)) {
        anotar(cambios, { tabla: "Edicion", id: ed.id, campo: "numCorredores", antes: ed.numCorredores, despues: null, motivo: "historial estimado", verificadaEn: v });
        anotar(cambios, { tabla: "Edicion", id: ed.id, campo: "precioDesde", antes: ed.precioDesde, despues: null, motivo: "historial estimado", verificadaEn: v });
      }
    }
  }
  return cambios;
}

// ---------- Paso 2: estados deducidos ----------
// El código viejo deducía ABIERTA/PROXIMAMENTE por la fecha para todas las
// fuentes salvo las dos que informaban estado (Hong Kong y Mongolia).
// ULTIMOS_CUPOS nunca se deducía: solo venía del prototipo.
async function calcularEstados(): Promise<Cambio[]> {
  const cambios: Cambio[] = [];
  const aMano = await editadasAMano();
  const deducidas = await prisma.edicion.findMany({
    where: {
      fecha: { gte: new Date() },
      OR: [
        { estado: { in: ["ABIERTA", "PROXIMAMENTE"] }, evento: { fuentes: { none: { tipo: { in: ["paobaodao-hk", "marathonmn"] } } } } },
        { estado: "ULTIMOS_CUPOS", eventoId: { in: ID_SEMILLA } },
      ],
    },
    select: { id: true, estado: true, ultimaVerificacion: true },
  });
  for (const ed of deducidas) {
    if (aMano.has(ed.id)) continue;
    anotar(cambios, {
      tabla: "Edicion",
      id: ed.id,
      campo: "estado",
      antes: ed.estado,
      despues: "SIN_CONFIRMAR",
      motivo: "estado deducido por la fecha, no informado por la fuente",
      verificadaEn: ed.ultimaVerificacion?.toISOString() ?? null,
    });
  }
  return cambios;
}

// ---------- Paso 3: duplicados ----------
async function calcularDuplicados(): Promise<Cambio[]> {
  const cambios: Cambio[] = [];
  for (const d of DUPLICADOS_MANUALES) {
    const s = await prisma.evento.findFirst({ where: { nombre: d.semilla, id: { in: ID_SEMILLA } } });
    const principal = await prisma.evento.findFirst({ where: { nombre: d.nombreFuente, fuentes: { some: { tipo: d.fuenteTipo } } } });
    if (!s || !principal || s.duplicadoDeId) continue;
    anotar(cambios, { tabla: "Evento", id: s.id, campo: "duplicadoDeId", antes: null, despues: principal.id, motivo: `duplicado de "${principal.nombre}" (revisado a mano)` });
    if (!principal.esWorldMarathonMajor && s.esWorldMarathonMajor)
      anotar(cambios, { tabla: "Evento", id: principal.id, campo: "esWorldMarathonMajor", antes: false, despues: true, motivo: "se hereda de su duplicado" });
    if (!principal.descripcion && s.descripcion)
      anotar(cambios, { tabla: "Evento", id: principal.id, campo: "descripcion", antes: principal.descripcion, despues: s.descripcion, motivo: "se hereda de su duplicado" });
  }
  const yaMarcados = new Set(cambios.filter((c) => c.campo === "duplicadoDeId").map((c) => c.id));
  for (const [id, principal] of await buscarDuplicados()) {
    if (yaMarcados.has(id)) continue;
    anotar(cambios, { tabla: "Evento", id, campo: "duplicadoDeId", antes: null, despues: principal, motivo: "mismo nombre, fecha, país y ciudad" });
  }
  return cambios;
}

const PASOS: Paso[] = [
  { clave: "semilla-v1", calcular: calcularSemilla },
  { clave: "estados-v1", calcular: calcularEstados },
  { clave: "duplicados-v1", calcular: calcularDuplicados },
];

// ---------- Registro persistente de pasos ----------
const claveMarca = (clave: string) => `_migracion:${clave}`;

export async function estadoDelPaso(clave: string): Promise<"pendiente" | "iniciado" | "completado"> {
  const fila = await prisma.estadoCollector.findUnique({ where: { collector: claveMarca(clave) } });
  if (!fila) return "pendiente";
  return fila.cursor === 1 ? "completado" : "iniciado";
}

async function marcarPaso(clave: string, completado: boolean) {
  const cursor = completado ? 1 : 0;
  await prisma.estadoCollector.upsert({ where: { collector: claveMarca(clave) }, update: { cursor }, create: { collector: claveMarca(clave), cursor } });
}

// ---------- Aplicación segura ----------
function valorPrisma(campo: string, valor: unknown) {
  if (campo === "perfilElevacion") return valor === null ? Prisma.DbNull : (valor as Prisma.InputJsonValue);
  return valor;
}

interface Resultado {
  aplicados: number;
  yaAplicados: number;
  respetados: number;
}

// Reaplicable: cada cambio se hace solo si la fila conserva el valor
// "antes" (y, en ediciones, la misma ultimaVerificacion del plan).
export async function aplicarPlan(cambios: Cambio[], cortarTras?: number): Promise<Resultado> {
  const r: Resultado = { aplicados: 0, yaAplicados: 0, respetados: 0 };
  for (let i = 0, tandas = 0; i < cambios.length; i += TANDA, tandas++) {
    if (cortarTras !== undefined && tandas >= cortarTras) {
      console.log(`  [prueba] corte simulado tras ${tandas} tandas`);
      process.exit(3);
    }
    const tanda = cambios.slice(i, i + TANDA);
    await prisma.$transaction(async (tx) => {
      const idsEv = tanda.filter((c) => c.tabla === "Evento").map((c) => c.id);
      const idsEd = tanda.filter((c) => c.tabla === "Edicion").map((c) => c.id);
      const evs = new Map((await tx.evento.findMany({ where: { id: { in: idsEv } } })).map((e) => [e.id, e as Record<string, unknown>]));
      const eds = new Map((await tx.edicion.findMany({ where: { id: { in: idsEd } } })).map((e) => [e.id, e as Record<string, unknown>]));
      for (const c of tanda) {
        const fila = (c.tabla === "Evento" ? evs : eds).get(c.id);
        if (!fila) {
          r.respetados++;
          continue;
        }
        const actual = fila[c.campo];
        if (iguales(actual, c.despues)) {
          r.yaAplicados++;
          continue;
        }
        const verificada = (fila.ultimaVerificacion as Date | null | undefined)?.toISOString() ?? null;
        const tocadaPorRobot = c.tabla === "Edicion" && c.verificadaEn !== undefined && verificada !== c.verificadaEn;
        if (!iguales(actual, c.antes) || tocadaPorRobot) {
          r.respetados++;
          continue;
        }
        const data = { [c.campo]: valorPrisma(c.campo, c.despues) };
        if (c.tabla === "Evento") await tx.evento.update({ where: { id: c.id }, data, select: { id: true } });
        else await tx.edicion.update({ where: { id: c.id }, data, select: { id: true } });
        r.aplicados++;
      }
    });
  }
  return r;
}

function resumir(cambios: Cambio[]) {
  const por = new Map<string, number>();
  for (const c of cambios) por.set(`${c.tabla}.${c.campo} — ${c.motivo}`, (por.get(`${c.tabla}.${c.campo} — ${c.motivo}`) ?? 0) + 1);
  for (const [m, n] of [...por].sort()) console.log(`    ${String(n).padStart(6)}  ${m}`);
}

async function ejecutarPaso(p: Paso) {
  const estado = await estadoDelPaso(p.clave);
  const archivo = archivoPlan(p.clave);
  if (estado === "completado") {
    console.log(`· ${p.clave}: ya completado antes. No se repite.`);
    return;
  }

  let plan: Plan;
  if (estado === "iniciado") {
    if (!existsSync(archivo)) {
      throw new Error(`${p.clave} quedó iniciado pero no está su plan (${archivo}). Correr desde la misma máquina o restaurar antes de seguir.`);
    }
    plan = JSON.parse(readFileSync(archivo, "utf8"));
    console.log(`· ${p.clave}: se había cortado; se retoma el plan guardado (${plan.cambios.length} cambios).`);
  } else {
    // Un plan viejo (de una corrida restaurada) no se pisa: se archiva.
    if (APLICAR && existsSync(archivo)) {
      const archivado = archivo.replace(/\.json$/, `.archivado-${Date.now()}.json`);
      renameSync(archivo, archivado);
      console.log(`  plan anterior archivado: ${archivado}`);
    }
    const cambios = await p.calcular();
    plan = { version: 2, paso: p.clave, base: `${identificarBase().host}/${identificarBase().nombre}`, creado: new Date().toISOString(), cambios };
    console.log(`· ${p.clave}: ${cambios.length} cambios`);
    resumir(cambios);
    if (!APLICAR) return;
    escribirAtomico(archivo, JSON.stringify(plan, null, 1));
    console.log(`  plan y respaldo guardados: ${archivo}`);
    await marcarPaso(p.clave, false);
  }

  if (!APLICAR) return;
  const corte = process.env.MIGRACION_CORTE_TRAS_TANDAS && identificarBase().host === "localhost" ? Number(process.env.MIGRACION_CORTE_TRAS_TANDAS) : undefined;
  const r = await aplicarPlan(plan.cambios, corte);
  await marcarPaso(p.clave, true);
  console.log(`  aplicados ${r.aplicados} · ya estaban ${r.yaAplicados} · respetados (otro proceso los cambió) ${r.respetados}`);
}

// ---------- RunSignup (repetible) ----------
async function confirmarRunSignup() {
  if ((await estadoDelPaso("estados-v1")) !== "completado") {
    console.log("· runsignup: se omite hasta que estados-v1 esté completado.");
    return;
  }
  const cambios: Cambio[] = [];
  const base = new Date();
  for (let mes = 0; mes < MESES; mes++) {
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
      const abiertas = races.map((r) => r.race).filter((r) => aCarreraExterna(r)?.estado === "ABIERTA").map((r) => String(r.race_id));
      if (abiertas.length) {
        const fuentes = await prisma.fuenteDato.findMany({ where: { tipo: "runsignup", externalId: { in: abiertas } }, select: { eventoId: true } });
        const eds = await prisma.edicion.findMany({
          where: { eventoId: { in: fuentes.map((f) => f.eventoId) }, fecha: { gte: new Date() }, estado: "SIN_CONFIRMAR" },
          select: { id: true, estado: true, ultimaVerificacion: true },
        });
        for (const ed of eds)
          anotar(cambios, {
            tabla: "Edicion",
            id: ed.id,
            campo: "estado",
            antes: ed.estado,
            despues: "ABIERTA",
            motivo: "RunSignup informa inscripción abierta",
            verificadaEn: ed.ultimaVerificacion?.toISOString() ?? null,
          });
      }
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  console.log(`· runsignup: ${cambios.length} inscripciones abiertas confirmadas`);
  if (!cambios.length) return;
  const archivo = archivoPlan(`runsignup-${new Date().toISOString().slice(0, 19).replace(/:/g, "")}`);
  escribirAtomico(archivo, JSON.stringify({ version: 2, paso: "runsignup", base: identificarBase().host, creado: new Date().toISOString(), cambios }, null, 1));
  const r = await aplicarPlan(cambios);
  console.log(`  aplicados ${r.aplicados} · respaldo ${archivo}`);
}

async function main() {
  const { host, nombre } = identificarBase();
  console.log(`Base: ${host}/${nombre} · modo: ${APLICAR ? "APLICAR" : "SIMULACIÓN (no escribe nada)"}`);
  if (APLICAR && host !== "localhost" && !process.argv.includes("--confirmo-produccion")) {
    throw new Error("Para aplicar contra una base que no es localhost hay que agregar --confirmo-produccion");
  }
  for (const p of PASOS) await ejecutarPaso(p);
  if (CON_RUNSIGNUP && APLICAR) await confirmarRunSignup();
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

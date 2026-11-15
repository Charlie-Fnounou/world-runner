import { prisma } from "./prisma";
import { normalizar } from "./text";

export function claveNombre(nombre: string): string {
  // "ı" (i turca sin punto) no se descompone con NFD: "Uluslararası" y
  // "ULUSLARARASI" quedaban como textos distintos.
  return normalizar(nombre)
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Misma ciudad, o una vacía, o una contiene a la otra ("Klosterneuburg" vs
// "Aupark Klosterneuburg"). Ciudades distintas = carreras distintas aunque
// se llamen igual (RunSignup tiene decenas de "Jingle Jog 5K" el mismo día).
export function ciudadesCompatibles(a: string, b: string): boolean {
  const x = claveNombre(a);
  const y = claveNombre(b);
  return !x || !y || x === y || x.includes(y) || y.includes(x);
}

export interface CandidatoDuplicado {
  id: string;
  nombre: string;
  ciudad: string;
  pais: string;
  fecha: string; // YYYY-MM-DD
  conFuente: boolean;
  datos: number; // cuántos campos útiles tiene (para elegir cuál queda)
  creadoEn: number;
}

// Agrupa los que son la misma carrera y devuelve, para cada sobrante,
// cuál queda como principal: la que tiene fuente que la actualiza sola,
// después la que tiene más datos, después la más vieja.
export function detectarDuplicados(lista: CandidatoDuplicado[]): Map<string, string> {
  const grupos = new Map<string, CandidatoDuplicado[]>();
  for (const c of lista) {
    const clave = `${c.pais}|${c.fecha}|${claveNombre(c.nombre)}`;
    const g = grupos.get(clave);
    if (g) g.push(c);
    else grupos.set(clave, [c]);
  }

  const resultado = new Map<string, string>();
  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    const ordenados = [...grupo].sort(
      (a, b) => Number(b.conFuente) - Number(a.conFuente) || b.datos - a.datos || a.creadoEn - b.creadoEn,
    );
    const asignados = new Set<string>();
    for (const principal of ordenados) {
      if (asignados.has(principal.id)) continue;
      asignados.add(principal.id);
      for (const otro of ordenados) {
        if (asignados.has(otro.id)) continue;
        if (ciudadesCompatibles(principal.ciudad, otro.ciudad)) {
          resultado.set(otro.id, principal.id);
          asignados.add(otro.id);
        }
      }
    }
  }
  return resultado;
}

// Solo lectura: qué carreras recientes o futuras son duplicadas y de cuál.
export async function buscarDuplicados(): Promise<Map<string, string>> {
  const desde = new Date(Date.now() - 30 * 864e5);
  const eventos = await prisma.evento.findMany({
    where: { duplicadoDeId: null, ediciones: { some: { fecha: { gte: desde } } } },
    select: {
      id: true,
      nombre: true,
      ciudad: true,
      pais: true,
      creadoEn: true,
      descripcion: true,
      sitioWeb: true,
      _count: { select: { fuentes: true } },
      ediciones: { where: { fecha: { gte: desde } }, select: { fecha: true, precioDesde: true, numCorredores: true } },
    },
  });

  const lista: CandidatoDuplicado[] = [];
  for (const e of eventos) {
    for (const ed of e.ediciones) {
      lista.push({
        id: e.id,
        nombre: e.nombre,
        ciudad: e.ciudad,
        pais: e.pais,
        fecha: ed.fecha.toISOString().slice(0, 10),
        conFuente: e._count.fuentes > 0,
        datos: [e.descripcion, e.sitioWeb, ed.precioDesde, ed.numCorredores].filter((v) => v != null && v !== "").length,
        creadoEn: e.creadoEn.getTime(),
      });
    }
  }

  return detectarDuplicados(lista);
}

// Marca (no borra) los duplicados de carreras recientes o futuras.
export async function marcarDuplicados(): Promise<{ marcados: number }> {
  const duplicados = await buscarDuplicados();
  for (const [id, principal] of duplicados) {
    await prisma.evento.update({ where: { id }, data: { duplicadoDeId: principal }, select: { id: true } });
  }
  return { marcados: duplicados.size };
}

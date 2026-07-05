import type { Carrera } from "./types";
import { normalizar } from "./text";

// Distancia de edición (Levenshtein) para tolerar errores de escritura,
// ej. "sidney" -> "sydney", "maraton berlim" -> "maratón berlín".
function distanciaEdicion(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

function puntajeToken(qt: string, tokens: string[], textoCompleto: string): number {
  if (textoCompleto.startsWith(qt)) return 4;
  if (textoCompleto.includes(qt)) return 3;
  for (const palabra of tokens) {
    if (palabra.startsWith(qt)) return 3;
    if (qt.length >= 4) {
      const tolerancia = qt.length >= 7 ? 2 : 1;
      if (distanciaEdicion(qt, palabra) <= tolerancia) return 2;
      if (
        palabra.length > qt.length &&
        distanciaEdicion(qt, palabra.slice(0, qt.length + 1)) <= tolerancia
      )
        return 2;
    }
  }
  return 0;
}

export function puntuarCarrera(r: Carrera, query: string): number {
  const qts = normalizar(query).split(/\s+/).filter(Boolean);
  if (!qts.length) return 1;
  const textoCompleto = normalizar(
    [r.name, r.city, r.country, r.continent, r.dist, r.type].join(" "),
  );
  const tokens = textoCompleto.split(/\s+/);
  let total = 0;
  for (const qt of qts) {
    const s = puntajeToken(qt, tokens, textoCompleto);
    if (s === 0) return 0;
    total += s;
  }
  return total;
}

export function buscarCarreras(carreras: Carrera[], query: string): Carrera[] {
  if (!query.trim()) return carreras;
  return carreras
    .map((r) => ({ r, s: puntuarCarrera(r, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.r);
}

export interface Sugerencia {
  tipo: "carrera" | "ciudad" | "pais";
  valor: string;
  carrera?: Carrera;
}

export function sugerir(carreras: Carrera[], query: string, limite = 8): Sugerencia[] {
  const q = query.trim();
  if (!q) return [];
  const coincidencias = buscarCarreras(carreras, q);
  const vistos = new Set<string>();
  const sugerencias: Sugerencia[] = [];
  for (const r of coincidencias) {
    if (sugerencias.length >= limite) break;
    const clave = "carrera:" + r.id;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    sugerencias.push({ tipo: "carrera", valor: r.name, carrera: r });
  }
  return sugerencias;
}

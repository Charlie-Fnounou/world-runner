import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de Minhas Inscrições (Brasil). En noviembre de 2026 el sitio
// se rehízo: el viejo /pt-br/Calendario/Filtro redirige a la portada (el
// robot venía devolviendo 0 carreras sin marcar error) y el calendario
// nuevo pagina con JavaScript, sin una API pública. Se leen las páginas
// que sí traen las carreras en el HTML: el calendario (las próximas) y
// "últimas vagas". Como corre todos los días, va sumando las carreras a
// medida que se acercan; no cubre todo el catálogo del sitio (~3.500).

const BASE_URL = "https://minhasinscricoes.com.br";
// Primero "últimas vagas": la propia fuente dice que quedan pocos cupos,
// así que esas sí llevan un estado confirmado (ULTIMOS_CUPOS).
const PAGINAS = [
  { ruta: "/ultimas-vagas", estado: "ULTIMOS_CUPOS" as const },
  { ruta: "/calendario", estado: undefined },
];

const MESES_PT: Record<string, number> = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };

export interface FilaMinhas {
  id: string;
  nombre: string;
  href: string;
  fecha: string; // "Sáb, 14 nov 2026"
  lugar: string; // "São Carlos - SP"
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

const TARJETA_REGEX =
  /<a href="([^"]+)"[^>]*data-mi-click="event" data-mi-id="([^"]+)"[^>]*>([^<]+)<\/a><\/h3>[\s\S]*?<span>([^<]*\d{4})<\/span>[\s\S]*?<span class="line-clamp-1">([^<]*)<\/span>/g;

export function parsearTarjetas(html: string): FilaMinhas[] {
  return [...html.matchAll(TARJETA_REGEX)].map((m) => ({
    href: m[1],
    id: m[2],
    nombre: decodificarHtml(m[3]),
    fecha: decodificarHtml(m[4]),
    lugar: decodificarHtml(m[5]),
  }));
}

export function fechaDesdeTexto(texto: string): Date | null {
  const m = normalizar(texto).match(/(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})/);
  if (!m) return null;
  const mes = MESES_PT[m[2]];
  if (!mes) return null;
  return new Date(`${m[3]}-${String(mes).padStart(2, "0")}-${m[1].padStart(2, "0")}T12:00:00Z`);
}

export function aCarreraExterna(fila: FilaMinhas): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || !fila.nombre) return null;
  const ciudad = fila.lugar.split(" - ")[0]?.trim() || "Brasil";

  return {
    fuenteTipo: "minhasinscricoes",
    fuenteNombre: "Minhas Inscrições",
    fuenteUrl: fila.href,
    externalId: fila.id,
    nombre: fila.nombre,
    ciudad,
    pais: "Brasil",
    codigoPais: "BR",
    continente: "AMERICA_DEL_SUR",
    lat: 0,
    lng: 0,
    sitioWeb: fila.href,
    anio: fecha.getUTCFullYear(),
    fecha,
    urlInscripcionOficial: fila.href,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorMinhasInscricoes() {
  return registrarEjecucion("minhasinscricoes", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;
    const vistas = new Set<string>();

    for (const { ruta, estado } of PAGINAS) {
      const res = await fetch(`${BASE_URL}${ruta}`, { headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" } });
      if (!res.ok) throw new Error(`Minhas Inscrições ${ruta} respondió ${res.status}`);
      for (const fila of parsearTarjetas(await res.text())) {
        if (vistas.has(fila.id)) continue;
        vistas.add(fila.id);
        try {
          const base = aCarreraExterna(fila);
          const externa = base && estado ? { ...base, estado } : base;
          if (!externa) {
            errores++;
            continue;
          }
          const { creada } = await upsertCarreraExterna(externa);
          if (creada) nuevas++;
          else actualizadas++;
        } catch {
          errores++;
        }
      }
    }

    return { nuevas, actualizadas, errores };
  });
}

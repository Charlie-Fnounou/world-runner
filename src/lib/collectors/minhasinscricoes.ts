import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { prisma } from "@/lib/prisma";
import type { CarreraExterna } from "./types";

// Recolector de Minhas Inscrições (minhasinscricoes.com.br), la mayor
// plataforma de inscripción a carreras de Brasil (organizadores como
// Yescom la usan como motor). HTML server-rendered, sin robots.txt que
// lo prohíba. Tiene ~15 páginas de 20 carreras cada una: se pagina con
// EstadoCollector (mismo patrón que FIDAL) para ir cubriendo todo el
// catálogo semana a semana en vez de repetir siempre las mismas.

const BASE_URL = "https://minhasinscricoes.com.br";

interface FilaMinhas {
  id: string;
  nombre: string;
  fecha: string; // DD/MM/YYYY
  lugar: string;
}

const FILA_REGEX =
  /data-view-idevento=(\d+)>[\s\S]*?<h5 class="titulo-destaque">([^<]*)<\/h5>[\s\S]*?fa-calendar-alt"><\/i>\s*(\d{2}\/\d{2}\/\d{4})<\/p>\s*<p>\s*<i class="fa fa-map-marker"><\/i>\s*<span>([^<]*)<\/span>/g;

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parsearFilas(html: string): FilaMinhas[] {
  const filas: FilaMinhas[] = [];
  const re = new RegExp(FILA_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    filas.push({ id: m[1], nombre: decodificarHtml(m[2]), fecha: m[3], lugar: decodificarHtml(m[4]) });
  }
  return filas;
}

async function fetchPagina(pagina: number, hoyTexto: string): Promise<string> {
  const url = new URL(`${BASE_URL}/pt-br/Calendario/Filtro`);
  url.searchParams.set("pagina", String(pagina));
  url.searchParams.set("Valor", "0,500");
  url.searchParams.set("PesquisaDataInicio", hoyTexto);
  url.searchParams.set("PesquisaDataFim", "31/12/9999");
  url.searchParams.set("exclusivo", "False");
  url.searchParams.set("internacional", "False");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
  });
  if (!res.ok) throw new Error(`Minhas Inscrições respondió ${res.status}`);
  return res.text();
}

function fechaDesdeTexto(texto: string): Date | null {
  const [dia, mes, anio] = texto.split("/").map(Number);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00Z`);
}

function aCarreraExterna(fila: FilaMinhas): CarreraExterna | null {
  const fecha = fechaDesdeTexto(fila.fecha);
  if (!fecha || !fila.nombre) return null;

  const urlCompleta = `${BASE_URL}/pt-br/evento/${fila.id}`;
  const ciudad = fila.lugar.split(",")[0]?.trim() || "Brasil";

  return {
    fuenteTipo: "minhasinscricoes",
    fuenteNombre: "Minhas Inscrições",
    fuenteUrl: urlCompleta,
    externalId: fila.id,
    nombre: fila.nombre,
    ciudad,
    pais: "Brasil",
    codigoPais: "BR",
    continente: "AMERICA_DEL_SUR",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }],
  };
}

const COLLECTOR_ID = "minhasinscricoes";
const PAGINAS_POR_CORRIDA = 3;
const HORIZONTE_PAGINAS = 15; // el sitio hoy tiene ~15 páginas

export async function correrCollectorMinhasInscricoes() {
  return registrarEjecucion("minhasinscricoes", async () => {
    const estado = await prisma.estadoCollector.findUnique({ where: { collector: COLLECTOR_ID } });
    let inicio = (estado?.cursor ?? 0) + 1;
    if (inicio > HORIZONTE_PAGINAS) inicio = 1;

    const hoy = new Date();
    const hoyTexto = `${String(hoy.getDate()).padStart(2, "0")}/${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`;

    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;
    let ultimaPagina = inicio - 1;

    for (let i = 0; i < PAGINAS_POR_CORRIDA; i++) {
      const pagina = inicio + i;
      if (pagina > HORIZONTE_PAGINAS) break;

      try {
        const html = await fetchPagina(pagina, hoyTexto);
        const filas = parsearFilas(html);
        if (filas.length === 0) break;

        for (const fila of filas) {
          try {
            const externa = aCarreraExterna(fila);
            if (!externa) continue;
            const { creada } = await upsertCarreraExterna(externa);
            if (creada) nuevas++;
            else actualizadas++;
          } catch {
            errores++;
          }
        }
      } catch {
        errores++;
      }

      ultimaPagina = pagina;
      await new Promise((r) => setTimeout(r, 400));
    }

    await prisma.estadoCollector.upsert({
      where: { collector: COLLECTOR_ID },
      update: { cursor: ultimaPagina },
      create: { collector: COLLECTOR_ID, cursor: ultimaPagina },
    });

    return { nuevas, actualizadas, errores };
  });
}

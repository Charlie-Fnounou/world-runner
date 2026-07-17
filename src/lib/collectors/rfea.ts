import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import type { CarreraExterna } from "./types";

// Recolector de la RFEA (Real Federación Española de Atletismo),
// atletismorfea.es/calendario — el calendario oficial de competiciones
// de atletismo de España. robots.txt (Drupal estándar) solo bloquea
// /admin/, /user/login, /core/, /profiles/, etc.: /calendario y su
// endpoint AJAX no están restringidos.
//
// Nota: se investigó primero ClubRunning.es (descartada, es de pago) y
// luego RockTheSport (la plataforma líder de inscripciones en España),
// pero su robots.txt bloquea explícitamente a "ClaudeBot" y declara
// "Content-Signal: ai-train=no" — una señal clara de que el operador
// del sitio no quiere que sistemas de IA como este recolecten su
// contenido, así que se descartó por respeto a esa política aunque el
// User-Agent de producción (WorldRunnerBot) no esté nombrado ahí.
//
// La página /calendario es una Drupal View que cambia de mes con AJAX
// (ver /modules/custom/calendario/js/calendar.js). El endpoint es:
//   /ajax/calendario/{timestamp}/{tipo}/{area}/{disciplina}/{ranking}/{categoria}/{temporada}/{fecha_ini}/{fecha_fin}/{titulo}
// - {timestamp} (segundos unix) determina qué mes se devuelve.
// - {tipo}="Deportivo" trae competiciones deportivas (la otra opción,
//   "Eventos internas RFEA", es papeleo federativo interno).
// - Se probó filtrar por {temporada} (ID interno del año) pero con
//   cualquier valor distinto de "0" el endpoint siempre devolvía "No
//   hay resultados disponibles" (posible bug del propio sitio); con
//   "0" en esa posición y en el resto de filtros funciona bien y trae
//   todo el mes sin restricción de temporada.
// - El calendario incluye TODAS las disciplinas (Pista, Marcha, Cross,
//   Ruta, Trail Running...). Este recolector se queda solo con "Ruta"
//   y "Trail Running", que son las carreras populares/de calle (medias
//   maratones, maratones, 10K, trail...); se descartan pista cubierta,
//   marcha atlética, cross y campeonatos indoor por no ser del tipo de
//   carrera que interesa a este directorio.

const URL_AJAX_BASE = "https://atletismorfea.es/ajax/calendario";
const URL_BASE = "https://atletismorfea.es";
const MESES_A_RECORRER = 13; // mes actual + 12 meses hacia adelante
const CONCURRENCIA = 8; // upserts en simultáneo por mes, para no tardar minutos en corridas con muchas competiciones

const MESES_ES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const DISCIPLINAS_VALIDAS = new Set(["Ruta", "Trail Running"]);

interface ItemRfea {
  href: string;
  dia: number;
  disciplina: string;
  titulo: string;
  ubicacion: string;
}

function decodificarHtml(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, cod) => String.fromCodePoint(Number(cod)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

// Extrae mes y año del encabezado del calendario, ej. "<span>Julio
// 2026</span>", y devuelve todos los items de ese mes agrupados por
// día (los bloques "calendar-day" están muy anidados como para usar
// una sola regex no-greedy, así que se separan por el marcador de
// apertura de cada día).
function parsearMes(html: string): { mes: number; anio: number; items: ItemRfea[] } | null {
  const cabecera = html.match(/<span>([A-Za-zÀ-ÿ]+)\s+(\d{4})<\/span>/);
  if (!cabecera) return null;
  const mes = MESES_ES[cabecera[1].toLowerCase()];
  const anio = Number(cabecera[2]);
  if (!mes || !anio) return null;

  const items: ItemRfea[] = [];
  const bloquesDia = html.split('<div class="calendar-day">').slice(1);

  for (const bloque of bloquesDia) {
    const dia = Number(bloque.match(/<div class="monthday">(\d{1,2})<\/div>/)?.[1]);
    if (!dia) continue;

    const itemRegex = /<a href="([^"]+)">\s*<article class="event[^"]*">([\s\S]*?)<\/article>/g;
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(bloque))) {
      const [, href, contenido] = m;
      const disciplina = decodificarHtml(contenido.match(/<p class="event__discipline">([^<]*)<\/p>/)?.[1] ?? "");
      const titulo = decodificarHtml(contenido.match(/<p class="event__title">([^<]*)<\/p>/)?.[1] ?? "");
      const ubicacion = decodificarHtml(contenido.match(/<span class="event__location">([^<]*)<\/span>/)?.[1] ?? "");
      if (!titulo) continue;
      items.push({ href, dia, disciplina, titulo, ubicacion });
    }
  }

  return { mes, anio, items };
}

function ciudadDesdeUbicacion(ubicacion: string): string {
  // La RFEA agrega sufijos de instalación tipo "Madrid-VLL",
  // "Castellón-MGH", "Palma de Mallorca-PRI"; se recorta ese sufijo
  // para quedarse con el nombre de la ciudad.
  const limpio = ubicacion.replace(/-[A-ZÑ]{2,6}$/, "").trim();
  return limpio || "España";
}

function kmDesdeTitulo(titulo: string): { km: number; tipo: TipoDistancia } {
  const t = titulo.toLowerCase();
  if (/\bmilla\b/.test(t)) return { km: 1.609, tipo: TipoDistancia.OTRA };
  if (/media\s+marat[oó]n|medio\s+marat[oó]n/.test(t)) return { km: 21.097, tipo: TipoDistancia.MEDIA_MARATON };
  if (/\bmarat[oó]n\b/.test(t)) return { km: 42.195, tipo: TipoDistancia.MARATON };

  const mKm = t.match(/(\d+(?:[.,]\d+)?)\s*k(?:il[oó]metros?|m)\b/i);
  const mK = t.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
  const km = mKm ? parseFloat(mKm[1].replace(",", ".")) : mK ? parseFloat(mK[1].replace(",", ".")) : 0;

  if (km <= 0) return { km: 0, tipo: TipoDistancia.OTRA };
  if (km <= 6) return { km, tipo: TipoDistancia.KM_5 };
  if (km <= 12) return { km, tipo: TipoDistancia.KM_10 };
  if (km <= 17) return { km, tipo: TipoDistancia.KM_15 };
  if (km <= 22) return { km, tipo: TipoDistancia.KM_20 };
  if (km <= 27) return { km, tipo: TipoDistancia.KM_25 };
  if (km <= 35) return { km, tipo: TipoDistancia.KM_30 };
  if (km <= 43) return { km, tipo: TipoDistancia.MARATON };
  return { km, tipo: TipoDistancia.ULTRA };
}

function aCarreraExterna(item: ItemRfea, mes: number, anio: number): CarreraExterna | null {
  if (!DISCIPLINAS_VALIDAS.has(item.disciplina)) return null;

  const externalId = item.href.match(/\/calendario\/campeonato\/([a-z0-9-]+)/)?.[1];
  if (!externalId) return null;

  const fecha = new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(item.dia).padStart(2, "0")}T10:00:00Z`);
  const urlCompleta = item.href.startsWith("http") ? item.href : `${URL_BASE}${item.href}`;
  const { km, tipo } = kmDesdeTitulo(item.titulo);

  return {
    fuenteTipo: "rfea",
    fuenteNombre: "RFEA — Calendario oficial",
    fuenteUrl: urlCompleta,
    externalId,
    nombre: item.titulo,
    ciudad: ciudadDesdeUbicacion(item.ubicacion),
    pais: "España",
    codigoPais: "ES",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: urlCompleta,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlCompleta,
    distancias: [{ tipo, km, terreno: item.disciplina === "Trail Running" ? "TRAIL" : "ASFALTO" }],
  };
}

export async function correrCollectorRfea() {
  return registrarEjecucion("rfea", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const hoy = new Date();
    const vistos = new Set<string>(); // evita reprocesar el mismo evento (multi-jornada) más de una vez por corrida

    for (let i = 0; i < MESES_A_RECORRER; i++) {
      const fechaDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + i, 15);
      const timestamp = Math.floor(fechaDelMes.getTime() / 1000);
      const url = `${URL_AJAX_BASE}/${timestamp}/Deportivo/0/0/0/0/0/0/0`;

      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
        });
        if (!res.ok) throw new Error(`RFEA respondió ${res.status}`);
        const data = await res.json();
        const html = String(data?.[0]?.data ?? "");
        const mes = parsearMes(html);
        if (!mes) continue;

        const porProcesar = mes.items.filter((item) => {
          const externa = aCarreraExterna(item, mes.mes, mes.anio);
          if (!externa) return false;
          if (externa.fecha < hoy && i === 0) return false; // salta carreras ya pasadas del mes actual
          if (vistos.has(externa.externalId)) return false;
          vistos.add(externa.externalId);
          return true;
        });

        for (let inicioLote = 0; inicioLote < porProcesar.length; inicioLote += CONCURRENCIA) {
          const lote = porProcesar.slice(inicioLote, inicioLote + CONCURRENCIA);
          const resultados = await Promise.all(
            lote.map(async (item) => {
              try {
                const externa = aCarreraExterna(item, mes.mes, mes.anio);
                if (!externa) return "error";
                const { creada } = await upsertCarreraExterna(externa);
                return creada ? "nueva" : "actualizada";
              } catch {
                return "error";
              }
            }),
          );
          for (const r of resultados) {
            if (r === "nueva") nuevas++;
            else if (r === "actualizada") actualizadas++;
            else errores++;
          }
        }
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}

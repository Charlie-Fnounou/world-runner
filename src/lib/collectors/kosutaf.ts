import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de kosu.taf.org.tr, la plataforma oficial de inscripción
// a carreras de ruta de la TAF (Türkiye Atletizm Federasyonu, la
// federación turca de atletismo) — es un subdominio propio de la
// federación (no un revendedor externo). robots.txt de
// kosu.taf.org.tr devuelve 404 (no existe), lo que equivale a "sin
// restricciones" según el estándar. El taf.org.tr "grande" (portal
// institucional) sí existe pero su calendario está solo como PDF
// descargable, no sirve para parsear; en cambio kosu.taf.org.tr trae
// las carreras como tarjetas HTML server-rendered en la portada, con
// fecha, ciudad, distancia y link de inscripción en texto plano — no
// hace falta JavaScript.
//
// La home trae ~90 tarjetas de una sola vez (pasadas y futuras, sin
// paginar), cada una como:
//   <div class="event-card ..." data-status="open"
//        data-title="NOMBRE" data-location="CIUDAD">
//     ...<span>calendar_today</span> "11 Ekim 2026" </span>...
//     ...<span>location_on</span> "Ankara" </span>...
//     ...<span>straighten</span> "21K" </span>...
//     ...<a href="yarisma_detay.php?id=58">İncele</a>
//   </div>
// Las carreras ya completadas ("Tamamlandı") no traen el link con id
// numérico — para esas se arma un externalId con fecha+nombre en vez
// de descartarlas.
//
// Turquía se guarda con continente EUROPA (no ASIA) para mantener
// consistencia con paisDesdeCodigoIso en src/lib/paises.ts, que ya
// clasifica TR así.

const URL_HOME = "https://kosu.taf.org.tr/";
const BASE_URL = "https://kosu.taf.org.tr/";

const MESES: Record<string, number> = {
  ocak: 1,
  şubat: 2,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayıs: 5,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  ağustos: 8,
  agustos: 8,
  eylül: 9,
  eylul: 9,
  ekim: 10,
  kasım: 11,
  kasim: 11,
  aralık: 12,
  aralik: 12,
};

interface TarjetaKosu {
  titulo: string;
  ubicacion: string;
  fechaTexto: string;
  distanciaTexto: string;
  id: string | null;
}

function extraerTarjetas(html: string): TarjetaKosu[] {
  const inicios: number[] = [];
  const re = /data-title="/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) inicios.push(m.index);
  inicios.push(html.length);

  const tarjetas: TarjetaKosu[] = [];
  for (let i = 0; i < inicios.length - 1; i++) {
    const trozo = html.slice(inicios[i], inicios[i + 1]);
    const cab = trozo.match(/^data-title="([^"]+)"\s+data-location="([^"]+)">/);
    if (!cab) continue;
    const fecha = trozo.match(/calendar_today<\/span>\s*([^<]+?)\s*<\/span>/);
    const distancia = trozo.match(/straighten<\/span>\s*([^<]+?)\s*<\/span>/);
    const id = trozo.match(/yarisma_detay\.php\?id=(\d+)/);
    if (!fecha) continue;
    tarjetas.push({
      titulo: cab[1].trim(),
      ubicacion: cab[2].trim(),
      fechaTexto: fecha[1].trim(),
      distanciaTexto: distancia?.[1]?.trim() ?? "",
      id: id?.[1] ?? null,
    });
  }
  return tarjetas;
}

function fechaDesdeTexto(texto: string): Date | null {
  const m = texto.match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = MESES[m[2].toLowerCase()];
  const anio = Number(m[3]);
  if (!dia || !mes || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T09:00:00Z`);
}

function kmDesdeTexto(texto: string): number {
  const metros = texto.match(/(\d+(?:[.,]\d+)?)\s*Metre/i);
  if (metros) return parseFloat(metros[1].replace(",", ".")) / 1000;
  const km = texto.match(/(\d+(?:[.,]\d+)?)\s*K(?:M)?\b/i);
  if (km) return parseFloat(km[1].replace(",", "."));
  return 0;
}

function tipoDistanciaDesdeKm(km: number): TipoDistancia {
  if (km <= 0) return TipoDistancia.OTRA;
  if (km <= 6) return TipoDistancia.KM_5;
  if (km <= 12) return TipoDistancia.KM_10;
  if (km <= 17) return TipoDistancia.KM_15;
  if (km <= 20.5) return TipoDistancia.KM_20;
  if (km <= 22) return TipoDistancia.MEDIA_MARATON;
  if (km <= 27) return TipoDistancia.KM_25;
  if (km <= 35) return TipoDistancia.KM_30;
  if (km <= 43) return TipoDistancia.MARATON;
  return TipoDistancia.ULTRA;
}

function aCarreraExterna(t: TarjetaKosu): CarreraExterna | null {
  const fecha = fechaDesdeTexto(t.fechaTexto);
  if (!fecha || !t.titulo) return null;

  const externalId = t.id ?? `${normalizar(t.fechaTexto)}-${normalizar(t.titulo)}`.replace(/[^a-z0-9]+/g, "-").slice(0, 140);
  const urlDetalle = t.id ? `${BASE_URL}yarisma_detay.php?id=${t.id}` : BASE_URL;
  const km = kmDesdeTexto(t.distanciaTexto);

  return {
    fuenteTipo: "kosu_taf",
    fuenteNombre: "TAF Yol Yarışları (kosu.taf.org.tr)",
    fuenteUrl: URL_HOME,
    externalId,
    nombre: t.titulo,
    ciudad: t.ubicacion || "Türkiye",
    pais: "Turquía",
    codigoPais: "TR",
    continente: "EUROPA",
    lat: 0,
    lng: 0,
    sitioWeb: urlDetalle,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: urlDetalle,
    distancias: [{ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" }],
  };
}

export async function correrCollectorKosuTaf() {
  return registrarEjecucion("kosu_taf", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_HOME, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`kosu.taf.org.tr respondió ${res.status}`);
    const html = await res.text();
    const tarjetas = extraerTarjetas(html);

    for (const t of tarjetas) {
      try {
        const externa = aCarreraExterna(t);
        if (!externa) continue;
        const { creada } = await upsertCarreraExterna(externa);
        if (creada) nuevas++;
        else actualizadas++;
      } catch {
        errores++;
      }
    }

    return { nuevas, actualizadas, errores };
  });
}

import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector del sitio oficial de CRDB Bank Foundation
// (crdbbankfoundation.co.tz) para el CRDB Bank Marathon, carrera anual
// en Dar es Salaam organizada por el banco más grande de Tanzania. Es
// una fuente primaria distinta de los dos miembros AIMS ya cubiertos
// por aims-tz.ts (Kilimanjaro Marathon en Moshi y Stop GBV Half
// Marathon en Zanzíbar): el CRDB Bank Marathon no es una carrera
// certificada AIMS, así que no se duplica.
//
// No se encontró una federación tanzana con calendario propio
// scrapeable (Athletics Tanzania solo tiene blog en Blogspot y redes
// sociales, sin sitio propio) ni una plataforma local de
// timing/inscripción con varias carreras (se investigaron Zanzibar
// International Marathon —sin fecha publicada en HTML y con
// inscripción en una SPA de React sin contenido en el HTML crudo— y
// Zanzi Half —la propia página dice "ON PAUSE INDEFINITELY", sin
// próxima edición—). El sitio de CRDB Bank Foundation sí publica la
// fecha de su maratón como texto plano en la home, así que es la única
// fuente nueva scrapeable encontrada para Tanzania.
//
// robots.txt de crdbbankfoundation.co.tz permite todo salvo /private/
// ("Allow: /" + "Disallow: /private/"), y la home no está bajo esa
// ruta.
//
// Es un sitio de una sola carrera anual (como lagoscitymarathon.ts):
// se scrapea la home completa buscando la fecha ("CRDB Bank Marathon
// Date: Sunday, August 16, 2026") y las distancias mencionadas en el
// texto ("full marathon, half marathon, and fun run"). La distancia
// exacta del "fun run" no se publica en ningún lado del sitio, así que
// se guarda sin km conocido (OTRA) en vez de adivinar un valor.

const URL_SITIO = "https://crdbbankfoundation.co.tz/";
const NOMBRE = "CRDB Bank Marathon";
const CODIGO_PAIS = "TZ";
const FUENTE_TIPO = "crdbbankmarathon";

const MESES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

// "CRDB Bank Marathon Date: Sunday, August 16, 2026" — se ancla al
// texto "CRDB Bank Marathon Date" para no confundirse con la fecha del
// concierto "iMbeju: Sauti Moja" que aparece justo arriba en la misma
// página.
const FECHA_REGEX =
  /CRDB Bank Marathon Date:\s*[A-Za-z]+,\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/i;

function fechaDesdeHtml(html: string): Date | null {
  const m = html.match(FECHA_REGEX);
  if (!m) return null;
  const mes = MESES[m[1].toLowerCase()];
  const dia = Number(m[2]);
  const anio = Number(m[3]);
  if (!mes || !dia || !anio) return null;
  return new Date(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T09:00:00Z`);
}

// La home describe las distancias en texto libre ("the full marathon,
// half marathon, and fun run") en vez de listarlas como números — se
// detectan por palabra clave. El "fun run" no trae distancia publicada
// en ningún lado del sitio, así que queda como OTRA (km: 0) en vez de
// asumir un valor.
function distanciasDesdeHtml(html: string): { tipo: TipoDistancia; km: number; terreno: "ASFALTO" }[] {
  const distancias: { tipo: TipoDistancia; km: number; terreno: "ASFALTO" }[] = [];
  if (/full marathon/i.test(html)) distancias.push({ tipo: TipoDistancia.MARATON, km: 42.195, terreno: "ASFALTO" });
  if (/half marathon/i.test(html)) distancias.push({ tipo: TipoDistancia.MEDIA_MARATON, km: 21.0975, terreno: "ASFALTO" });
  if (/fun run/i.test(html)) distancias.push({ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" });
  if (distancias.length === 0) distancias.push({ tipo: TipoDistancia.MARATON, km: 42.195, terreno: "ASFALTO" });
  return distancias;
}

function aCarreraExterna(html: string): CarreraExterna | null {
  const fecha = fechaDesdeHtml(html);
  if (!fecha) return null;

  const { pais, continente } = paisDesdeCodigoIso(CODIGO_PAIS);

  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "CRDB Bank Marathon (sitio oficial de CRDB Bank Foundation)",
    fuenteUrl: URL_SITIO,
    externalId: `${fecha.getFullYear()}`,
    nombre: NOMBRE,
    ciudad: "Dar es Salaam",
    pais,
    codigoPais: CODIGO_PAIS,
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: URL_SITIO,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: URL_SITIO,
    distancias: distanciasDesdeHtml(html),
  };
}

export async function correrCollectorCrdbBankMarathon() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_SITIO, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`crdbbankfoundation.co.tz respondió ${res.status}`);
    const html = await res.text();

    try {
      const externa = aCarreraExterna(html);
      if (!externa) {
        errores++;
      } else {
        const { creada } = await upsertCarreraExterna(externa);
        if (creada) nuevas++;
        else actualizadas++;
      }
    } catch {
      errores++;
    }

    return { nuevas, actualizadas, errores };
  });
}

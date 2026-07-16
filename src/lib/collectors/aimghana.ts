import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { paisDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Recolector del Accra International Marathon (AIM), la maratón más
// antigua y más grande de Ghana (corre desde 2007). No se encontró un
// calendario nacional scrapeable: la Ghana Athletics Association no
// tiene sitio propio con carreras de calle (solo noticias de pista en
// athletics.africa), y el otro candidato ghanés (Absa Black Star
// Marathon, blackstarmarathon.com) todavía no tenía fecha confirmada
// para 2026 ("2026 RACE DAY TO BE ANNOUNCED") al momento de escribir
// este collector, así que no había nada parseable ahí.
//
// El sitio oficial aimghana.com (sin robots.txt — la ruta devuelve un
// 200 con una página "This Page Does Not Exist", sin ninguna directiva
// Disallow real, igual que el caso de ethiopianrun.org) no publica la
// fecha del año en curso en texto plano scrapeable: el único bloque con
// fecha en el HTML servido está comentado y desactualizado (edición
// pasada). Lo que sí hace de forma consistente todos los años es
// enlazar el botón "Register Now" a la página del evento en ACTIVE
// Network (activenetwork.com / active.com), la plataforma de
// inscripción que usa AIM — no es un agregador de carreras de terceros,
// es la plataforma de registro oficial enlazada directamente desde el
// sitio del organizador (mismo tipo de fuente que ya usan runsignup.ts
// y runsignup-auth.ts en este proyecto). Esa página trae los datos de
// la edición vigente en JSON-LD (schema.org/Event), así que se scrapea
// en dos pasos: 1) aimghana.com para encontrar el link "aim-AAAA"
// vigente, 2) esa página de active.com para sacar fecha, distancias y
// precios en JSON estructurado.
//
// robots.txt de active.com no prohíbe la ruta de eventos individuales
// (solo /register/, /page/, /explorer/, etc., rutas de otras
// secciones del sitio).

const URL_SITIO = "https://aimghana.com/";
const URL_INDEX = "https://aimghana.com/index.php";
const NOMBRE = "Accra International Marathon";
const FUENTE_TIPO = "aimghana";

const REGEX_LINK_ACTIVE = /https:\/\/www\.active\.com\/[a-z0-9-]+\/running\/distance-running-races\/aim-\d{4}/i;

interface OfferLd {
  name?: string;
  price?: number;
  priceCurrency?: string;
}

interface EventLd {
  startDate?: string;
  offers?: OfferLd[];
}

function extraerJsonLdEvento(html: string): EventLd | null {
  const bloques = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (!bloques) return null;
  for (const bloque of bloques) {
    const contenido = bloque.replace(/<\/?script[^>]*>/g, "").trim();
    try {
      const data = JSON.parse(contenido);
      if (data && data["@type"] === "Event") return data as EventLd;
    } catch {
      // sigue con el próximo bloque si este no es JSON válido
    }
  }
  return null;
}

// "42K - Marathon" / "21K - Half-Marathon" / "10K - 10K" / "5K - 5K"
// -> km reales (42K y 21K son en realidad la distancia oficial de
// maratón y media maratón, no exactamente 42 y 21).
function kmDesdeOferta(nombre: string): number | null {
  const m = nombre.match(/^(\d+(?:\.\d+)?)\s*K/i);
  if (!m) return null;
  const valor = parseFloat(m[1]);
  if (valor >= 41 && valor <= 43) return 42.195;
  if (valor >= 20.5 && valor <= 21.5) return 21.0975;
  return valor;
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

function aCarreraExterna(urlActive: string, evento: EventLd): CarreraExterna | null {
  if (!evento.startDate) return null;
  const fecha = new Date(evento.startDate);
  if (Number.isNaN(fecha.getTime())) return null;

  const { pais, continente } = paisDesdeCodigoIso("GH");
  const anioMatch = urlActive.match(/aim-(\d{4})/i);
  const externalId = anioMatch ? anioMatch[1] : String(fecha.getFullYear());

  const distancias = new Map<number, TipoDistancia>();
  let precioDesde: number | undefined;
  let moneda: string | undefined;
  for (const oferta of evento.offers ?? []) {
    if (!oferta.name) continue;
    const km = kmDesdeOferta(oferta.name);
    if (km && km > 0) distancias.set(km, tipoDistanciaDesdeKm(km));
    if (typeof oferta.price === "number" && (precioDesde === undefined || oferta.price < precioDesde)) {
      precioDesde = oferta.price;
      moneda = oferta.priceCurrency;
    }
  }
  if (distancias.size === 0) distancias.set(42.195, TipoDistancia.MARATON);

  return {
    fuenteTipo: FUENTE_TIPO,
    fuenteNombre: "Accra International Marathon (sitio oficial aimghana.com, registro vía ACTIVE Network)",
    fuenteUrl: URL_SITIO,
    externalId,
    nombre: NOMBRE,
    ciudad: "Accra",
    pais,
    codigoPais: "GH",
    continente,
    lat: 0,
    lng: 0,
    sitioWeb: URL_SITIO,
    anio: fecha.getFullYear(),
    fecha,
    precioDesde,
    moneda,
    urlInscripcionOficial: urlActive,
    distancias: [...distancias.entries()].map(([km, tipo]) => ({ tipo, km, terreno: "ASFALTO" as const })),
  };
}

export async function correrCollectorAimGhana() {
  return registrarEjecucion(FUENTE_TIPO, async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const resIndex = await fetch(URL_INDEX, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!resIndex.ok) throw new Error(`aimghana.com respondió ${resIndex.status}`);
    const htmlIndex = await resIndex.text();

    const linkActive = htmlIndex.match(REGEX_LINK_ACTIVE)?.[0];
    if (!linkActive) {
      // No se encontró el link de inscripción vigente: no hay nada que
      // insertar en este run (puede que la próxima edición todavía no
      // se haya publicado).
      return { nuevas, actualizadas, errores };
    }

    try {
      const resActive = await fetch(linkActive, {
        headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
      });
      if (!resActive.ok) throw new Error(`active.com respondió ${resActive.status}`);
      const htmlActive = await resActive.text();
      const evento = extraerJsonLdEvento(htmlActive);
      if (!evento) {
        errores++;
      } else {
        const externa = aCarreraExterna(linkActive, evento);
        if (!externa) {
          errores++;
        } else {
          const { creada } = await upsertCarreraExterna(externa);
          if (creada) nuevas++;
          else actualizadas++;
        }
      }
    } catch {
      errores++;
    }

    return { nuevas, actualizadas, errores };
  });
}

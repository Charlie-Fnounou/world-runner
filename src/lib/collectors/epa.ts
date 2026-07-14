import { TipoDistancia } from "@prisma/client";
import { upsertCarreraExterna, registrarEjecucion } from "./upsert";
import { normalizar } from "@/lib/text";
import type { CarreraExterna } from "./types";

// Recolector de Eastern Province Athletics (epathletics.co.za), la
// federación provincial de atletismo del Cabo Oriental, Sudáfrica,
// afiliada a Athletics South Africa (ASA).
//
// Se usa esta federación provincial y no la nacional (ASA) porque el
// dominio histórico de ASA (athletics.org.za) está caído (apunta a un
// App Service de Azure sin configurar, error 404 en toda la home) y su
// dominio nuevo (athleticssa.org.za) tiene la sección "Road Running
// EVENTS" vacía (sin ninguna carrera cargada al momento de revisar).
// EPA sí publica un calendario real y activo con el plugin "Events
// Calendar", que expone un feed iCal público y bien estructurado.
//
// robots.txt de epathletics.co.za solo bloquea /wp-admin/, así que
// /events/?ical=1 está permitido sin restricciones.
//
// El feed es chico (un puñado de carreras próximas a la vez), así que
// se procesa completo en cada corrida, sin necesitar cursor.

const URL_ICAL = "https://epathletics.co.za/events/?ical=1";
const URL_CALENDARIO = "https://epathletics.co.za/events-calendar/";

interface EventoIcs {
  uid: string;
  resumen: string;
  fechaTexto: string; // "20260801T070000"
  ubicacion: string;
  categorias: string;
  url: string;
}

// Las líneas de un .ics vienen "plegadas": una línea lógica puede seguir
// en la siguiente línea física si esta arranca con un espacio o tab
// (RFC 5545). Hay que desplegarlas antes de parsear campo por campo.
function desplegarLineas(ics: string): string[] {
  const lineasCrudas = ics.split(/\r\n|\n|\r/);
  const lineas: string[] = [];
  for (const linea of lineasCrudas) {
    if ((linea.startsWith(" ") || linea.startsWith("\t")) && lineas.length > 0) {
      lineas[lineas.length - 1] += linea.slice(1);
    } else {
      lineas.push(linea);
    }
  }
  return lineas;
}

function desescaparTextoIcs(texto: string): string {
  return texto
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .replace(/\s+/g, " ")
    .trim();
}

function parsearIcs(ics: string): EventoIcs[] {
  const lineas = desplegarLineas(ics);
  const eventos: EventoIcs[] = [];
  let actual: Partial<EventoIcs> | null = null;

  for (const lineaCompleta of lineas) {
    if (lineaCompleta === "BEGIN:VEVENT") {
      actual = { uid: "", resumen: "", fechaTexto: "", ubicacion: "", categorias: "", url: "" };
      continue;
    }
    if (lineaCompleta === "END:VEVENT") {
      if (actual && actual.fechaTexto && actual.resumen) {
        eventos.push(actual as EventoIcs);
      }
      actual = null;
      continue;
    }
    if (!actual) continue;

    const idxDosPuntos = lineaCompleta.indexOf(":");
    if (idxDosPuntos === -1) continue;
    const clave = lineaCompleta.slice(0, idxDosPuntos);
    const valor = lineaCompleta.slice(idxDosPuntos + 1);

    if (clave.startsWith("DTSTART")) {
      const m = valor.match(/(\d{8})T(\d{6})/);
      if (m) actual.fechaTexto = `${m[1]}T${m[2]}`;
    } else if (clave === "SUMMARY") {
      actual.resumen = desescaparTextoIcs(valor);
    } else if (clave === "LOCATION") {
      actual.ubicacion = desescaparTextoIcs(valor);
    } else if (clave === "CATEGORIES") {
      actual.categorias = desescaparTextoIcs(valor);
    } else if (clave === "URL") {
      actual.url = valor.trim();
    } else if (clave === "UID") {
      actual.uid = valor.trim();
    }
  }

  return eventos;
}

function fechaDesdeIcs(fechaTexto: string): Date | null {
  const m = fechaTexto.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  const [, anio, mes, dia, hora, min, seg] = m;
  // Los eventos de EPA están en horario de Sudáfrica (SAST, UTC+2) todo
  // el año (sin horario de verano), así que se arma como offset fijo.
  const iso = `${anio}-${mes}-${dia}T${hora}:${min}:${seg}+02:00`;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function ciudadDesdeUbicacion(ubicacion: string): string {
  if (!ubicacion) return "Eastern Cape, South Africa";
  // Ej: "Baywest Mall, 100 Baywest Boulevard, Port Elizabeth, Eastern Cape, 6001, South Africa"
  const partes = ubicacion.split(",").map((p) => p.trim()).filter(Boolean);
  const conocidas = ["Port Elizabeth", "Gqeberha", "East London", "Uitenhage", "Kariega", "Grahamstown", "Makhanda", "Jeffreys Bay"];
  for (const parte of partes) {
    if (conocidas.some((c) => parte.toLowerCase().includes(c.toLowerCase()))) return parte;
  }
  return partes.length >= 3 ? partes[partes.length - 3] : ubicacion;
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

function distanciasDesdeTexto(texto: string): { tipo: TipoDistancia; km: number; terreno: "ASFALTO" }[] {
  const numeros = [...texto.matchAll(/(\d{1,3}(?:[.,]\d{1,2})?)\s*km/gi)].map((m) => parseFloat(m[1].replace(",", ".")));
  const unicos = [...new Set(numeros)].filter((n) => n > 0 && n < 250);
  if (unicos.length === 0) return [{ tipo: TipoDistancia.OTRA, km: 0, terreno: "ASFALTO" }];
  return unicos.map((km) => ({ tipo: tipoDistanciaDesdeKm(km), km, terreno: "ASFALTO" as const }));
}

// Filtra disciplinas de pista/campo, marcha atlética y cross country
// federado que no son "carreras de running" abiertas al público; solo
// se queda con la categoría explícita "Road Running" que EPA le pone a
// cada evento.
function esCarreraDeRuta(evento: EventoIcs): boolean {
  return /road running/i.test(evento.categorias);
}

function aCarreraExterna(evento: EventoIcs): CarreraExterna | null {
  const fecha = fechaDesdeIcs(evento.fechaTexto);
  if (!fecha || !evento.resumen) return null;

  const externalIdBase = evento.uid ? normalizar(evento.uid).replace(/[^a-z0-9]+/g, "-") : `${evento.fechaTexto}-${normalizar(evento.resumen).replace(/[^a-z0-9]+/g, "-")}`;
  const externalId = externalIdBase.slice(0, 150);

  return {
    fuenteTipo: "epa",
    fuenteNombre: "Eastern Province Athletics (EPA)",
    fuenteUrl: URL_CALENDARIO,
    externalId,
    nombre: evento.resumen,
    ciudad: ciudadDesdeUbicacion(evento.ubicacion),
    pais: "Sudáfrica",
    codigoPais: "ZA",
    continente: "AFRICA",
    lat: 0,
    lng: 0,
    sitioWeb: evento.url || URL_CALENDARIO,
    anio: fecha.getFullYear(),
    fecha,
    urlInscripcionOficial: evento.url || URL_CALENDARIO,
    distancias: distanciasDesdeTexto(evento.resumen),
  };
}

export async function correrCollectorEpa() {
  return registrarEjecucion("epa", async () => {
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;

    const res = await fetch(URL_ICAL, {
      headers: { "User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)" },
    });
    if (!res.ok) throw new Error(`EPA respondió ${res.status}`);
    const ics = await res.text();
    const eventos = parsearIcs(ics).filter(esCarreraDeRuta);

    for (const evento of eventos) {
      try {
        const externa = aCarreraExterna(evento);
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

    return { nuevas, actualizadas, errores };
  });
}

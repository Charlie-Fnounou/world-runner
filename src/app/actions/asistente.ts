"use server";

import { getCarreras } from "@/lib/races-data";
import type { Idioma } from "@/lib/i18n";

export interface RecomendacionIA {
  id: string;
  reason: string;
}

export interface RespuestaAsistente {
  intro: string;
  recs: RecomendacionIA[];
}

export type ResultadoAsistente =
  | { ok: true; data: RespuestaAsistente }
  | { ok: false; error: "no-configurado" | "consulta-vacia" | "error-api" };

// Google Gemini (modelos "Flash"): tiene un nivel gratis real, sin
// tarjeta, con cupo de sobra para el tráfico de este sitio.
const MODELO = "gemini-flash-latest";

function claveConfigurada(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.length > 10);
}

// Una fila por carrera, separada por "|" en vez de JSON repitiendo los
// nombres de campo en cada carrera — con ~4000 carreras eso es la
// diferencia entre mandar cientos de miles de tokens de más o no.
// También se manda solo lo que tiene sentido recomendar: carreras con
// inscripción todavía vigente (no "cerrada"), que de paso ya excluye
// las que ya pasaron de fecha.
function datasetCompacto(carreras: Awaited<ReturnType<typeof getCarreras>>) {
  const limpiar = (s: string) => (s || "").replace(/\|/g, "-").replace(/\n/g, " ");
  const vigentes = carreras.filter((r) => r.status !== "cerrada");
  const filas = vigentes.map((r) =>
    [
      r.id,
      limpiar(r.name),
      `${limpiar(r.city)}, ${limpiar(r.country)}`,
      r.date,
      r.km,
      r.dist,
      r.type,
      `${r.cur}${r.price || ""}`,
      r.temp || "",
      r.elev || "",
      r.status,
      r.rating || "",
      r.diff || "",
      r.major ? "S" : "",
    ].join("|"),
  );
  return { total: vigentes.length, texto: filas.join("\n") };
}

// El dataset de carreras (nombres de ciudad/país, estados, etc.) sigue en
// español sin importar el idioma elegido — son datos, no texto de la UI.
// Lo único que cambia con el idioma es en qué idioma redacta Gemini su
// respuesta (intro + razones de cada recomendación).
const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: "español",
  en: "English",
  pt: "português (Brasil)",
  fr: "français",
};

export async function preguntarAsistente(query: string, idioma: Idioma = "es"): Promise<ResultadoAsistente> {
  if (!query.trim()) return { ok: false, error: "consulta-vacia" };
  if (!claveConfigurada()) return { ok: false, error: "no-configurado" };

  const carreras = await getCarreras();
  const { texto: dataset } = datasetCompacto(carreras);

  const hoy = new Date().toISOString().slice(0, 10);
  const prompt = `Eres el asistente experto de World Runner, una plataforma para descubrir carreras de running.
Hoy es ${hoy}.
Carreras disponibles (una por línea, campos separados por "|"):
id|nombre|ciudad, pais|fecha|km|tipo_distancia|superficie|precio|tempC|desnivel_m|estado_inscripcion|rating|dificultad|es_major
${dataset}

Petición del usuario: "${query}"

Recomienda entre 2 y 5 carreras de la lista que mejor cumplan la petición, considerando fecha, precio, clima, desnivel, dificultad, estado de inscripción y ubicación. Si pide un plan con varias carreras, espacialas con recuperación razonable entre fechas.

Importante: redacta tu respuesta (intro y razones) enteramente en ${NOMBRE_IDIOMA[idioma]}, sin importar en qué idioma esté escrita la petición del usuario.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                intro: { type: "STRING", description: `1-2 frases en ${NOMBRE_IDIOMA[idioma]} resumiendo la recomendación` },
                recs: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: { type: "STRING", description: "id exacto de la carrera, tal cual aparece en la lista" },
                      reason: { type: "STRING", description: `por qué encaja, en 1-2 frases en ${NOMBRE_IDIOMA[idioma]}` },
                    },
                    required: ["id", "reason"],
                  },
                },
              },
              required: ["intro", "recs"],
            },
          },
        }),
      },
    );
    if (!res.ok) return { ok: false, error: "error-api" };

    const data = await res.json();
    const texto: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) return { ok: false, error: "error-api" };

    const parsed = JSON.parse(texto) as RespuestaAsistente;
    parsed.recs = (parsed.recs ?? []).filter((rec) => carreras.some((r) => r.id === rec.id));

    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: "error-api" };
  }
}

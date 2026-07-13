"use server";

import { getCarreras } from "@/lib/races-data";

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

function claveConfigurada(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return Boolean(key && !key.startsWith("sk-ant-..."));
}

export async function preguntarAsistente(query: string): Promise<ResultadoAsistente> {
  if (!query.trim()) return { ok: false, error: "consulta-vacia" };
  if (!claveConfigurada()) return { ok: false, error: "no-configurado" };

  const carreras = await getCarreras();
  const dataset = carreras.map((r) => ({
    id: r.id,
    n: r.name,
    lugar: `${r.city}, ${r.country} (${r.continent})`,
    fecha: r.date,
    km: r.km,
    tipo: r.dist,
    sup: r.type,
    precio: `${r.cur}${r.price}`,
    tempC: r.temp,
    desnivel_m: r.elev,
    estado: r.status,
    rating: r.rating,
    dificultad: r.diff,
    major: r.major,
  }));

  const hoy = new Date().toISOString().slice(0, 10);
  const prompt = `Eres el asistente experto de World Runner, una plataforma para descubrir carreras de running.
Hoy es ${hoy}.
Base de datos de carreras (JSON): ${JSON.stringify(dataset)}

Petición del usuario: "${query}"

Recomienda entre 2 y 5 carreras de la base de datos que mejor cumplan la petición, considerando fecha, precio, clima, desnivel, dificultad, estado de inscripción y ubicación. Si pide un plan anual, ordena las carreras con recuperación razonable entre ellas.
Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional, con esta forma exacta:
{"intro":"1-2 frases en español resumiendo tu recomendación","recs":[{"id":"id_exacto_de_la_base","reason":"por qué encaja, en 1-2 frases en español"}]}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { ok: false, error: "error-api" };

    const data = await res.json();
    const texto = (data.content ?? [])
      .map((b: { text?: string }) => b.text ?? "")
      .join("")
      .replace(/```json|```/g, "")
      .trim();
    const parsed = JSON.parse(texto) as RespuestaAsistente;
    parsed.recs = (parsed.recs ?? []).filter((rec) => carreras.some((r) => r.id === rec.id));

    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: "error-api" };
  }
}

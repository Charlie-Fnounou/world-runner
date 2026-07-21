import { prisma } from "@/lib/prisma";

// Mismo modelo gratis que usa el asistente de IA (ver actions/asistente.ts):
// nivel gratis real de Google Gemini, sin tarjeta.
const MODELO = "gemini-flash-latest";

// Cuántas descripciones se mandan juntas en cada request a Gemini (en vez
// de una request por carrera, que con miles de carreras agotaría la cuota
// gratis en minutos) y cuánto se espera entre requests para no pasarse del
// límite de peticiones por minuto del nivel gratis.
const LOTE = 20;
const PAUSA_ENTRE_LOTES_MS = 4300;

function claveConfigurada(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.length > 10);
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TraduccionLote {
  id: string;
  en: string;
  pt: string;
  fr: string;
}

async function traducirLote(items: { id: string; texto: string }[]): Promise<TraduccionLote[] | null> {
  const prompt = `Traduce cada descripción de carrera de running del español a inglés (en), portugués de Brasil (pt) y francés (fr). Mantené el mismo tono promocional/informativo y una extensión similar a la original. No agregues información que no esté en el texto original.

${JSON.stringify(items)}`;

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
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING", description: "el mismo id recibido, sin modificar" },
                  en: { type: "STRING" },
                  pt: { type: "STRING" },
                  fr: { type: "STRING" },
                },
                required: ["id", "en", "pt", "fr"],
              },
            },
          },
        }),
      },
    );
    if (!res.ok) return null;

    const data = await res.json();
    const texto: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) return null;

    return JSON.parse(texto) as TraduccionLote[];
  } catch {
    return null;
  }
}

// Traduce las descripciones de carreras que todavía no tienen alguna de
// las 3 traducciones (EN/PT/FR). Se llama sola todos los días desde el
// cron (ver route.ts) para que las carreras nuevas que traen los
// collectors queden traducidas sin que nadie tenga que acordarse de
// hacerlo — mismo patrón de autocorrección que sanidad.ts.
export async function traducirDescripcionesFaltantes(limiteCarreras = 200) {
  if (!claveConfigurada()) return { traducidas: 0, motivo: "sin-clave-gemini" };

  const pendientes = await prisma.evento.findMany({
    where: {
      descripcion: { not: null },
      OR: [{ descripcionEn: null }, { descripcionPt: null }, { descripcionFr: null }],
    },
    select: { id: true, descripcion: true },
    take: limiteCarreras,
  });

  // Las que tienen descripción vacía ("") no tienen nada que traducir:
  // se marcan igual como "resueltas" para que no se vuelvan a consultar
  // en cada corrida del cron.
  const vacias = pendientes.filter((e) => !e.descripcion?.trim());
  if (vacias.length > 0) {
    await prisma.evento.updateMany({
      where: { id: { in: vacias.map((e) => e.id) } },
      data: { descripcionEn: "", descripcionPt: "", descripcionFr: "" },
    });
  }

  const conTexto = pendientes.filter((e) => e.descripcion?.trim());
  let traducidas = 0;

  for (let i = 0; i < conTexto.length; i += LOTE) {
    const lote = conTexto.slice(i, i + LOTE).map((e) => ({ id: e.id, texto: (e.descripcion ?? "").slice(0, 500) }));

    const traducciones = await traducirLote(lote);
    if (traducciones) {
      await Promise.all(
        traducciones.map((t) =>
          prisma.evento
            .update({
              where: { id: t.id },
              data: { descripcionEn: t.en, descripcionPt: t.pt, descripcionFr: t.fr },
            })
            .catch(() => null),
        ),
      );
      traducidas += traducciones.length;
    }

    if (i + LOTE < conTexto.length) await esperar(PAUSA_ENTRE_LOTES_MS);
  }

  return { traducidas, marcadasVacias: vacias.length };
}

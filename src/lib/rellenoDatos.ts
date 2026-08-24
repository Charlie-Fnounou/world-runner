import { prisma } from "@/lib/prisma";

// Mismo modelo gratis que el resto de las funciones de IA del proyecto
// (asistente, traducciones, agente de recolectores).
const MODELO = "gemini-flash-latest";

// Acá SÍ hace falta una consulta a internet por carrera (no se puede
// resolver en lote como las traducciones): cada carrera tiene su propio
// precio/cupo/desnivel publicados en su propia página. Por eso el límite
// semanal es bajo — no es por falta de interés, es para no agotar la
// cuota gratis de Gemini en una sola corrida.
const LIMITE_SEMANAL = 40;
const PAUSA_ENTRE_CARRERAS_MS = 4300;

// Corre dentro del mismo cron que ~90 collectors + traducciones + otros
// pasos, todo con un límite duro de 300s (ver maxDuration en route.ts).
// Con la pausa entre carreras, 40 candidatas podrían tardar varios
// minutos — este tope corta el paso antes de tiempo si hace falta, para
// no arriesgar que el cron entero se corte a la mitad un lunes.
const PRESUPUESTO_MS = 100_000;

function claveConfigurada(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.length > 10);
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini devuelve 503 ("mucha demanda") de vez en cuando — es transitorio,
// vale la pena reintentar antes de darse por vencido con esa carrera
// (mismo criterio que scripts/agente-recolectores/procesar.mjs).
async function fetchConReintentos(url: string, opciones: RequestInit, intentos = 3): Promise<Response> {
  let ultimaRespuesta: Response;
  for (let i = 0; i < intentos; i++) {
    ultimaRespuesta = await fetch(url, opciones);
    if (ultimaRespuesta.status !== 503 || i === intentos - 1) return ultimaRespuesta;
    await esperar(5000 * 2 ** i);
  }
  return ultimaRespuesta!;
}

interface CarreraParaRevisar {
  edicionId: string;
  eventoId: string;
  nombre: string;
  pais: string;
  ciudad: string;
  fecha: Date;
  sitioWeb: string | null;
  descripcion: string | null;
  precioDesde: number | null;
  numCorredores: number | null;
  cuposTotales: number | null;
  desnivelPositivoM: number | null;
  tiempoLimite: string | null;
}

interface DatosEncontrados {
  precioDesde?: number;
  moneda?: string;
  numCorredores?: number;
  desnivelPositivoM?: number;
  tiempoLimite?: string;
  descripcion?: string;
}

// Le pide a Gemini que busque de verdad en internet (grounding con Google
// Search, no inventar de memoria) los datos puntuales que le faltan a esta
// carrera. Devuelve solo lo que encontró — nunca inventa un número para
// rellenar un hueco, porque un dato falso es peor que un guion en la UI.
async function buscarDatosCarrera(c: CarreraParaRevisar): Promise<DatosEncontrados | null> {
  const faltantes: string[] = [];
  if (c.precioDesde === null) faltantes.push("precio de inscripción (número) y moneda (código de 3 letras, ej. USD, EUR, MXN)");
  if (c.numCorredores === null && c.cuposTotales === null) faltantes.push("cupo total de corredores (número entero)");
  if (c.desnivelPositivoM === null) faltantes.push("desnivel positivo de la distancia principal en metros (número entero)");
  if (c.tiempoLimite === null) faltantes.push("tiempo límite para completarla (texto corto, ej. '6 horas')");
  if (!c.descripcion?.trim()) faltantes.push("una descripción breve de la carrera en español (2-3 frases, tono informativo)");

  if (faltantes.length === 0) return null;

  const prompt = `Buscá en internet (usá la búsqueda, no inventes de memoria) información real y actual sobre esta carrera de running:

Nombre: ${c.nombre}
País: ${c.pais}
Ciudad: ${c.ciudad}
Fecha: ${c.fecha.toISOString().slice(0, 10)}
${c.sitioWeb ? `Sitio oficial: ${c.sitioWeb}` : "(no tenemos sitio oficial guardado, buscá el nombre de la carrera)"}

Necesito específicamente esto, si lo encontrás publicado (si no lo encontrás, escribí un guion "-" en ese campo — NUNCA inventes ni estimes un número):
${faltantes.map((f) => `- ${f}`).join("\n")}

Respondé ÚNICAMENTE en este formato exacto, sin nada más antes ni después:

PRECIO: <número o ->
MONEDA: <código o ->
CUPO: <número o ->
DESNIVEL: <número o ->
TIEMPO_LIMITE: <texto corto o ->
DESCRIPCION: <texto o ->`;

  try {
    const res = await fetchConReintentos(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.2 },
        }),
      },
    );
    if (!res.ok) return null;

    const data = await res.json();
    const texto: string | undefined = data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text)
      .filter(Boolean)
      .join("");
    if (!texto) return null;

    const leer = (etiqueta: string) => texto.match(new RegExp(`${etiqueta}:\\s*(.+)`))?.[1]?.trim();
    const esVacio = (v: string | undefined) => !v || v === "-" || v.toLowerCase() === "n/a";

    const precioTxt = leer("PRECIO");
    const monedaTxt = leer("MONEDA");
    const cupoTxt = leer("CUPO");
    const desnivelTxt = leer("DESNIVEL");
    const tiempoTxt = leer("TIEMPO_LIMITE");
    const descripcionTxt = leer("DESCRIPCION");

    const resultado: DatosEncontrados = {};
    const precio = esVacio(precioTxt) ? undefined : parseFloat((precioTxt ?? "").replace(/[^\d.]/g, ""));
    if (precio && !isNaN(precio) && !esVacio(monedaTxt)) {
      resultado.precioDesde = precio;
      resultado.moneda = monedaTxt!.toUpperCase().slice(0, 3);
    }
    const cupo = esVacio(cupoTxt) ? undefined : parseInt((cupoTxt ?? "").replace(/[^\d]/g, ""), 10);
    if (cupo && !isNaN(cupo)) resultado.numCorredores = cupo;
    const desnivel = esVacio(desnivelTxt) ? undefined : parseInt((desnivelTxt ?? "").replace(/[^\d]/g, ""), 10);
    if (desnivel && !isNaN(desnivel)) resultado.desnivelPositivoM = desnivel;
    if (!esVacio(tiempoTxt)) resultado.tiempoLimite = tiempoTxt!.slice(0, 40);
    if (!esVacio(descripcionTxt)) resultado.descripcion = descripcionTxt!.slice(0, 600);

    return resultado;
  } catch {
    return null;
  }
}

// Recorre carreras futuras con datos vacíos y le pide a la IA que busque
// en internet lo que falta — mismo espíritu de autocorrección que
// sanidad.ts/traducciones.ts, pero para huecos que ningún collector pudo
// llenar porque la fuente original no los publicaba. Se llama 1 vez por
// semana desde el cron (ver route.ts): con miles de carreras en el
// catálogo, ir de a poco y rotar (ultimaRevisionIA) es lo que permite
// terminar "revisando toda la web" con el tiempo, sin agotar la cuota
// gratis de un saque.
export async function rellenarDatosFaltantes(limite = LIMITE_SEMANAL) {
  if (!claveConfigurada()) return { revisadas: 0, completadas: 0, motivo: "sin-clave-gemini" };

  const candidatas = await prisma.edicion.findMany({
    where: {
      fecha: { gte: new Date() },
      OR: [
        { precioDesde: null },
        { AND: [{ numCorredores: null }, { cuposTotales: null }] },
        { desnivelPositivoM: null },
        { tiempoLimite: null },
        { evento: { descripcion: null } },
        { evento: { descripcion: "" } },
      ],
    },
    select: {
      id: true,
      eventoId: true,
      fecha: true,
      precioDesde: true,
      numCorredores: true,
      cuposTotales: true,
      desnivelPositivoM: true,
      tiempoLimite: true,
      evento: { select: { nombre: true, pais: true, ciudad: true, sitioWeb: true, descripcion: true } },
    },
    orderBy: [{ ultimaRevisionIA: { sort: "asc", nulls: "first" } }, { fecha: "asc" }],
    take: limite,
  });

  let completadas = 0;
  let revisadas = 0;
  const inicio = Date.now();

  for (let i = 0; i < candidatas.length; i++) {
    if (Date.now() - inicio > PRESUPUESTO_MS) break;
    revisadas++;
    const c = candidatas[i];
    const datos = await buscarDatosCarrera({
      edicionId: c.id,
      eventoId: c.eventoId,
      nombre: c.evento.nombre,
      pais: c.evento.pais,
      ciudad: c.evento.ciudad,
      fecha: c.fecha,
      sitioWeb: c.evento.sitioWeb,
      descripcion: c.evento.descripcion,
      precioDesde: c.precioDesde,
      numCorredores: c.numCorredores,
      cuposTotales: c.cuposTotales,
      desnivelPositivoM: c.desnivelPositivoM,
      tiempoLimite: c.tiempoLimite,
    });

    try {
      if (datos && Object.keys(datos).length > 0) {
        const { descripcion, ...datosEdicion } = datos;
        if (Object.keys(datosEdicion).length > 0) {
          await prisma.edicion.update({ where: { id: c.id }, data: { ...datosEdicion, ultimaRevisionIA: new Date() } });
        } else {
          await prisma.edicion.update({ where: { id: c.id }, data: { ultimaRevisionIA: new Date() } });
        }
        if (descripcion) {
          await prisma.evento.update({ where: { id: c.eventoId }, data: { descripcion } });
        }
        completadas++;
      } else {
        await prisma.edicion.update({ where: { id: c.id }, data: { ultimaRevisionIA: new Date() } });
      }
    } catch {
      // Si falla el guardado (carrera borrada mientras tanto, etc.) se
      // sigue con la próxima en vez de cortar toda la corrida semanal.
    }

    if (i + 1 < candidatas.length) await esperar(PAUSA_ENTRE_CARRERAS_MS);
  }

  return { revisadas, completadas };
}

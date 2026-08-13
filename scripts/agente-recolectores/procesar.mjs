#!/usr/bin/env node
// Ver README.md en esta misma carpeta para la explicación completa.
// Sin dependencias de npm a propósito: solo Node built-ins + fetch nativo,
// para que el workflow de GitHub Actions no necesite instalar nada.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUEUE_PATH = path.join(__dirname, "candidatos.json");
const DESCARTADOS_PATH = path.join(__dirname, "descartados.json");
const EJEMPLO_PATH = path.join(__dirname, "../../src/lib/collectors/runningcalendar-au.ts");
const TIPOS_PATH = path.join(__dirname, "../../src/lib/collectors/types.ts");
const COLLECTORS_DIR = path.join(__dirname, "../../src/lib/collectors");
const ROUTE_PATH = path.join(__dirname, "../../src/app/api/cron/collectors/route.ts");

// Agregadores/revendedores que este proyecto nunca scrapea (ver AGENTS.md
// y los comentarios éticos en los collectors existentes) — no son fuentes
// primarias, revenden inscripciones de organizadores de todo el mundo.
const BLACKLIST = [
  "ahotu.com",
  "finishers.com",
  "running.life",
  "race-calendar.com",
  "myraceland.com",
  "runme.com",
  "worldsmarathons.com",
  "findarace.com",
];

const MODELO = "gemini-flash-latest";
const ADVERTENCIA = `// ⚠️ BORRADOR GENERADO POR EL AGENTE AUTOMÁTICO — NO PROBADO TODAVÍA.
// Nadie lo revisó ni lo corrió todavía. No está conectado a route.ts ni a
// robots.ts, así que no hace nada hasta que alguien lo revise a mano, lo
// pruebe (npx tsx) y recién después lo active. Ver scripts/agente-recolectores/README.md.
`;

function guardarCola(cola) {
  writeFileSync(QUEUE_PATH, JSON.stringify(cola, null, 2) + "\n");
}

function leerDescartados() {
  if (!existsSync(DESCARTADOS_PATH)) return [];
  try {
    return JSON.parse(readFileSync(DESCARTADOS_PATH, "utf8"));
  } catch {
    return [];
  }
}

function agregarDescartado(pais, motivo) {
  const descartados = leerDescartados();
  descartados.push({ pais, motivo, fecha: new Date().toISOString().slice(0, 10) });
  writeFileSync(DESCARTADOS_PATH, JSON.stringify(descartados, null, 2) + "\n");
}

// Lee route.ts y saca los nombres de país de los comentarios "// País" al
// lado de cada entrada de COLLECTORES — así el descubrimiento sabe qué ya
// está cubierto sin necesitar acceso a la base de datos (este script no
// tiene DATABASE_URL disponible, ni falta que le haga).
function paisesCubiertos() {
  const contenido = readFileSync(ROUTE_PATH, "utf8");
  const paises = new Set();
  const re = /frecuencia:\s*"(?:diaria|semanal)"\s*},?\s*\/\/\s*([^(\n]+)/g;
  let m;
  while ((m = re.exec(contenido))) {
    const nombre = m[1]
      .trim()
      .replace(/\s*\(.*$/, "")
      .replace(/\s*—.*$/, "");
    if (nombre) paises.add(nombre);
  }
  return [...paises];
}

// Le pide a Gemini que busque de verdad en internet (grounding con Google
// Search, no inventar de memoria) un país sin cubrir con una fuente real y
// ética. Devuelve null si no encontró nada confiable — en ese caso el
// workflow simplemente no hace nada esa semana, no es un error.
async function descubrirCandidato(key) {
  const cubiertos = paisesCubiertos();
  const descartados = leerDescartados();

  const prompt = `Buscá en internet (usá la búsqueda, no inventes de memoria) UN país que TODAVÍA NO esté en esta lista de países ya cubiertos por The World Runner:

${cubiertos.join(", ")}

${descartados.length > 0 ? `Estos países/fuentes ya se intentaron antes y no funcionaron — no los vuelvas a sugerir salvo que encuentres una fuente distinta a la que falló:\n${descartados.map((d) => `- ${d.pais}: ${d.motivo}`).join("\n")}\n` : ""}

Encontrale UNA fuente real de datos de carreras de running para ese país: puede ser la federación nacional de atletismo, un calendario comunitario dedicado a ese país (no global), o el sitio de un club/organizador con calendario propio.

PROHIBIDO sugerir cualquier página de estos sitios (son revendedores globales de inscripciones, no fuentes primarias): ${BLACKLIST.join(", ")}.

La fuente tiene que:
- Ser un sitio real que exista (verificalo buscando, no supongas la URL).
- Publicar fechas y nombres de carreras en HTML visible (no una app que solo funciona con JavaScript, hasta donde puedas juzgar por la búsqueda).
- No ser un revendedor global de inscripciones.

Respondé ÚNICAMENTE en este formato exacto, sin nada más antes ni después:

PAIS: <nombre del país en español>
CODIGO: <código ISO de 2 letras>
URL: <la URL exacta que encontraste>
NOTAS: <1-2 frases sobre qué es esta fuente y por qué la elegiste>

Si de verdad no encontrás ninguna fuente confiable después de buscar, respondé únicamente: SIN_RESULTADOS`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.4 },
      }),
    },
  );

  if (!res.ok) {
    console.error(`Gemini (descubrimiento) respondió ${res.status}: ${(await res.text()).slice(0, 500)}`);
    return null;
  }

  const data = await res.json();
  const texto = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join("");

  if (!texto || texto.includes("SIN_RESULTADOS")) {
    console.log("Gemini no encontró ningún país nuevo confiable esta vez.");
    return null;
  }

  const pais = texto.match(/PAIS:\s*(.+)/)?.[1]?.trim();
  const codigoPais = texto.match(/CODIGO:\s*([A-Za-z]{2})/)?.[1]?.trim().toUpperCase();
  const url = texto.match(/URL:\s*(\S+)/)?.[1]?.trim();
  const notas = texto.match(/NOTAS:\s*(.+)/)?.[1]?.trim();

  if (!pais || !codigoPais || !url || !url.startsWith("http")) {
    console.error("La respuesta de descubrimiento no vino en el formato esperado:\n" + texto.slice(0, 800));
    return null;
  }

  if (BLACKLIST.some((dominio) => url.includes(dominio))) {
    console.log(`Gemini sugirió un dominio de la lista negra (${url}), se descarta.`);
    agregarDescartado(pais, `Sugirió un dominio en la lista negra: ${url}`);
    return null;
  }

  console.log(`Descubrimiento encontró: ${pais} (${codigoPais}) — ${url}`);
  return { pais, codigoPais, url, notas: notas || "" };
}

// Mismo enfoque que src/lib/text.ts (quitarAcentos): recorrer code points
// en vez de un rango regex con caracteres unicode literales, para evitar
// bugs de codificación.
function sinAcentos(texto) {
  let resultado = "";
  for (const ch of texto.normalize("NFD")) {
    const code = ch.codePointAt(0) ?? 0;
    const esDiacritico = code >= 0x0300 && code <= 0x036f;
    if (!esDiacritico) resultado += ch;
  }
  return resultado;
}

function slugify(pais) {
  return sinAcentos(pais)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.length < 10) {
    console.error("Falta GEMINI_API_KEY (o está vacía) en el entorno.");
    process.exit(1);
  }

  let cola = JSON.parse(readFileSync(QUEUE_PATH, "utf8"));

  // Si no hay nada cargado a mano, el agente busca un país nuevo por su
  // cuenta (grounding real con Google Search, no inventado) en vez de
  // quedarse sin hacer nada — así no hace falta que nadie esté cargando
  // candidatos.json manualmente semana a semana.
  if (cola.length === 0) {
    console.log("Cola vacía: el agente va a buscar un país nuevo por su cuenta.");
    const descubierto = await descubrirCandidato(key);
    if (!descubierto) {
      console.log("No se encontró ningún candidato nuevo confiable esta semana. Nada más que hacer.");
      return;
    }
    cola = [descubierto];
    guardarCola(cola);
  }

  const candidato = cola[0];
  console.log(`Procesando candidato: ${candidato.pais} (${candidato.url})`);

  // Se descarga identificándose honestamente como WorldRunnerBot — igual
  // que va a hacerlo el collector generado, y que todos los demás
  // collectors del repo. Si una fuente nos bloquea así, el candidato se
  // descarta en vez de intentar esquivarlo con un User-Agent falso (ver
  // el comentario ético en marrakechmarathon.ts): puede ser un bloqueo a
  // bots en general o algo específico contra IA, y no nos corresponde
  // sortear ninguno de los dos casos.
  const USER_AGENT = "WorldRunnerBot/1.0 (+https://theworldrunner.com)";

  let html;
  try {
    const resHtml = await fetch(candidato.url, { headers: { "User-Agent": USER_AGENT } });
    if (!resHtml.ok) throw new Error(`HTTP ${resHtml.status}`);
    html = await resHtml.text();
  } catch (e) {
    console.error(`No se pudo descargar ${candidato.url}: ${e}`);
    agregarDescartado(candidato.pais, `Fuente no accesible (${candidato.url}): ${e}`);
    cola.shift();
    guardarCola(cola);
    console.log("Se descartó el candidato (fuente no accesible con nuestro User-Agent real) para no reintentar en loop.");
    return;
  }

  // No hace falta mandar el documento entero al modelo — recorta costo y
  // evita pasarse del límite de tokens de entrada.
  html = html.slice(0, 60000);

  const ejemplo = readFileSync(EJEMPLO_PATH, "utf8");
  const tipos = readFileSync(TIPOS_PATH, "utf8");

  const prompt = `Sos un generador de "collectors" (recolectores de datos) para The World Runner, un directorio mundial de carreras de running (Next.js + TypeScript + Prisma).

Definición del tipo que tiene que producir cualquier collector:

\`\`\`typescript
${tipos}
\`\`\`

Te paso el código de un collector YA EXISTENTE y funcionando en este mismo repo (src/lib/collectors/runningcalendar-au.ts), como referencia OBLIGATORIA de estilo y estructura a seguir:

\`\`\`typescript
${ejemplo}
\`\`\`

Ahora escribí un collector nuevo para:
- País: ${candidato.pais}
- Código de país ISO: ${candidato.codigoPais}
- Fuente: ${candidato.url}
- Notas: ${candidato.notas || "(sin notas adicionales)"}

Acá está el HTML real que devuelve esa página ahora mismo (puede venir recortado) — basate ÚNICAMENTE en esto, no inventes clases/selectores que no aparecen acá:

\`\`\`html
${html}
\`\`\`

Reglas estrictas:
1. Seguí EXACTAMENTE el mismo estilo del ejemplo: nombres de funciones y variables en español, comentarios en español explicando decisiones no obvias (igual de concisos que el ejemplo, sin explicar lo obvio), mismo uso de upsertCarreraExterna/registrarEjecucion, mismo shape de CarreraExterna.
2. El nombre de la función exportada tiene que empezar con "correrCollector" seguido de PascalCase descriptivo (ej. correrCollectorRunningCalendarIe).
3. Usá regex sobre el HTML — NO uses ningún parser DOM (cheerio, jsdom, etc.): este proyecto no los tiene instalados y los collectors existentes siempre parsean con regex.
4. El fetch del collector SIEMPRE tiene que identificarse honestamente con el header \`"User-Agent": "WorldRunnerBot/1.0 (+https://theworldrunner.com)"\` — NUNCA un User-Agent de navegador spoofeado ni de otro bot. El HTML que te paso abajo ya se descargó así (si estás viéndolo, es porque esa fuente nos permite acceder identificados de esta forma). Si en algún momento hiciera falta esquivar un bloqueo cambiando de identidad, la respuesta correcta es NO_VIABLE, no disfrazarse — ver el comentario ético en src/lib/collectors/marrakechmarathon.ts para el criterio exacto que sigue este proyecto.
5. Si el HTML pegado arriba NO tiene información real suficiente para armar un parser confiable (ej. el listado se carga por JavaScript del lado del cliente y no aparece en el HTML crudo), respondé ÚNICAMENTE con el texto "NO_VIABLE: " seguido de una razón breve, sin nada más.
6. Si SÍ es viable, respondé ÚNICAMENTE con el código TypeScript completo del archivo — sin explicación antes ni después, sin bloques de markdown (nada de \`\`\`).
7. Lo primero del archivo, antes que cualquier import, tiene que ser textualmente esto:

${ADVERTENCIA}
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    },
  );

  if (!res.ok) {
    console.error(`Gemini respondió ${res.status}: ${(await res.text()).slice(0, 500)}`);
    process.exit(1);
  }

  const data = await res.json();
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) {
    console.error("Gemini no devolvió texto útil. Respuesta cruda: " + JSON.stringify(data).slice(0, 500));
    process.exit(1);
  }

  const limpio = texto.trim();

  if (limpio.startsWith("NO_VIABLE")) {
    console.log(`Candidato descartado por el modelo: ${limpio}`);
    agregarDescartado(candidato.pais, limpio.replace(/^NO_VIABLE:\s*/, ""));
    cola.shift();
    guardarCola(cola);
    return;
  }

  const codigo = limpio
    .replace(/^```(?:typescript|ts)?\n?/, "")
    .replace(/```\s*$/, "")
    .trim();

  const slug = slugify(candidato.pais);
  const archivo = path.join(COLLECTORS_DIR, `${slug}.ts`);

  if (existsSync(archivo)) {
    console.log(`Ya existe ${archivo} — se descarta el candidato para no pisar un collector existente.`);
    cola.shift();
    guardarCola(cola);
    return;
  }

  writeFileSync(archivo, codigo + "\n");
  console.log(`Borrador escrito: ${archivo}`);

  cola.shift();
  guardarCola(cola);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

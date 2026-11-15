import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { soltarCandado, tomarCandado } from "@/lib/cronLock";
import { FUENTES_PAUSADAS } from "@/lib/collectors/pausadas";
import { COLLECTORES } from "@/lib/collectors/lista";
import { enriquecerCarrerasRunSignup } from "@/lib/collectors/runsignup";
import { corregirCalidadDeDatos } from "@/lib/sanidad";
import { traducirDescripcionesFaltantes } from "@/lib/traducciones";
import { rellenarDatosFaltantes } from "@/lib/rellenoDatos";
import { enviarResumenesUbicacion } from "@/lib/resumenesUbicacion";

// Los collectors pueden tardar varios minutos (cientos de carreras, una
// consulta a la base de datos por cada una). Se le da el máximo de
// tiempo que permite Vercel para funciones de cron.
export const maxDuration = 300;

// Reparte los collectors "semanal" entre los 7 días de la semana según su
// posición en la lista, para que no corran todos juntos el mismo día.
function leTocaHoy(indiceEnSemanales: number): boolean {
  const diaSemana = new Date().getDay(); // 0=domingo .. 6=sábado
  return indiceEnSemanales % 7 === diaSemana;
}

// Si un fetch de algún collector nunca responde (el sitio se cuelga sin
// cerrar la conexión), sin este límite el collector se queda esperando
// para siempre y, como corren uno detrás del otro, bloquea a todos los
// que le siguen ese día. 60s alcanza de sobra para cualquier fuente que
// esté respondiendo normal — salvo RunSignup (EE. UU.), que es órdenes
// de magnitud más grande que el resto y necesita más tiempo para poder
// cubrir su catálogo en un plazo razonable (ver runsignup.ts).
const TIEMPOS_ESPECIALES: Record<string, number> = {
  runsignup: 130_000,
};
function conLimiteDeTiempo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`tardó más de ${ms / 1000}s`)), ms)),
  ]);
}

// Vercel Cron llama esta ruta una vez por día (ver vercel.json).
// Protegida con CRON_SECRET para que nadie más la pueda disparar.
// Se le puede pasar ?todos=1 para forzar que corran todos sin importar
// la frecuencia (lo usa el botón "Correr ahora" del panel de admin).
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const forzarTodos = params.get("todos") === "1";
  const resultados: Record<string, unknown> = {};

  // Atajo para probar/forzar solo la traducción de descripciones sin
  // esperar a que corran los ~90 collectors antes (eso solo, con todos
  // los recolectores por delante, puede tardar varios minutos y no cabe
  // cómodo en una sola llamada de prueba).
  if (params.get("soloTraducciones") === "1") {
    try {
      resultados["_traducciones"] = await traducirDescripcionesFaltantes(2000);
    } catch (e) {
      resultados["_traducciones"] = { error: e instanceof Error ? e.message : "error desconocido" };
    }
    return NextResponse.json(resultados);
  }

  // Un solo cron a la vez (ver cronLock.ts).
  if (!(await tomarCandado())) {
    return NextResponse.json({ error: "Ya hay una corrida en curso" }, { status: 409 });
  }
  try {
    let indiceSemanal = 0;

    for (const { clave, correr, frecuencia } of COLLECTORES) {
      const esSemanal = frecuencia === "semanal";
      const corresponde = forzarTodos || frecuencia === "diaria" || leTocaHoy(indiceSemanal);
      if (esSemanal) indiceSemanal++;
      if (!corresponde) continue;
      // Fuente bloqueada o rota (ver pausadas.ts): no se la llama.
      if (FUENTES_PAUSADAS[clave]) {
        resultados[clave] = { pausada: FUENTES_PAUSADAS[clave].motivo };
        continue;
      }

      try {
        resultados[clave] = await conLimiteDeTiempo(correr(), TIEMPOS_ESPECIALES[clave] ?? 60_000);
      } catch (e) {
        resultados[clave] = { error: e instanceof Error ? e.message : "error desconocido" };
      }
    }

    // Barrida de calidad de datos: corrige sola, todos los días, sin que
    // haga falta que nadie entre a revisar manualmente (ver sanidad.ts).
    try {
      resultados["_sanidad"] = await corregirCalidadDeDatos();
    } catch (e) {
      resultados["_sanidad"] = { error: e instanceof Error ? e.message : "error desconocido" };
    }

    // Traduce (con IA, gratis) las descripciones de carreras que todavía no
    // tienen versión en inglés/portugués/francés — así las que traen los
    // collectors nuevos quedan traducidas solas, sin intervención manual.
    try {
      resultados["_traducciones"] = await traducirDescripcionesFaltantes();
    } catch (e) {
      resultados["_traducciones"] = { error: e instanceof Error ? e.message : "error desconocido" };
    }

    // Resumen semanal por email a quienes siguen un país/ciudad (ver
    // resumenesUbicacion.ts — cada suscripción se procesa ~cada 7 días).
    try {
      resultados["_resumenesUbicacion"] = await enviarResumenesUbicacion();
    } catch (e) {
      resultados["_resumenesUbicacion"] = { error: e instanceof Error ? e.message : "error desconocido" };
    }

    // Completa precio/distancia/cupo real de carreras de RunSignup que
    // solo tienen los datos básicos del listado (ver runsignup.ts).
    try {
      resultados["_enriquecerRunSignup"] = await enriquecerCarrerasRunSignup();
    } catch (e) {
      resultados["_enriquecerRunSignup"] = { error: e instanceof Error ? e.message : "error desconocido" };
    }

    // Agente de IA que revisa toda la web para completar huecos (precio,
    // cupo, desnivel, tiempo límite, descripción) que ningún collector pudo
    // llenar — 1 vez por semana (lunes), no todos los días: cada carrera le
    // cuesta una búsqueda real en internet, no se puede hacer en lote como
    // las traducciones (ver rellenoDatos.ts).
    if (forzarTodos || new Date().getDay() === 1) {
      try {
        resultados["_rellenoDatos"] = await rellenarDatosFaltantes();
      } catch (e) {
        resultados["_rellenoDatos"] = { error: e instanceof Error ? e.message : "error desconocido" };
      }
    }

    // Las páginas públicas se regeneran 1 vez por día (revalidate = 86400),
    // no cada 5 minutos: los datos solo cambian cuando corre este cron, y
    // regenerarlas seguido descargaba el catálogo entero una y otra vez
    // hasta agotar la cuota de tráfico de Supabase. Acá se las marca para
    // regenerar justo después de que entraron los datos nuevos del día.
    revalidatePath("/", "layout");

    return NextResponse.json(resultados);
  } finally {
    await soltarCandado();
  }
}

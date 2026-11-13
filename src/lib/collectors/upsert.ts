import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/races-data";
import { banderaDesdeCodigoIso, centroideDesdeCodigoIso } from "@/lib/paises";
import { normalizar } from "@/lib/text";
import { detectarYNotificarCambios } from "@/lib/alertas";
import type { CarreraExterna } from "./types";
import { estadoAGuardar, problemaDeCarrera, urlSegura } from "./validacion";

// La mayoría de los collectors no traen lat/lng de la carrera puntual
// y mandan (0,0) — sin este respaldo, esas carreras quedaban todas
// amontonadas en el medio del océano en vez de aparecer en su país.
function latLngConRespaldo(c: Pick<CarreraExterna, "lat" | "lng" | "codigoPais">): { lat: number; lng: number } {
  if (c.lat !== 0 || c.lng !== 0) return { lat: c.lat, lng: c.lng };
  const centroide = centroideDesdeCodigoIso(c.codigoPais);
  return centroide ?? { lat: c.lat, lng: c.lng };
}

// Crea o actualiza una carrera a partir de lo que trajo un recolector.
// Usa FuenteDato (tipo + externalId) para saber si ya la habíamos
// guardado antes y así no duplicarla.
export async function upsertCarreraExterna(entrada: CarreraExterna): Promise<{ creada: boolean }> {
  const problema = problemaDeCarrera(entrada);
  if (problema) throw new Error(`Carrera descartada (${entrada.fuenteTipo}/${entrada.externalId}): ${problema}`);
  const c: CarreraExterna = {
    ...entrada,
    nombre: entrada.nombre.trim().slice(0, 250),
    ciudad: entrada.ciudad.trim(),
    sitioWeb: urlSegura(entrada.sitioWeb),
    urlInscripcionOficial: urlSegura(entrada.urlInscripcionOficial),
    fuenteUrl: urlSegura(entrada.fuenteUrl),
  };

  const fuenteExistente = await prisma.fuenteDato.findUnique({
    where: { tipo_externalId: { tipo: c.fuenteTipo, externalId: c.externalId } },
  });
  const bandera = banderaDesdeCodigoIso(c.codigoPais);
  const { lat, lng } = latLngConRespaldo(c);

  if (fuenteExistente) {
    await prisma.evento.update({
      where: { id: fuenteExistente.eventoId },
      data: {
        nombre: c.nombre,
        ciudad: c.ciudad,
        pais: c.pais,
        codigoPais: c.codigoPais,
        bandera,
        lat,
        lng,
        sitioWeb: c.sitioWeb,
      },
      select: { id: true },
    });

    const edicionAntes = await prisma.edicion.findUnique({
      where: { eventoId_anio: { eventoId: fuenteExistente.eventoId, anio: c.anio } },
    });

    const edicionDespues = await prisma.edicion.upsert({
      where: { eventoId_anio: { eventoId: fuenteExistente.eventoId, anio: c.anio } },
      update: {
        fecha: c.fecha,
        estado: estadoAGuardar(c.fecha, c.estado, edicionAntes?.estado ?? null),
        precioDesde: c.precioDesde,
        moneda: c.moneda,
        numCorredores: c.numCorredores,
        urlInscripcionOficial: c.urlInscripcionOficial,
        ultimaVerificacion: new Date(),
        ultimoExitoRobot: new Date(),
        fallosConsecutivos: 0,
      },
      create: {
        eventoId: fuenteExistente.eventoId,
        anio: c.anio,
        fecha: c.fecha,
        estado: estadoAGuardar(c.fecha, c.estado, null),
        precioDesde: c.precioDesde,
        moneda: c.moneda,
        numCorredores: c.numCorredores,
        urlInscripcionOficial: c.urlInscripcionOficial,
        ultimaVerificacion: new Date(),
        ultimoExitoRobot: new Date(),
      },
    });

    // Solo tiene sentido comparar si ya existía antes (si "create" se
    // acaba de disparar arriba porque era la primera vez que vemos esta
    // edición puntual, no hay "antes" real con qué compararla).
    if (edicionAntes) {
      await detectarYNotificarCambios(fuenteExistente.eventoId, edicionAntes, edicionDespues, c.fuenteNombre, c.estado !== undefined);
    }

    await prisma.fuenteDato.update({
      where: { id: fuenteExistente.id },
      data: { ultimaObtencion: new Date() },
      select: { id: true },
    });

    return { creada: false };
  }

  // externalId puede traer cualquier caracter (fechas con "/", espacios,
  // paréntesis...) según cómo lo arme cada collector — se limpia acá,
  // en un solo lugar, para que el id nunca rompa una URL sin importar
  // de qué fuente venga.
  const externalIdLimpio = normalizar(c.externalId)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const id = `${c.fuenteTipo}-${externalIdLimpio}`.slice(0, 120);
  const slug = slugify(id, c.nombre);

  await prisma.evento.create({
    select: { id: true },
    data: {
      id,
      slug,
      nombre: c.nombre,
      ciudad: c.ciudad,
      pais: c.pais,
      codigoPais: c.codigoPais,
      bandera,
      continente: c.continente,
      lat,
      lng,
      sitioWeb: c.sitioWeb,
      ediciones: {
        create: {
          anio: c.anio,
          fecha: c.fecha,
          estado: estadoAGuardar(c.fecha, c.estado, null),
          precioDesde: c.precioDesde,
          moneda: c.moneda,
          numCorredores: c.numCorredores,
          urlInscripcionOficial: c.urlInscripcionOficial,
          ultimaVerificacion: new Date(),
          ultimoExitoRobot: new Date(),
        },
      },
      distancias: {
        create: c.distancias.map((d) => ({
          tipo: d.tipo,
          km: d.km,
          terreno: d.terreno ?? "ASFALTO",
        })),
      },
      fuentes: {
        create: {
          tipo: c.fuenteTipo,
          nombre: c.fuenteNombre,
          url: c.fuenteUrl,
          externalId: c.externalId,
          ultimaObtencion: new Date(),
        },
      },
    },
  });

  return { creada: true };
}

// Registra en EjecucionRobot cómo le fue a una corrida del recolector,
// para verlo en /admin/robots.
export async function registrarEjecucion(
  collector: string,
  fn: () => Promise<{ nuevas: number; actualizadas: number; errores: number; detalle?: string }>,
) {
  const inicio = Date.now();
  try {
    const resultado = await fn();
    await prisma.ejecucionRobot.create({
      data: {
        collector,
        // Sin ninguna carrera leída casi siempre significa que la fuente
        // cambió su sitio (pasó con laufen.de y Minhas Inscrições): se marca
        // PARCIAL para que se vea en /admin/robots en vez de pasar como OK.
        estado: resultado.errores > 0 || resultado.nuevas + resultado.actualizadas === 0 ? "PARCIAL" : "OK",
        mensaje: `${resultado.nuevas} nuevas, ${resultado.actualizadas} actualizadas, ${resultado.errores} errores${resultado.detalle ? ` — ${resultado.detalle}` : ""}`.slice(0, 1000),
        duracionMs: Date.now() - inicio,
      },
    });
    return resultado;
  } catch (e) {
    await prisma.ejecucionRobot.create({
      data: {
        collector,
        estado: "ERROR",
        mensaje: e instanceof Error ? e.message : "Error desconocido",
        duracionMs: Date.now() - inicio,
      },
    });
    throw e;
  }
}

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/races-data";
import { banderaDesdeCodigoIso } from "@/lib/paises";
import type { CarreraExterna } from "./types";

// Crea o actualiza una carrera a partir de lo que trajo un recolector.
// Usa FuenteDato (tipo + externalId) para saber si ya la habíamos
// guardado antes y así no duplicarla.
export async function upsertCarreraExterna(c: CarreraExterna): Promise<{ creada: boolean }> {
  const fuenteExistente = await prisma.fuenteDato.findUnique({
    where: { tipo_externalId: { tipo: c.fuenteTipo, externalId: c.externalId } },
  });
  const bandera = banderaDesdeCodigoIso(c.codigoPais);

  if (fuenteExistente) {
    await prisma.evento.update({
      where: { id: fuenteExistente.eventoId },
      data: {
        nombre: c.nombre,
        ciudad: c.ciudad,
        pais: c.pais,
        codigoPais: c.codigoPais,
        bandera,
        lat: c.lat,
        lng: c.lng,
        sitioWeb: c.sitioWeb,
      },
    });

    await prisma.edicion.upsert({
      where: { eventoId_anio: { eventoId: fuenteExistente.eventoId, anio: c.anio } },
      update: {
        fecha: c.fecha,
        estado: c.estado,
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
        estado: c.estado ?? "PROXIMAMENTE",
        precioDesde: c.precioDesde,
        moneda: c.moneda,
        numCorredores: c.numCorredores,
        urlInscripcionOficial: c.urlInscripcionOficial,
        ultimaVerificacion: new Date(),
        ultimoExitoRobot: new Date(),
      },
    });

    await prisma.fuenteDato.update({
      where: { id: fuenteExistente.id },
      data: { ultimaObtencion: new Date() },
    });

    return { creada: false };
  }

  const id = `${c.fuenteTipo}-${c.externalId}`.slice(0, 120);
  const slug = slugify(id, c.nombre);

  await prisma.evento.create({
    data: {
      id,
      slug,
      nombre: c.nombre,
      ciudad: c.ciudad,
      pais: c.pais,
      codigoPais: c.codigoPais,
      bandera,
      continente: c.continente,
      lat: c.lat,
      lng: c.lng,
      sitioWeb: c.sitioWeb,
      ediciones: {
        create: {
          anio: c.anio,
          fecha: c.fecha,
          estado: c.estado ?? "PROXIMAMENTE",
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
export async function registrarEjecucion(collector: string, fn: () => Promise<{ nuevas: number; actualizadas: number; errores: number }>) {
  const inicio = Date.now();
  try {
    const resultado = await fn();
    await prisma.ejecucionRobot.create({
      data: {
        collector,
        estado: resultado.errores > 0 ? "PARCIAL" : "OK",
        mensaje: `${resultado.nuevas} nuevas, ${resultado.actualizadas} actualizadas, ${resultado.errores} errores`,
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

import { EstadoInscripcion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/races-data";
import { banderaDesdeCodigoIso } from "@/lib/paises";
import { normalizar } from "@/lib/text";
import { detectarYNotificarCambios } from "@/lib/alertas";
import type { CarreraExterna } from "./types";

// La mayoría de los collectors no traen un estado de inscripción real
// (la fuente no lo publica de forma parseable) — antes esos casos
// quedaban fijos en PROXIMAMENTE ("abre pronto") para siempre, sin
// importar qué tan cerca estuviera la fecha, lo cual es engañoso: una
// carrera dentro de pocas semanas casi seguro ya tiene inscripción
// abierta, no "todavía sin abrir". Cuando el collector no da un estado
// explícito, se infiere uno razonable a partir de la fecha en vez de
// asumir siempre "todavía no abrió".
function estadoPorDefecto(fecha: Date, explicito?: EstadoInscripcion): EstadoInscripcion {
  if (explicito) return explicito;
  const diasHasta = (fecha.getTime() - Date.now()) / 86_400_000;
  if (diasHasta < 0) return "CERRADA";
  if (diasHasta <= 90) return "ABIERTA";
  return "PROXIMAMENTE";
}

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

    const edicionAntes = await prisma.edicion.findUnique({
      where: { eventoId_anio: { eventoId: fuenteExistente.eventoId, anio: c.anio } },
    });

    const edicionDespues = await prisma.edicion.upsert({
      where: { eventoId_anio: { eventoId: fuenteExistente.eventoId, anio: c.anio } },
      update: {
        fecha: c.fecha,
        estado: estadoPorDefecto(c.fecha, c.estado),
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
        estado: estadoPorDefecto(c.fecha, c.estado),
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
      await detectarYNotificarCambios(fuenteExistente.eventoId, edicionAntes, edicionDespues, c.fuenteNombre);
    }

    await prisma.fuenteDato.update({
      where: { id: fuenteExistente.id },
      data: { ultimaObtencion: new Date() },
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
          estado: estadoPorDefecto(c.fecha, c.estado),
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

"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface DatosNuevaCarrera {
  nombre: string;
  ciudad: string;
  pais: string;
  fecha: string;
  sitioWeb: string;
  comentario?: string;
}

export interface DatosReporteError {
  eventoId: string;
  eventoNombre: string;
  descripcion: string;
}

type Resultado = { ok: true } | { ok: false; error: string };

// No exige sesión: cualquiera puede proponer una carrera o reportar un
// error, igual que llenar un formulario de contacto. Si hay sesión, se
// guarda quién lo mandó para poder responderle si hace falta.
export async function proponerCarrera(datos: DatosNuevaCarrera): Promise<Resultado> {
  if (!datos.nombre.trim() || !datos.ciudad.trim() || !datos.pais.trim()) {
    return { ok: false, error: "Completá al menos el nombre, la ciudad y el país." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await prisma.envioComunidad.create({
    data: {
      usuarioId: user?.id,
      tipo: "nueva_carrera",
      datos: { ...datos },
    },
  });

  return { ok: true };
}

export async function reportarError(datos: DatosReporteError): Promise<Resultado> {
  if (!datos.descripcion.trim()) {
    return { ok: false, error: "Contanos qué está mal para poder corregirlo." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await prisma.envioComunidad.create({
    data: {
      usuarioId: user?.id,
      tipo: "reporte_error",
      eventoId: datos.eventoId,
      datos: { eventoNombre: datos.eventoNombre, descripcion: datos.descripcion },
    },
  });

  return { ok: true };
}

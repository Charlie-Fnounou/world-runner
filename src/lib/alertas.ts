import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { enviarCorreo } from "@/lib/resend";
import { slugify } from "@/lib/races-data";

// IDs de eventos a los que el usuario con sesión iniciada está suscrito.
// Devuelve [] si no hay sesión (invitado).
export async function getAlertaIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const alertas = await prisma.alerta.findMany({
    where: { usuarioId: user.id },
    select: { eventoId: true },
  });
  return alertas.map((a) => a.eventoId);
}

export type TipoCambio = "apertura" | "pocosCupos" | "precio" | "fecha" | "cancelacion";

interface PreferenciasAlerta {
  avisaAperturaInscripcion: boolean;
  avisaPocosCupos: boolean;
  avisaCambioPrecio: boolean;
  avisaCambioFecha: boolean;
  avisaCancelacion: boolean;
}

function quiereAviso(prefs: PreferenciasAlerta, tipo: TipoCambio): boolean {
  switch (tipo) {
    case "apertura":
      return prefs.avisaAperturaInscripcion;
    case "pocosCupos":
      return prefs.avisaPocosCupos;
    case "precio":
      return prefs.avisaCambioPrecio;
    case "fecha":
      return prefs.avisaCambioFecha;
    case "cancelacion":
      return prefs.avisaCancelacion;
  }
}

interface EdicionComparable {
  id: string;
  estado: string;
  precioDesde: number | null;
  moneda: string | null;
  fecha: Date;
  numCorredores: number | null;
}

// Compara una edición antes/después de que un robot (o el admin) la
// actualice, guarda en HistorialCambio lo que cambió de verdad, y avisa
// por correo a los suscriptores. Se usa tanto desde el panel de admin
// como desde cada collector (ver upsert.ts) para que un cambio real
// detectado automáticamente (se abrió la inscripción, cambió el precio)
// tenga el mismo efecto que si lo hubiera cargado un admin a mano.
export async function detectarYNotificarCambios(
  eventoId: string,
  antes: EdicionComparable,
  despues: EdicionComparable,
  fuente: string,
) {
  const cambios: { tipo: TipoCambio; mensaje: string }[] = [];
  const historial: { campo: string; valorAnterior: string; valorNuevo: string; esImportante: boolean }[] = [];

  if (antes.estado !== despues.estado) {
    historial.push({ campo: "estado", valorAnterior: antes.estado, valorNuevo: despues.estado, esImportante: true });
    if (despues.estado === "ABIERTA") {
      cambios.push({ tipo: "apertura", mensaje: "🔔 ¡Ya abrió la inscripción!" });
    } else if (despues.estado === "ULTIMOS_CUPOS") {
      cambios.push({ tipo: "pocosCupos", mensaje: "⚠️ Quedan últimos cupos." });
    } else if (despues.estado === "CANCELADA") {
      cambios.push({ tipo: "cancelacion", mensaje: "❌ La carrera fue cancelada." });
    }
  }

  if (despues.precioDesde != null && antes.precioDesde !== despues.precioDesde) {
    historial.push({
      campo: "precioDesde",
      valorAnterior: String(antes.precioDesde ?? ""),
      valorNuevo: String(despues.precioDesde),
      esImportante: true,
    });
    cambios.push({ tipo: "precio", mensaje: `💰 El precio cambió a ${despues.moneda ?? "$"}${despues.precioDesde}.` });
  }

  if (antes.fecha.getTime() !== despues.fecha.getTime()) {
    historial.push({
      campo: "fecha",
      valorAnterior: antes.fecha.toISOString().slice(0, 10),
      valorNuevo: despues.fecha.toISOString().slice(0, 10),
      esImportante: true,
    });
    cambios.push({ tipo: "fecha", mensaje: `📅 La fecha cambió a ${despues.fecha.toISOString().slice(0, 10)}.` });
  }

  if (historial.length === 0) return;

  await prisma.historialCambio.createMany({
    data: historial.map((h) => ({ eventoId, edicionId: despues.id, fuente, ...h })),
  });

  await notificarCambios(eventoId, cambios);
}

// Manda un correo a cada usuario suscrito a esta carrera, respetando qué
// tipos de cambio quiere recibir cada quien.
export async function notificarCambios(eventoId: string, cambios: { tipo: TipoCambio; mensaje: string }[]) {
  if (cambios.length === 0) return;

  const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!evento) return;

  const suscriptores = await prisma.alerta.findMany({
    where: { eventoId },
    include: { usuario: true },
  });

  const enlace = `https://theworldrunner.com/carreras/${slugify(evento.id, evento.nombre)}`;

  await Promise.all(
    suscriptores.map(async (sus) => {
      const relevantes = cambios.filter((c) => quiereAviso(sus, c.tipo));
      if (relevantes.length === 0) return;

      const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 20px; color: #12151b;">${evento.bandera ?? ""} ${evento.nombre}</h1>
          <ul style="color: #12151b; font-size: 15px; line-height: 1.7; padding-left: 20px;">
            ${relevantes.map((c) => `<li>${c.mensaje}</li>`).join("")}
          </ul>
          <p style="margin: 24px 0;">
            <a href="${enlace}" style="background:#2547E8; color:#fff; padding:12px 24px; border-radius:999px; text-decoration:none; font-weight:600; display:inline-block;">
              Ver la carrera
            </a>
          </p>
          <p style="color: #8b94a7; font-size: 12px;">
            Recibes esto porque te suscribiste a las alertas de esta carrera en The World Runner.
          </p>
        </div>
      `;

      try {
        await enviarCorreo({
          to: sus.usuario.email,
          subject: `Novedades en ${evento.nombre}`,
          html,
        });
      } catch (e) {
        console.error("No se pudo enviar alerta a", sus.usuario.email, e);
      }
    }),
  );
}

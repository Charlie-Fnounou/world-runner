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

import { prisma } from "@/lib/prisma";
import { enviarCorreo } from "@/lib/resend";
import { getCarreras, slugify } from "@/lib/races-data";
import { fmtFecha } from "@/lib/format";
import type { Carrera } from "@/lib/types";

// Cada cuánto se manda el resumen, en días. Se controla con
// SeguimientoUbicacion.ultimoEnvio en vez de con el día de la semana: así
// no depende de que el cron corra siempre el mismo día (ver route.ts, que
// llama a esta función todos los días sin condición).
const DIAS_ENTRE_ENVIOS = 7;
const MAX_CARRERAS_POR_LUGAR = 8;

function coincide(r: Carrera, tipo: string, valor: string): boolean {
  return tipo === "pais" ? r.country === valor : r.city === valor;
}

function filaCarrera(r: Carrera): string {
  return `
    <tr>
      <td style="padding:8px 0; border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:600; color:#12151b;">${r.flag} ${r.name}</div>
        <div style="color:#8b94a7; font-size:13px;">${r.city}, ${r.country} · ${fmtFecha(r.date)}</div>
      </td>
      <td style="padding:8px 0; border-bottom:1px solid #e5e7eb; text-align:right;">
        <a href="https://theworldrunner.com/carreras/${slugify(r.id, r.name)}" style="color:#2547E8; font-size:13px; text-decoration:none;">Ver ↗</a>
      </td>
    </tr>`;
}

function plantillaResumenUbicacion(secciones: { valor: string; carreras: Carrera[] }[]): string {
  const bloques = secciones
    .map(
      (s) => `
      <h2 style="font-size:16px; color:#12151b; margin:24px 0 8px;">📍 ${s.valor}</h2>
      <table style="width:100%; border-collapse:collapse;">
        ${s.carreras.map(filaCarrera).join("")}
      </table>`,
    )
    .join("");

  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="font-size: 20px; color: #12151b;">Tu resumen semanal de carreras</h1>
      <p style="color: #5b6472; font-size: 14px; line-height: 1.5;">
        Próximas carreras en los lugares que seguís en The World Runner.
      </p>
      ${bloques}
      <p style="color: #8b94a7; font-size: 12px; margin-top: 28px;">
        Recibís esto porque seguís uno o más países/ciudades. Podés dejar de seguirlos desde la web.
      </p>
    </div>
  `;
}

// Se llama sola todos los días desde el cron (ver route.ts). Cada
// suscripción se procesa como mucho una vez cada DIAS_ENTRE_ENVIOS días.
export async function enviarResumenesUbicacion() {
  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_ENTRE_ENVIOS);

  const pendientes = await prisma.seguimientoUbicacion.findMany({
    where: { OR: [{ ultimoEnvio: null }, { ultimoEnvio: { lt: limite } }] },
    include: { usuario: { select: { email: true } } },
  });

  if (pendientes.length === 0) return { correosEnviados: 0, seguimientosProcesados: 0 };

  const carreras = (await getCarreras()).filter((r) => r.status !== "cerrada");

  const porUsuario = new Map<string, { email: string; items: typeof pendientes }>();
  for (const s of pendientes) {
    const g = porUsuario.get(s.usuarioId) ?? { email: s.usuario.email, items: [] };
    g.items.push(s);
    porUsuario.set(s.usuarioId, g);
  }

  let correosEnviados = 0;

  for (const { email, items } of porUsuario.values()) {
    const secciones = items
      .map((s) => ({
        valor: s.valor,
        carreras: carreras
          .filter((r) => coincide(r, s.tipo, s.valor))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, MAX_CARRERAS_POR_LUGAR),
      }))
      .filter((sec) => sec.carreras.length > 0);

    if (secciones.length > 0) {
      const lugares = secciones.map((s) => s.valor).join(", ");
      await enviarCorreo({
        to: email,
        subject: `Carreras próximas en ${lugares}`,
        html: plantillaResumenUbicacion(secciones),
      })
        .then(() => correosEnviados++)
        .catch(() => null);
    }

    // Se marca como enviado incluso si no había carreras esta semana, para
    // respetar el ritmo de ~7 días y no reconsultar todos los días.
    await prisma.seguimientoUbicacion.updateMany({
      where: { id: { in: items.map((i) => i.id) } },
      data: { ultimoEnvio: new Date() },
    });
  }

  return { correosEnviados, seguimientosProcesados: pendientes.length };
}

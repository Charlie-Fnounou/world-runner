import { prisma } from "@/lib/prisma";

// Catálogo fijo de logros. El código es el identificador estable (no
// cambiar una vez que algún usuario ya lo tenga otorgado). Se crean en la
// base la primera vez que se otorgan (ver otorgarLogro), no hace falta
// seedearlos a mano.
export const CATALOGO_LOGROS: { codigo: string; nombre: string; descripcion: string; icono: string }[] = [
  { codigo: "primera_carrera", nombre: "Primeros pasos", descripcion: "Marcaste tu primera carrera como corrida", icono: "🏁" },
  { codigo: "5_carreras", nombre: "Rodaje", descripcion: "Corriste 5 carreras", icono: "🏃" },
  { codigo: "10_carreras", nombre: "Veterano", descripcion: "Corriste 10 carreras", icono: "🎖️" },
  { codigo: "25_carreras", nombre: "Imparable", descripcion: "Corriste 25 carreras", icono: "🔥" },
  { codigo: "3_paises", nombre: "Trotamundos", descripcion: "Corriste carreras en 3 países distintos", icono: "🌍" },
  { codigo: "5_paises", nombre: "Explorador global", descripcion: "Corriste carreras en 5 países distintos", icono: "✈️" },
  { codigo: "10_paises", nombre: "Corredor del mundo", descripcion: "Corriste carreras en 10 países distintos", icono: "🌐" },
  { codigo: "primer_maraton", nombre: "42K", descripcion: "Corriste tu primer maratón", icono: "🏅" },
  { codigo: "primera_resena", nombre: "Voz de la comunidad", descripcion: "Dejaste tu primera reseña", icono: "✍️" },
];

// Idempotente: si el usuario ya tiene el logro, no hace nada. Si el logro
// todavía no existe en la tabla Logro (primera vez que se otorga a
// cualquier usuario), lo crea a partir del catálogo de arriba.
export async function otorgarLogro(usuarioId: string, codigo: string): Promise<boolean> {
  const def = CATALOGO_LOGROS.find((l) => l.codigo === codigo);
  if (!def) return false;

  const logro = await prisma.logro.upsert({
    where: { codigo },
    update: {},
    create: { codigo, nombre: def.nombre, descripcion: def.descripcion, icono: def.icono },
  });

  const existente = await prisma.usuarioLogro.findUnique({
    where: { usuarioId_logroId: { usuarioId, logroId: logro.id } },
  });
  if (existente) return false;

  await prisma.usuarioLogro.create({ data: { usuarioId, logroId: logro.id } });
  return true;
}

// Se llama después de marcar una carrera como corrida: evalúa todos los
// logros que dependen de cuántas carreras / países lleva el usuario.
export async function evaluarLogrosDeCompletadas(usuarioId: string) {
  const completadas = await prisma.carreraCompletada.findMany({
    where: { usuarioId },
    include: { evento: { select: { pais: true } } },
  });

  const total = completadas.length;
  const paises = new Set(completadas.map((c) => c.evento.pais)).size;

  if (total >= 1) await otorgarLogro(usuarioId, "primera_carrera");
  if (total >= 5) await otorgarLogro(usuarioId, "5_carreras");
  if (total >= 10) await otorgarLogro(usuarioId, "10_carreras");
  if (total >= 25) await otorgarLogro(usuarioId, "25_carreras");
  if (paises >= 3) await otorgarLogro(usuarioId, "3_paises");
  if (paises >= 5) await otorgarLogro(usuarioId, "5_paises");
  if (paises >= 10) await otorgarLogro(usuarioId, "10_paises");

  const distancias = await prisma.distancia.findMany({
    where: { evento: { completadas: { some: { usuarioId } } } },
    select: { tipo: true },
  });
  if (distancias.some((d) => d.tipo === "MARATON")) await otorgarLogro(usuarioId, "primer_maraton");
}

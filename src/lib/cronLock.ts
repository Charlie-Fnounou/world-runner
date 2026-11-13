import { prisma } from "./prisma";

const CLAVE = "_cron-lock";
// El cron tiene 300s máximo; pasado ese tiempo un candado viejo (corrida
// que murió a la mitad) ya no bloquea.
const VENCE_SEG = 330;

// Evita que el cron y el botón "Correr ahora" (o dos disparos del cron)
// corran a la vez: pisarían cursores y duplicarían trabajo y consultas.
// Atómico en la base: solo uno de dos pedidos simultáneos gana el candado.
export async function tomarCandado(): Promise<boolean> {
  const ahora = Math.floor(Date.now() / 1000);
  const filas = await prisma.$queryRawUnsafe<{ collector: string }[]>(
    `insert into "EstadoCollector" (collector, cursor, "actualizadoEn") values ($1, $2, now())
     on conflict (collector) do update set cursor = excluded.cursor, "actualizadoEn" = now()
     where "EstadoCollector".cursor < $3
     returning collector`,
    CLAVE,
    ahora,
    ahora - VENCE_SEG,
  );
  return filas.length > 0;
}

export async function soltarCandado(): Promise<void> {
  await prisma.estadoCollector.updateMany({ where: { collector: CLAVE }, data: { cursor: 0 } });
}

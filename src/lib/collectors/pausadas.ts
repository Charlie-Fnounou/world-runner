// Fuentes que el cron NO llama por ahora, con el motivo verificado.
//
// Regla: si un sitio nos bloquea (403) no se lo esquiva (ni cambiando el
// User-Agent ni con proxies). Se lo pausa acá para no pegarle todos los días
// en vano, y se vuelve a probar a mano de vez en cuando con UNA sola visita
// identificada como WorldRunnerBot. Si vuelve a responder, se borra de esta
// lista y el robot retoma solo.
//
// Las carreras ya guardadas de estas fuentes NO se borran: siguen visibles
// con la fecha de su última verificación.

export interface FuentePausada {
  motivo: string;
  verificado: string; // fecha (AAAA-MM-DD) de la última comprobación manual
  tipo: "bloqueo" | "fuente-cambio";
}

export const FUENTES_PAUSADAS: Record<string, FuentePausada> = {
  "runningcalendar-au": {
    tipo: "bloqueo",
    motivo: "runningcalendar.com.au responde 403 a nuestro robot (bloqueo del servidor; su robots.txt no prohíbe el calendario).",
    verificado: "2026-11-15",
  },
  "runningcalendar-nz": {
    tipo: "bloqueo",
    motivo: "runningcalendar.co.nz responde 403 a nuestro robot (bloqueo del servidor; su robots.txt no prohíbe el calendario).",
    verificado: "2026-11-15",
  },
  "runningcalendar-ie": {
    tipo: "bloqueo",
    motivo: "runningcalendar.ie responde 403 a nuestro robot (bloqueo del servidor; su robots.txt no prohíbe el calendario).",
    verificado: "2026-11-15",
  },
  ethiopianrun: {
    tipo: "fuente-cambio",
    motivo: "ethiopianrun.org rehízo su sitio: la API de carreras ya no existe (redirige a la portada). Hay que escribir un lector nuevo.",
    verificado: "2026-11-15",
  },
};

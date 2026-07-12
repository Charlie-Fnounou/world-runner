import type { Continente, EstadoInscripcion, TipoDistancia, TipoTerreno } from "@prisma/client";

// Forma normalizada que debe producir cualquier recolector (RunSignup,
// una federación nacional, etc.) antes de guardarse en la base de datos.
export interface CarreraExterna {
  // De dónde salió este dato y cómo identificarla ahí para no duplicarla
  // la próxima vez que corra el recolector.
  fuenteTipo: string; // "runsignup" | "federacion_nacional" | "aims" | "world_athletics" | "sitio_oficial"
  fuenteNombre: string; // ej. "RunSignup API", "RFEA"
  fuenteUrl?: string;
  externalId: string; // ID de la carrera en la fuente externa

  nombre: string;
  ciudad: string;
  pais: string;
  codigoPais?: string;
  continente: Continente;
  lat: number;
  lng: number;
  sitioWeb?: string;

  anio: number;
  fecha: Date;
  estado?: EstadoInscripcion;
  precioDesde?: number;
  moneda?: string;
  numCorredores?: number;
  urlInscripcionOficial?: string;

  distancias: { tipo: TipoDistancia; km: number; terreno?: TipoTerreno }[];
}

export interface ResultadoCollector {
  nuevas: number;
  actualizadas: number;
  errores: number;
}

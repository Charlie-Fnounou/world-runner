export type EstadoInscripcion =
  | "abierta"
  | "ultimos"
  | "sorteo"
  | "proximamente"
  | "cerrada";

export interface EdicionHistorial {
  y: number;
  r: number;
  p: number;
}

export interface Carrera {
  id: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  continent: string;
  lat: number;
  lng: number;
  date: string;
  km: number;
  dist: string;
  type: string;
  status: EstadoInscripcion;
  price: number;
  cur: string;
  runners: number;
  elev: number;
  temp: number;
  limit: string;
  diff: number;
  rating: number;
  nrev: number;
  major: boolean;
  web: string;
  airport: string;
  hotel: string;
  g: [string, string];
  desc: string;
  recM: string;
  recF: string;
  profile: number[];
  history: EdicionHistorial[];
}

export const ESTADO_INFO: Record<
  EstadoInscripcion,
  { label: string; color: string; pulse: boolean }
> = {
  abierta: { label: "Inscripción abierta", color: "#16A34A", pulse: true },
  ultimos: { label: "Últimos cupos", color: "#EA580C", pulse: true },
  sorteo: { label: "Sorteo / ballot", color: "#7C3AED", pulse: true },
  proximamente: { label: "Abre pronto", color: "#D97706", pulse: false },
  cerrada: { label: "Inscripción cerrada", color: "#6B7280", pulse: false },
};

export const DISTANCIAS = [
  "Todas",
  "Maratón",
  "Media maratón",
  "10K",
  "20K",
  "Ultra maratón",
  "Trail",
] as const;

export const CONTINENTES = [
  "Todos",
  "Europa",
  "América del Norte",
  "América Central",
  "América del Sur",
  "Asia",
  "África",
  "Oceanía",
] as const;

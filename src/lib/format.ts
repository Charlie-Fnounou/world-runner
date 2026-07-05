const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export const MESES_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function fmtFecha(d: string): string {
  const dt = new Date(d + "T12:00:00");
  return `${dt.getDate()} ${MESES[dt.getMonth()]} ${dt.getFullYear()}`;
}

export function fmtFechaCorta(d: string): string {
  const dt = new Date(d + "T12:00:00");
  return `${dt.getDate()} ${MESES[dt.getMonth()]}`;
}

export function diasHasta(d: string): number {
  return Math.ceil((new Date(d + "T07:00:00").getTime() - Date.now()) / 86400000);
}

export function nf(n: number): string {
  return n.toLocaleString("es");
}

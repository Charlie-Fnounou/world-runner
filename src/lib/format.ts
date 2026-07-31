import type { Idioma } from "./i18n";

const MESES: Record<Idioma, string[]> = {
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  pt: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
  fr: ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"],
};

export const MESES_FULL: Record<Idioma, string[]> = {
  es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  pt: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
  fr: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
};

export function fmtFecha(d: string, idioma: Idioma = "es"): string {
  const dt = new Date(d + "T12:00:00");
  return `${dt.getDate()} ${MESES[idioma][dt.getMonth()]} ${dt.getFullYear()}`;
}

export function fmtFechaCorta(d: string, idioma: Idioma = "es"): string {
  const dt = new Date(d + "T12:00:00");
  return `${dt.getDate()} ${MESES[idioma][dt.getMonth()]}`;
}

export function diasHasta(d: string): number {
  return Math.ceil((new Date(d + "T07:00:00").getTime() - Date.now()) / 86400000);
}

export function nf(n: number, idioma: Idioma = "es"): string {
  return n.toLocaleString(idioma);
}

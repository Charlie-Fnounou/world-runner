// Quita tildes/diacríticos sin depender de rangos regex con caracteres
// unicode literales (evita bugs de codificación). Equivale a lo que en
// Postgres hace la extensión "unaccent".
export function quitarAcentos(texto: string): string {
  let resultado = "";
  for (const ch of texto.normalize("NFD")) {
    const code = ch.codePointAt(0) ?? 0;
    const esDiacritico = code >= 0x0300 && code <= 0x036f;
    if (!esDiacritico) resultado += ch;
  }
  return resultado;
}

export function normalizar(texto: string): string {
  return quitarAcentos(texto || "").toLowerCase();
}

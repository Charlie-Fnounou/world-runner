// JSON dentro de <script type="application/ld+json">: JSON.stringify no
// escapa "</script>", y los nombres/descripciones vienen de sitios
// externos. Escapar "<" (y los separadores de línea que rompen JS) evita
// que un texto cerrado a propósito inyecte HTML o código en la página.
export function jsonParaScript(valor: unknown): string {
  return JSON.stringify(valor)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// Para insertar texto de terceros (nombres de carreras, etc.) en HTML de emails.
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Moneda ISO 4217 a partir de lo que guardan las fuentes ("USD", "$", "€"...).
// Si no se puede saber con certeza, null (mejor no declarar un precio que
// declararlo en la moneda equivocada).
export function monedaIso(cur: string | null | undefined): string | null {
  if (!cur) return null;
  const limpio = cur.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(limpio)) return limpio;
  const simbolos: Record<string, string> = { "€": "EUR", "£": "GBP", "¥": "JPY", "₹": "INR", "₩": "KRW", "₺": "TRY", "R$": "BRL", "US$": "USD" };
  return simbolos[cur.trim()] ?? null;
}

// Destino de regreso después del login (?next=...). Solo rutas internas:
// "@otro.com", "//otro.com" o ".otro.com" pegados detrás del dominio
// terminaban llevando al usuario a otro sitio (redirección abierta).
export function rutaInternaSegura(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (/[@\\\s]/.test(next)) return "/";
  return next.slice(0, 500);
}

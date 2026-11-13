// Límite de pedidos por clave (IP) dentro de una ventana de tiempo. Vive en
// la memoria de cada instancia del servidor: no es un límite global exacto
// (Vercel puede tener varias instancias), pero frena el abuso de un solo
// origen sin pagar un servicio extra.
const ventanas = new Map<string, number[]>();

export function permitir(clave: string, maximo: number, ventanaMs: number, ahora = Date.now()): boolean {
  const desde = ahora - ventanaMs;
  const previos = (ventanas.get(clave) ?? []).filter((t) => t > desde);
  if (previos.length >= maximo) {
    ventanas.set(clave, previos);
    return false;
  }
  previos.push(ahora);
  ventanas.set(clave, previos);
  if (ventanas.size > 10_000) {
    for (const [k, v] of ventanas) if (!v.some((t) => t > desde)) ventanas.delete(k);
  }
  return true;
}

export function ipDe(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "desconocida";
}

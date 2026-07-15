import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Antes corría en TODAS las rutas: como siempre reescribe la cookie de
// sesión de Supabase, Vercel trataba CUALQUIER respuesta (incluidas las
// páginas públicas de solo lectura, como el inicio o el listado de
// carreras) como privada y nunca las cacheaba, sin importar el
// `revalidate` de cada página. Ahora solo corre donde de verdad hace
// falta tener la sesión fresca del lado del servidor; las páginas
// públicas resuelven su estado de favoritos/alertas/completadas del
// lado del cliente (ver useFavoritos/useAlertas), y esas llamadas ya
// refrescan la sesión por su cuenta si hace falta.
export const config = {
  matcher: ["/login", "/perfil/:path*", "/admin/:path*", "/auth/:path*", "/api/:path*"],
};

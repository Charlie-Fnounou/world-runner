import { NextResponse } from "next/server";
import { rutaInternaSegura } from "@/lib/seguridad";
import { createClient } from "@/lib/supabase/server";
import { upsertUsuario } from "@/lib/upsert-usuario";

// A donde vuelve el usuario tras autenticarse con Google (flujo OAuth con "code").
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = rutaInternaSegura(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await upsertUsuario(data.user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=No se pudo iniciar sesión`);
}

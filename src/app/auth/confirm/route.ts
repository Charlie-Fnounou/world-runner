import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { upsertUsuario } from "@/lib/upsert-usuario";

// A donde vuelve el usuario tras hacer clic en el link mágico que mandamos
// nosotros mismos con Resend (token_hash, no "code" — no pasa por el
// navegador que originó el pedido, así que no depende de PKCE).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error && data.user) {
      await upsertUsuario(data.user);
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("verifyOtp falló:", error);
  }

  return NextResponse.redirect(`${origin}/login?error=No se pudo iniciar sesión`);
}

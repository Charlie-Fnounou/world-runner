import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// A donde vuelve el usuario tras hacer clic en el link mágico del correo,
// o tras autenticarse con Google.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await prisma.usuario.upsert({
        where: { id: data.user.id },
        update: { email: data.user.email ?? "" },
        create: {
          id: data.user.id,
          email: data.user.email ?? "",
          nombre: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
          avatarUrl: data.user.user_metadata?.avatar_url ?? null,
        },
      });
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=No se pudo iniciar sesión`);
}

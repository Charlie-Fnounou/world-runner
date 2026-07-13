import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// RunSignup vuelve acá después de que el admin aprueba el acceso.
// Canjea el "code" por un access_token + refresh_token y los guarda.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/admin/robots?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/admin/robots?error=Falta el código de autorización`);
  }

  const pendiente = await prisma.integracionOAuth.findUnique({ where: { proveedor: "runsignup" } });
  if (!pendiente?.codeVerifier) {
    return NextResponse.redirect(`${origin}/admin/robots?error=No había una autorización pendiente`);
  }

  const clientId = process.env.RUNSIGNUP_CLIENT_ID;
  const clientSecret = process.env.RUNSIGNUP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/admin/robots?error=Faltan RUNSIGNUP_CLIENT_ID/SECRET`);
  }

  const redirectUri = `${origin}/api/runsignup/oauth/callback`;

  const res = await fetch("https://runsignup.com/rest/v2/auth/auth-code-redemption.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      code_verifier: pendiente.codeVerifier,
    }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    return NextResponse.redirect(`${origin}/admin/robots?error=${encodeURIComponent(`RunSignup respondió ${res.status}: ${detalle.slice(0, 200)}`)}`);
  }

  const data = await res.json();
  const expiraEn = new Date(Date.now() + (data.expires_in ?? 0) * 1000);

  await prisma.integracionOAuth.update({
    where: { proveedor: "runsignup" },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiraEn,
      codeVerifier: null,
      pendienteDesde: null,
    },
  });

  return NextResponse.redirect(`${origin}/admin/robots?runsignup=conectado`);
}

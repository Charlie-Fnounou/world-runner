import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { generarCodeVerifier, generarCodeChallenge } from "@/lib/pkce";

// El admin entra a esta ruta para arrancar la autorización de RunSignup.
// Genera el code_verifier (PKCE), lo guarda temporalmente, y manda al
// admin a la pantalla de RunSignup para que apruebe el acceso.
export async function GET(request: Request) {
  await requireAdmin();

  const clientId = process.env.RUNSIGNUP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Falta configurar RUNSIGNUP_CLIENT_ID" }, { status: 400 });
  }

  const codeVerifier = generarCodeVerifier();
  const codeChallenge = generarCodeChallenge(codeVerifier);

  await prisma.integracionOAuth.upsert({
    where: { proveedor: "runsignup" },
    update: { codeVerifier, pendienteDesde: new Date() },
    create: { proveedor: "runsignup", codeVerifier, pendienteDesde: new Date() },
  });

  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/runsignup/oauth/callback`;

  const url = new URL("https://runsignup.com/Profile/OAuth2/RequestGrant");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "rsu_api_write");
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("state", "world-runner");

  return NextResponse.redirect(url.toString());
}

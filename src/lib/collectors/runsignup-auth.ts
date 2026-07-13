import { prisma } from "@/lib/prisma";

// Devuelve un access_token válido de RunSignup, renovándolo con el
// refresh_token si ya venció o está por vencer. Lanza un error claro si
// todavía no se autorizó nunca (hay que pasar por /admin/robots primero).
export async function obtenerAccessTokenRunSignup(): Promise<string> {
  const integracion = await prisma.integracionOAuth.findUnique({ where: { proveedor: "runsignup" } });

  if (!integracion?.refreshToken) {
    throw new Error("RunSignup no está autorizado todavía. Conéctalo desde /admin/robots.");
  }

  const faltaPoco = !integracion.expiraEn || integracion.expiraEn.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  if (!faltaPoco && integracion.accessToken) {
    return integracion.accessToken;
  }

  const clientId = process.env.RUNSIGNUP_CLIENT_ID;
  const clientSecret = process.env.RUNSIGNUP_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Faltan RUNSIGNUP_CLIENT_ID/SECRET");

  const res = await fetch("https://runsignup.com/rest/v2/auth/refresh-token.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integracion.refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`No se pudo renovar el token de RunSignup (${res.status})`);

  const data = await res.json();
  const expiraEn = new Date(Date.now() + (data.expires_in ?? 0) * 1000);

  await prisma.integracionOAuth.update({
    where: { proveedor: "runsignup" },
    data: { accessToken: data.access_token, refreshToken: data.refresh_token, expiraEn },
  });

  return data.access_token;
}

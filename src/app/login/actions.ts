"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarCorreo, plantillaLinkMagico } from "@/lib/resend";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

async function origen() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  return `${proto}://${host}`;
}

export async function enviarLinkMagico(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Escribe un correo válido." };
  const next = String(formData.get("next") || "/");

  const admin = createAdminClient();
  const redirectTo = `${await origen()}/auth/callback?next=${encodeURIComponent(next)}`;

  // Generamos el link nosotros mismos (sin que Supabase intente mandar el
  // correo) y lo enviamos con Resend, que sí tenemos garantizado que funciona.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    return { error: "No pudimos generar el link. Intenta de nuevo." };
  }

  try {
    await enviarCorreo({
      to: email,
      subject: "Tu link para entrar a The World Runner",
      html: plantillaLinkMagico(data.properties.action_link),
    });
  } catch {
    return { error: "No pudimos enviar el correo. Intenta de nuevo en un momento." };
  }

  return { ok: true };
}

export async function iniciarConGoogle(formData: FormData) {
  const next = String(formData.get("next") || "/");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origen()}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error || !data.url) redirect("/login?error=Google no está configurado todavía");
  redirect(data.url);
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

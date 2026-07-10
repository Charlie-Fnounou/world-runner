const REMITENTE = "The World Runner <noreply@theworldrunner.com>";

export async function enviarCorreo({ to, subject, html }: { to: string; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: REMITENTE, to: [to], subject, html }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Resend respondió ${res.status}: ${detalle}`);
  }
}

export function plantillaLinkMagico(link: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="font-size: 22px; color: #12151b;">Entrar a The World Runner</h1>
      <p style="color: #5b6472; font-size: 15px; line-height: 1.5;">
        Haz clic en el siguiente botón para iniciar sesión. Este link expira en 1 hora y solo funciona una vez.
      </p>
      <p style="margin: 28px 0;">
        <a href="${link}" style="background:#2547E8; color:#fff; padding:14px 28px; border-radius:999px; text-decoration:none; font-weight:600; display:inline-block;">
          Iniciar sesión
        </a>
      </p>
      <p style="color: #8b94a7; font-size: 13px;">
        Si tú no pediste este correo, puedes ignorarlo con confianza.
      </p>
    </div>
  `;
}

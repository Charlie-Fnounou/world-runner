import type { Metadata } from "next";
import { PaginaLegal } from "@/components/PaginaLegal";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacidadPage() {
  return (
    <PaginaLegal
      eyebrow="Legal"
      titulo="Privacidad"
      actualizado="Última actualización: 1 de octubre de 2026"
      secciones={[
        {
          titulo: "Qué datos guardamos",
          parrafos: [
            "Si creás una cuenta: tu email y, si entrás con Google, tu nombre y foto de perfil.",
            "Lo que hacés dentro del sitio: carreras favoritas, alertas, países o ciudades que seguís, carreras completadas y reseñas.",
            "Si te suscribís: el tipo de plan, su estado y los identificadores de suscripción u orden de PayPal. No vemos ni guardamos los datos de tu tarjeta: los maneja PayPal.",
            "Estadísticas de uso anónimas (páginas visitadas) para mejorar el sitio.",
          ],
        },
        {
          titulo: "Para qué los usamos",
          parrafos: [
            "Para que funcione tu cuenta, enviarte las alertas y resúmenes que pediste, gestionar tu plan y mejorar el sitio. No vendemos tus datos ni los compartimos con anunciantes.",
          ],
        },
        {
          titulo: "Servicios que usamos",
          parrafos: [
            "Supabase (base de datos e inicio de sesión), Vercel (alojamiento y estadísticas), Resend (envío de emails), PayPal (pagos) y Google (inicio de sesión, si lo elegís). Cada uno procesa los datos necesarios para su parte del servicio.",
          ],
        },
        {
          titulo: "Emails",
          parrafos: [
            "Solo te enviamos los emails que pediste (link para entrar, alertas de carreras, resúmenes de los lugares que seguís). Podés dejar de recibirlos quitando la alerta o el seguimiento desde el sitio.",
          ],
        },
        {
          titulo: "Tus derechos",
          parrafos: [
            "Podés pedirnos una copia de tus datos o que borremos tu cuenta y todo lo asociado, escribiéndonos por Instagram a @theworldrunner_OFFICIAL.",
          ],
        },
        {
          titulo: "Cookies",
          parrafos: [
            "Usamos cookies técnicas para mantener tu sesión iniciada y recordar tu idioma y tema. No usamos cookies de publicidad de terceros.",
          ],
        },
      ]}
    />
  );
}

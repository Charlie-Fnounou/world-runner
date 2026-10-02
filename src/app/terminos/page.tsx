import type { Metadata } from "next";
import { PaginaLegal } from "@/components/PaginaLegal";
import { PRECIOS } from "@/lib/precios";

export const metadata: Metadata = { title: "Términos de uso" };

const CONTACTO = "por Instagram a @theworldrunner_OFFICIAL";

export default function TerminosPage() {
  return (
    <PaginaLegal
      eyebrow="Legal"
      titulo="Términos de uso"
      actualizado="Última actualización: 1 de octubre de 2026"
      secciones={[
        {
          titulo: "Qué es The World Runner",
          parrafos: [
            "The World Runner (theworldrunner.com) es un directorio independiente de carreras de running. Reunimos información publicada por organizadores, federaciones y plataformas de inscripción oficiales, y te llevamos al sitio de cada organización para inscribirte.",
            "No organizamos carreras, no vendemos inscripciones y no estamos afiliados a las carreras que listamos.",
          ],
        },
        {
          titulo: "Exactitud de la información",
          parrafos: [
            "Revisamos las fuentes de forma automática y frecuente, pero las fechas, precios, cupos y estados de inscripción pueden cambiar en cualquier momento o contener errores. Confirmá siempre los datos en el sitio oficial de cada carrera antes de inscribirte o de viajar.",
            "Las alertas se envían cuando detectamos un cambio. No garantizamos detectar todos los cambios ni hacerlo en un momento determinado, ni que consigas un cupo.",
          ],
        },
        {
          titulo: "Cuenta",
          parrafos: [
            "Para guardar favoritos, alertas o suscribirte necesitás una cuenta con tu email o con Google. Sos responsable de mantener el acceso a tu cuenta.",
          ],
        },
        {
          titulo: "Planes de pago",
          parrafos: [
            `El plan Pro se cobra por adelantado de forma mensual (US$${PRECIOS.proMensual}) o anual (US$${PRECIOS.proAnual}) y se renueva automáticamente hasta que lo canceles. El plan mensual incluye ${PRECIOS.diasPrueba} días de prueba gratis: si cancelás antes de que terminen, no se te cobra.`,
            `El Pase de ${PRECIOS.diasPase} días (US$${PRECIOS.pase60}) es un pago único que da acceso a Pro durante ${PRECIOS.diasPase} días y no se renueva.`,
            "Los pagos los procesa PayPal. No guardamos datos de tarjetas.",
            "Podés cancelar la suscripción en cualquier momento desde tu perfil. Pro sigue activo hasta el final del período que ya pagaste y no se vuelve a cobrar.",
            `Si tenés un problema con un cobro, escribinos ${CONTACTO} dentro de los 14 días del pago y lo revisamos.`,
            "Podemos cambiar los precios. Si cambian, te avisamos antes de que se aplique al próximo cobro.",
          ],
        },
        {
          titulo: "Uso aceptable",
          parrafos: [
            "No podés copiar el contenido del sitio de forma masiva ni automatizada, ni usarlo para dañar el servicio o a otras personas. Las reseñas y envíos que hagas deben ser reales y respetuosos; podemos moderarlos o quitarlos.",
          ],
        },
        {
          titulo: "Responsabilidad",
          parrafos: [
            "El servicio se ofrece tal como está. En la medida en que la ley lo permita, no somos responsables por pérdidas derivadas de información desactualizada o incorrecta, de cambios o cancelaciones de carreras, ni de decisiones tomadas en base al sitio.",
          ],
        },
        {
          titulo: "Cambios y contacto",
          parrafos: [
            "Podemos actualizar estos términos. Si el cambio es importante, lo vamos a avisar en el sitio.",
            `Para cualquier consulta, escribinos ${CONTACTO}.`,
          ],
        },
      ]}
    />
  );
}

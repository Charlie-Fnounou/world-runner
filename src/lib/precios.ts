// Precios y límites en un solo lugar (en dólares). Si se cambia un precio
// de la suscripción, hay que volver a correr la configuración de PayPal
// desde /admin/pagos: PayPal no deja editar el precio de un plan ya creado.
export const PRECIOS = {
  proMensual: 4.99,
  proAnual: 34.99,
  pase60: 9.99,
  diasPrueba: 7,
  diasPase: 60,
} as const;

export const LIMITES_GRATIS = {
  alertas: 3,
  seguimientosUbicacion: 1,
} as const;

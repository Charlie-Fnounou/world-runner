/**
 * Estación de helado soft serve — every value comes from the brand's own Canva material:
 * flyer "HAS QUE TU EVENTO SEA" (updated Oct 2026), "Alquiler de Máquinas de Helado Soft-Serve",
 * the quote sheets ("mm's, oreo, granola…") and the menus ("MENÚ", "1 Helado en Copa").
 */
export const helado = {
  name: "Estación de helado",
  tagline: "Helado soft serve para eventos, tiendas y centros comerciales",
  flavours: ["Vainilla", "Chocolate", "Fresa", "Galleta"],
  // "Hoy nuestro helado es JALAV ISRAEL"
  kashrut: "Jalav Israel",
  packages: [
    {
      name: "Máquina grande",
      servings: 150,
      price: 450,
      includes: [
        "2 sabores a elección, y el mix de ambos",
        "Copas, conos, cucharitas y servilletas",
        "Personal que la maneja por 3 horas",
        "Transporte en el área metropolitana",
      ],
    },
    {
      name: "Máquina chica",
      servings: 75,
      price: 275,
      includes: [
        "1 sabor a elección",
        "Copas, conos, cucharitas y servilletas",
        "Personal que la maneja por 3 horas",
        "Transporte en el área metropolitana",
      ],
    },
  ],
  extras: [
    { name: "Estación de toppings básica", price: 50, detail: "M&M's, sprinkles, Nutella y leche condensada" },
    { name: "Estación de toppings premium", price: 100, detail: "M&M's, Oreo, sprinkles, katafi, Nutella, leche condensada y crema de pistacho" },
    { name: "Hard cover de chocolate", price: 45, detail: "Cubierta de chocolate que se endurece sobre el helado" },
    { name: "50 helados adicionales", price: 72, detail: "Para el paquete de 150" },
    { name: "Personalización", price: 60, detail: "Rotulamos el mueble, la máquina y las copas con tu marca" },
  ],
  menu: [
    { name: "Helado en copa", detail: "1 sabor o el mix de ambos" },
    { name: "Helado en cono", detail: "1 sabor o el mix de ambos" },
    { name: "Parfait ice cream", detail: "Helado en capas con toppings" },
    { name: "Hard cover sundae", detail: "Con cubierta de chocolate" },
  ],
  occasions: ["Eventos y fiestas", "En casa, oficina o salón", "Lanzamientos y aperturas", "Promociones y fechas especiales", "Activaciones en tiendas", "Centros comerciales"],
  requirements: [
    "Electricidad de 110 V con un breaker de 20 A solo para la máquina",
    "Para reservar: abono del 50 %; el resto se cancela 5 a 7 días antes del evento",
    "Fuera del área metropolitana el transporte puede tener costo",
  ],
} as const;

/**
 * Pesaj order menu. Every name, size and price is copied from the
 * "Pesaj edition" price list Fresh Lovers shared (flyer, WhatsApp).
 * Items with a Jalav Israel option cost $1.00 more, as the flyer notes.
 */

export type PesajOption = { id: string; label?: string; price: number };
export type PesajItem = { name: string; options: PesajOption[] };
export type PesajSection = { title: string; columns?: [string, string]; items: PesajItem[]; note?: string };

const JI = 1;
/** regular + Jalav Israel (+$1.00) */
const ji = (id: string, price: number): PesajOption[] => [
  { id, label: "Regular", price },
  { id: `${id}-ji`, label: "Jalav Israel", price: price + JI },
];
const one = (id: string, price: number): PesajOption[] => [{ id, price }];

export const pesaj = {
  whatsapp: "50766136607",
  phoneDisplay: "6613-6607",
  contact: "Esther Fnounou",
  delivery: 3,
  weeks: ["Semana del 15 de marzo", "Semana del 22 de marzo"],
  sections: [
    {
      title: "Quesos",
      items: [
        { name: "Queso Prensado", options: ji("queso-prensado", 4.5) },
        { name: "Queso Blanco Nacional", options: ji("queso-nacional", 4.5) },
        { name: "Queso Cremoso", options: ji("queso-cremoso", 5.5) },
        { name: "Queso Cremoso Aceitunas", options: ji("queso-cremoso-aceitunas", 5.5) },
        { name: "Leche Fresca", options: one("leche-fresca", 6) },
      ],
      note: "Los precios Jalav Israel suben $1.00.",
    },
    {
      title: "Arepas",
      items: [
        { name: "Arepas de Queso (10)", options: ji("arepas-queso", 16) },
        { name: "Arepas de Zapallo (12)", options: ji("arepas-zapallo", 16) },
        { name: "Arepas de Plátano (12)", options: ji("arepas-platano", 16) },
        { name: "Arepas de Yuca con Queso (12) · sin kitniot", options: ji("arepas-yuca-queso", 16) },
        { name: "Arepas de Yuca Parve (12) · sin kitniot", options: one("arepas-yuca-parve", 15) },
      ],
      note: "Los precios Jalav Israel suben $1.00.",
    },
    {
      title: "Sopas congeladas",
      items: [
        { name: "Sopa Tomate", options: [{ id: "sopa-tomate-266", label: "266 ml", price: 6 }, { id: "sopa-tomate-858", label: "858 ml", price: 11 }] },
        { name: "Sopa Zapallo", options: [{ id: "sopa-zapallo-266", label: "266 ml", price: 6 }, { id: "sopa-zapallo-858", label: "858 ml", price: 11 }] },
        { name: "Sopa Vegetales", options: [{ id: "sopa-vegetales-266", label: "266 ml", price: 6 }, { id: "sopa-vegetales-858", label: "858 ml", price: 11 }] },
      ],
    },
    {
      title: "Yogurt",
      items: [
        { name: "Yogurt Natural 9 oz", options: one("yogurt-natural", 4) },
        { name: "Yogurt Natural con Mermelada de Fresa 9 oz", options: one("yogurt-mermelada", 4.75) },
        { name: "Yogurt Pouch 3.5 oz", options: [{ id: "pouch-fresa", label: "Fresa", price: 2 }, { id: "pouch-vainilla", label: "Vainilla", price: 2 }] },
      ],
      note: "Todos son Jalav Israel.",
    },
    {
      title: "Arroz",
      items: [
        { name: "Arroz Revisado Arrosisimo 4.4 lb", options: one("arroz-arrosisimo", 13) },
        { name: "Arroz Revisado Miro 4 lb", options: one("arroz-miro", 13) },
        { name: "Arroz Jazmín (Carolina) 2 lb", options: one("arroz-jazmin", 13) },
        { name: "Harina de Arroz", options: one("harina-arroz", 6.75) },
      ],
    },
    {
      title: "De la finca",
      items: [
        { name: "OU de Tamarindo", options: one("ou-tamarindo", 21) },
        { name: "Bolitas de Tamarindo", options: one("bolitas-tamarindo", 5) },
        { name: "Yuca Pelada al Vacío", options: one("yuca-vacio", 3) },
        { name: "Zapallo Pelado al Vacío", options: one("zapallo-vacio", 3) },
        { name: "Mix Sopero al Vacío", options: one("mix-sopero", 7) },
        { name: "Harina de Yuca", options: one("harina-yuca", 3.75) },
      ],
    },
    {
      title: "Café",
      items: [
        { name: "Café Tradicional", options: [{ id: "cafe-tradicional-chico", label: "Chico", price: 4 }, { id: "cafe-tradicional-grande", label: "Grande", price: 7 }] },
        { name: "Café Turco", options: [{ id: "cafe-turco-chico", label: "Chico", price: 4 }, { id: "cafe-turco-grande", label: "Grande", price: 7 }] },
      ],
    },
    {
      title: "Frutas secas sin azúcar",
      items: [
        { name: "Manzana Roja Seca 75 g", options: one("manzana-roja", 3.75) },
        { name: "Manzana Verde Seca 75 g", options: one("manzana-verde", 3.75) },
        { name: "Pera Seca 75 g", options: one("pera-seca", 3.75) },
      ],
    },
  ] satisfies PesajSection[],
};

/** every buyable line, by option id */
export const pesajLines = new Map(
  pesaj.sections.flatMap((s) =>
    s.items.flatMap((it) => it.options.map((o) => [o.id, { name: it.name, label: o.label, price: o.price }] as const)),
  ),
);

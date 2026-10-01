import { site } from "./site";

export const faqs = [
  {
    q: "¿Dónde puedo encontrar los productos?",
    a: `En las principales cadenas de supermercados del país: ${site.stores.join(", ")}.`,
  },
  { q: "¿Tienen productos sin gluten?", a: site.glutenFreeNote },
  {
    q: "¿Sus productos son kosher?",
    a: `Nuestra producción cuenta con supervisión de kashrut de ${site.kashrut}. Los lácteos llevan el sello Jalav Israel en la etiqueta; revisa el sello en cada empaque.`,
  },
  {
    q: "¿Cómo se conservan los lácteos?",
    a: "Mantener refrigerado a menos de 4 °C, como indica cada etiqueta. Las sopas se guardan congeladas.",
  },
];

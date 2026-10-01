/**
 * Fresh Lovers product catalog.
 *
 * Sources (all read-only):
 *  - CAT26  Canva "בס״ד" — Catálogo de Productos 2026 (master list, sizes, copy)
 *  - CAT22  Canva "Catalogo Fresh Lovers S.A." (older descriptions)
 *  - LABEL  Canva label artwork (ingredients, net content, claims, kosher marks)
 *
 * Rule: descriptions, sizes, claims and seals are only set when they appear in one
 * of these sources. Colours come from the actual label artwork.
 */

export type PackShape =
  | "pouch"
  | "kidpouch"
  | "cup"
  | "parfait"
  | "yosnack"
  | "tub"
  | "bag"
  | "jar"
  | "tray"
  | "vacuum"
  | "bottle"
  | "block"
  | "arepas"
  | "tortillas"
  | "soup";

export type Seal = "jalav-israel" | "kosher";

export interface Variant {
  name: string;
  /** label colour field */
  bg: string;
  /** text / accent on the label */
  ink: string;
  accent?: string;
  ingredients?: string;
  note?: string;
}

export interface Product {
  slug: string;
  name: string;
  category: CategorySlug;
  /** small tracked caps above the name — like "Y O G U R T" on the labels */
  kicker: string;
  /** Didone display name, label style */
  title: string;
  description: string;
  variants: Variant[];
  sizes: string[];
  highlights?: string[];
  ingredients?: string;
  seals?: Seal[];
  shape: PackShape;
  /** optional real photography: /products/<file> */
  image?: string;
  isNew?: boolean;
  sources: ("CAT26" | "CAT22" | "LABEL")[];
}

export type CategorySlug =
  | "yogurt"
  | "quesos"
  | "labne-dips"
  | "arepas"
  | "granola"
  | "cafe"
  | "aceitunas"
  | "de-la-finca"
  | "sopas"
  | "fruta-seca"
  | "harinas";

export interface Category {
  slug: CategorySlug;
  name: string;
  /** one-line catalog copy (CAT26), shortened */
  blurb: string;
  bg: string;
  ink: string;
}

export const categories: Category[] = [
  {
    slug: "yogurt",
    name: "Yogurt",
    blurb: "Natural, cremoso y con probióticos. En copa, vaso o pouch.",
    bg: "#C9D6E3",
    ink: "#1F3550",
  },
  {
    slug: "quesos",
    name: "Quesos",
    blurb: "Quesos frescos hechos con leche natural. Textura suave, sabor auténtico.",
    bg: "#EFE3C4",
    ink: "#3A2E12",
  },
  {
    slug: "labne-dips",
    name: "Labne & Dips",
    blurb: "Para untar, mojar y compartir.",
    bg: "#5B60D6",
    ink: "#FFFFFF",
  },
  {
    slug: "arepas",
    name: "Arepas",
    blurb: "Perfectas para cualquier momento del día, llenas de sabor artesanal.",
    bg: "#F2C14E",
    ink: "#3B2406",
  },
  {
    slug: "granola",
    name: "Granola",
    blurb: "Avena integral, crujiente y llena de sabor.",
    bg: "#E9D8C4",
    ink: "#6E3B3C",
  },
  {
    slug: "cafe",
    name: "Café",
    blurb: "Café artesanal cosechado en la cuenca del Canal de Panamá.",
    bg: "#2E3F7A",
    ink: "#F4EFE6",
  },
  {
    slug: "aceitunas",
    name: "Aceitunas",
    blurb: "Aceitunas condimentadas con sabores de diferentes culturas.",
    bg: "#C3C59A",
    ink: "#2E3517",
  },
  {
    slug: "de-la-finca",
    name: "De la Finca",
    blurb: "Práctico y fresco, para usar directo o tener congelado.",
    bg: "#B7D96A",
    ink: "#1E3510",
  },
  {
    slug: "sopas",
    name: "Sopas",
    blurb: "Sin lácteos. Se guardan congeladas, listas para calentar y servir.",
    bg: "#E9744A",
    ink: "#2A0F06",
  },
  {
    slug: "fruta-seca",
    name: "Fruta Seca",
    blurb: "Fruta seca completamente natural, sin azúcar.",
    bg: "#D93A3F",
    ink: "#FFF6EE",
  },
  {
    slug: "harinas",
    name: "Harinas",
    blurb: "Harinas de yuca, plátano y arroz.",
    bg: "#EDE6D8",
    ink: "#3B3328",
  },
];

const YOGURT_CULTURES =
  "fermento lácteo (Bifidobacterium, Lactobacillus acidophilus, Lactobacillus delbrueckii subsp. bulgaricus, Streptococcus thermophilus)";

export const products: Product[] = [
  /* ───────────────────────────── YOGURT ───────────────────────────── */
  {
    slug: "yogurt-griego",
    name: "Yogurt Griego",
    category: "yogurt",
    kicker: "Yogurt",
    title: "Griego",
    description:
      "Yogurt griego con probióticos, en seis sabores. El natural no lleva azúcar.",
    isNew: true,
    variants: [
      {
        name: "natural",
        bg: "#C3D2E1",
        ink: "#2F4A63",
        accent: "#8FA8C0",
        ingredients: `Leche pasteurizada, ${YOGURT_CULTURES}.`,
        note: "Sin azúcar",
      },
      {
        name: "vainilla",
        bg: "#F1E3BF",
        ink: "#7A5A22",
        accent: "#C9A464",
        ingredients: `Leche pasteurizada, ${YOGURT_CULTURES}, azúcar, esencia de vainilla.`,
      },
      {
        name: "fresa",
        bg: "#F6C3CB",
        ink: "#A3263F",
        accent: "#E06A80",
        ingredients: `Leche pasteurizada, ${YOGURT_CULTURES}, fresas, azúcar, saborizante.`,
      },
      {
        name: "berries",
        bg: "#E2C1DA",
        ink: "#6A2457",
        accent: "#B36AA0",
        ingredients: `Leche pasteurizada, ${YOGURT_CULTURES}, fresas, blueberries, azúcar, saborizante.`,
      },
      {
        name: "blueberry",
        bg: "#BFC6EC",
        ink: "#2E3A8A",
        accent: "#6E7BC9",
        ingredients: `Leche pasteurizada, ${YOGURT_CULTURES}, blueberries, azúcar, saborizante.`,
      },
      {
        name: "banana-fresa",
        bg: "#F7E29A",
        ink: "#9C2C3C",
        accent: "#E7B43C",
        ingredients: `Leche pasteurizada, ${YOGURT_CULTURES}, fresas, banana, azúcar, saborizante.`,
      },
    ],
    sizes: ["Copa 150 ml", "Pouch 250 ml", "470 ml"],
    highlights: ["9 g de proteínas (250 ml)", "Contiene probióticos", "Natural sin azúcar"],
    seals: ["jalav-israel"],
    shape: "pouch",
    sources: ["LABEL"],
  },
  {
    slug: "yogurt-en-pouch",
    name: "Yogurt en Pouch",
    category: "yogurt",
    kicker: "Yogurt con probióticos",
    title: "Pouch",
    description: "Yogurt con probióticos en pouch de 250 ml. Ocho sabores.",
    variants: [
      { name: "Natural", bg: "#F3F1EC", ink: "#1E4C8F", accent: "#2A64B5", note: "Extra creamy" },
      { name: "Fresa", bg: "#F7D3D9", ink: "#B32446" },
      { name: "Blueberry", bg: "#D4D8F2", ink: "#2B3A8F" },
      { name: "Fresa - Banana", bg: "#F8E7A8", ink: "#B32446" },
      { name: "Vainilla", bg: "#F3E7C9", ink: "#7A5A22" },
      { name: "Galleta", bg: "#E3D8CB", ink: "#3A2A20" },
      { name: "Berries", bg: "#E5CADF", ink: "#6A2457" },
      { name: "Piña", bg: "#F8E08A", ink: "#7A5A0A" },
    ],
    sizes: ["250 ml"],
    highlights: ["Yogurt con probióticos"],
    ingredients: `Leche pasteurizada, ${YOGURT_CULTURES}. Los sabores llevan además fruta o saborizante y azúcar.`,
    seals: ["jalav-israel"],
    shape: "pouch",
    sources: ["CAT26", "LABEL"],
  },
  {
    slug: "yogurt-copa",
    name: "Yogurt Copa",
    category: "yogurt",
    kicker: "Yogurt",
    title: "Copa",
    description:
      "Yogurt natural, cremoso y delicioso, elaborado con ingredientes cuidadosamente seleccionados para lograr una textura suave y un sabor auténtico.",
    variants: [
      { name: "Fresa", bg: "#F4C6CF", ink: "#A3263F" },
      { name: "Vainilla", bg: "#F3E4BE", ink: "#7A5A22" },
      { name: "Galleta", bg: "#DCCFC0", ink: "#3A2A20" },
      { name: "Natural", bg: "#C9DAEC", ink: "#1E4C8F" },
    ],
    sizes: ["Copa 150 ml"],
    shape: "cup",
    sources: ["CAT26"],
  },
  {
    slug: "yogurt-copa-especiales",
    name: "Yogurt Copa Especiales",
    category: "yogurt",
    kicker: "Yogurt copa",
    title: "Especiales",
    description:
      "Una combinación irresistible que convierte cada cucharada en un verdadero placer.",
    variants: [
      { name: "con Chocolate", bg: "#EDE2D6", ink: "#5A2E22", accent: "#5A3426" },
      { name: "con Dulce de Leche", bg: "#F1E2CC", ink: "#8A4A1C", accent: "#B8742F" },
      { name: "con Mermelada", bg: "#F3D9D9", ink: "#9E2433", accent: "#B3243B" },
    ],
    sizes: ["Copa"],
    shape: "cup",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "parfait",
    name: "Parfait de Yogurt con Granola",
    category: "yogurt",
    kicker: "Parfait",
    title: "Parfait",
    description:
      "Yogurt natural extra cremoso con mermelada y granola. En copa o en vaso.",
    variants: [
      {
        name: "Fresa",
        bg: "#FBF8F3",
        ink: "#8E2B2B",
        accent: "#B3243B",
        ingredients:
          "Leche pasteurizada, granola (avena, pasitas, almendras, miel), mermelada de fresa, cultivo lácteo (Bifidobacterium, Lactobacillus acidophilus, Lactobacillus delbrueckii subsp. bulgaricus, Streptococcus thermophilus).",
      },
      { name: "Piña", bg: "#FBF8F3", ink: "#8E2B2B", accent: "#E9A520" },
      { name: "Apricot", bg: "#FBF8F3", ink: "#8E2B2B", accent: "#E88A2A" },
      { name: "Blueberry", bg: "#FBF8F3", ink: "#8E2B2B", accent: "#3B2A5E" },
    ],
    sizes: ["Parfait copa", "Parfait vaso 10 oz"],
    highlights: ["Extra creamy", "Probióticos"],
    seals: ["kosher"],
    shape: "parfait",
    sources: ["CAT26", "CAT22", "LABEL"],
  },
  {
    slug: "yosnack",
    name: "YoSnack",
    category: "yogurt",
    kicker: "Yogurt + toppings",
    title: "YoSnack",
    description:
      "Una opción práctica y deliciosa, perfecta para disfrutar como snack en cualquier momento del día. Con toppings: Oreo, granola, M&M's o cereal.",
    variants: [
      { name: "Vainilla", bg: "#DDE15A", ink: "#3D4210", accent: "#F2F0E6" },
      { name: "Fresa", bg: "#F27DB2", ink: "#5C0F35", accent: "#F2F0E6" },
    ],
    sizes: ["Toppings: Oreo · Granola · M&M's · Cereal"],
    shape: "yosnack",
    sources: ["CAT26"],
  },
  {
    slug: "yogurt-pouches-ninos",
    name: "Yogurt Pouches",
    category: "yogurt",
    kicker: "Para loncheras",
    title: "Pouches",
    description:
      "Un snack pensado para niños activos: yogurt cremoso en un empaque práctico, fácil de abrir. Perfecto para loncheras, paseos y meriendas.",
    variants: [
      { name: "Fresa", bg: "#EC4F93", ink: "#FFFFFF", accent: "#C21E63" },
      { name: "Vainilla", bg: "#F6C928", ink: "#4A3200", accent: "#FFFFFF" },
      { name: "Galleta", bg: "#2C9CDB", ink: "#FFFFFF", accent: "#0F3A66" },
      { name: "Chocolate", bg: "#5B3426", ink: "#FFFFFF", accent: "#C79A6B" },
    ],
    sizes: ["Pouch"],
    shape: "kidpouch",
    sources: ["CAT26", "CAT22"],
  },

  /* ───────────────────────────── QUESOS ───────────────────────────── */
  {
    slug: "queso-prensado",
    name: "Queso Prensado",
    category: "quesos",
    kicker: "Queso fresco",
    title: "Prensado",
    description: "Queso fresco prensado con un toque de sal. También bajo en sal.",
    variants: [
      { name: "con Sal", bg: "#141210", ink: "#FFFFFF", accent: "#E2B33C" },
      { name: "Bajo en Sal", bg: "#141210", ink: "#FFFFFF", accent: "#4D8FD1" },
    ],
    sizes: ["8 oz", "Barra ≈ 2.5 kg"],
    shape: "block",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "queso-cremoso",
    name: "Queso Cremoso",
    category: "quesos",
    kicker: "Queso fresco",
    title: "Cremoso",
    description: "Queso fresco suave con textura cremosa.",
    variants: [{ name: "Cremoso", bg: "#141210", ink: "#FFFFFF", accent: "#E58F3B" }],
    sizes: ["8 oz"],
    shape: "block",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "queso-cremoso-aleppo",
    name: "Queso Cremoso Aleppo",
    category: "quesos",
    kicker: "Queso cremoso",
    title: "Aleppo",
    description: "Queso fresco blanco suave con semillas.",
    variants: [{ name: "Aleppo", bg: "#141210", ink: "#FFFFFF", accent: "#C0392B" }],
    sizes: ["8 oz"],
    shape: "block",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "queso-cremoso-aceituna",
    name: "Queso Cremoso Aceituna",
    category: "quesos",
    kicker: "Queso cremoso",
    title: "Aceituna",
    description: "Queso fresco blanco suave con aceitunas verdes trituradas.",
    variants: [{ name: "Aceituna", bg: "#141210", ink: "#FFFFFF", accent: "#8A9A3A" }],
    sizes: ["8 oz"],
    shape: "block",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "queso-nacional",
    name: "Queso Blanco Nacional",
    category: "quesos",
    kicker: "Queso blanco",
    title: "Nacional",
    description: "Queso fresco blanco con una textura única.",
    variants: [{ name: "Nacional", bg: "#141210", ink: "#FFFFFF", accent: "#2E8B57" }],
    sizes: ["8 oz"],
    shape: "block",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "mozzarella",
    name: "Mozzarella",
    category: "quesos",
    kicker: "Queso",
    title: "Mozzarella",
    description: "Mozzarella en bloque, rayada o rebanada.",
    variants: [
      { name: "Rayado", bg: "#1E7F86", ink: "#FFFFFF", accent: "#F6E7A8" },
      { name: "Rebanado", bg: "#1F2F66", ink: "#FFFFFF", accent: "#F6E7A8" },
    ],
    sizes: ["8 oz", "Rayado", "Rebanado", "Barra ≈ 2.5 kg"],
    shape: "bag",
    sources: ["CAT26"],
  },
  {
    slug: "snack-pack",
    name: "Snack Pack",
    category: "quesos",
    kicker: "Queso + aceitunas",
    title: "Snack Pack",
    description: "Queso prensado con aceitunas verdes condimentadas con finas especias.",
    variants: [{ name: "Snack Pack", bg: "#B8C27A", ink: "#22300E", accent: "#F7F1DF" }],
    sizes: ["Vaso"],
    shape: "cup",
    sources: ["CAT26"],
  },

  /* ─────────────────────────── LABNE & DIPS ─────────────────────────── */
  {
    slug: "labne",
    name: "Labne",
    category: "labne-dips",
    kicker: "Labne",
    title: "Labne",
    description: "Labne cremoso, solo o con za'atar y aceite de oliva.",
    variants: [
      {
        name: "Natural",
        bg: "#5B60D6",
        ink: "#FFFFFF",
        accent: "#F3EFE4",
        ingredients: `Leche pasteurizada, ${YOGURT_CULTURES}, sal, ácido cítrico.`,
      },
      {
        name: "con Za'atar",
        bg: "#4B50C2",
        ink: "#FFFFFF",
        accent: "#9BA84A",
        ingredients: `Leche pasteurizada, ${YOGURT_CULTURES}, aceite de oliva, za'atar, sal, ácido cítrico.`,
      },
    ],
    sizes: ["266 ml"],
    seals: ["jalav-israel"],
    shape: "tub",
    sources: ["CAT26", "LABEL"],
  },
  {
    slug: "labne-con-chips",
    name: "Labne con Chips",
    category: "labne-dips",
    kicker: "Labne",
    title: "con Chips",
    description: "Labne con chips para mojar. Un snack listo para llevar.",
    variants: [{ name: "Labne con Chips", bg: "#2F45A8", ink: "#FFFFFF", accent: "#D9A85B" }],
    sizes: ["Vaso"],
    shape: "cup",
    sources: ["CAT26"],
  },
  {
    slug: "ricotta",
    name: "Queso Ricotta",
    category: "labne-dips",
    kicker: "Queso",
    title: "Ricotta",
    description: "Una opción práctica y deliciosa para cualquier momento del día.",
    variants: [
      {
        name: "Ricotta",
        bg: "#5FB3B0",
        ink: "#FFFFFF",
        accent: "#F3EFE4",
        ingredients: `Leche pasteurizada, sal, ${YOGURT_CULTURES}.`,
      },
    ],
    sizes: ["266 ml"],
    seals: ["jalav-israel"],
    shape: "tub",
    sources: ["CAT26", "LABEL"],
  },
  {
    slug: "dip-aceituna",
    name: "Dip Aceituna",
    category: "labne-dips",
    kicker: "Dip",
    title: "Aceituna",
    description: "Dip cremoso con aceitunas verdes.",
    variants: [
      {
        name: "Aceituna",
        bg: "#D3C64A",
        ink: "#2E3517",
        accent: "#6F7F2A",
        ingredients: `Leche pasteurizada, ${YOGURT_CULTURES}, aceitunas verdes, sal.`,
      },
    ],
    sizes: ["180 ml"],
    seals: ["jalav-israel"],
    shape: "tub",
    sources: ["CAT26", "LABEL"],
  },

  /* ───────────────────────────── AREPAS ───────────────────────────── */
  {
    slug: "arepa-maiz-con-queso",
    name: "Arepa de Maíz con Queso",
    category: "arepas",
    kicker: "Arepa",
    title: "Maíz con Queso",
    description: "Deliciosa arepa de harina de maíz con queso.",
    variants: [{ name: "Maíz con Queso", bg: "#F4D57A", ink: "#1F3C8F", accent: "#E9B949" }],
    sizes: ["9 und."],
    shape: "arepas",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "arepa-maiz",
    name: "Arepa de Maíz",
    category: "arepas",
    kicker: "Arepa",
    title: "Maíz",
    description: "Arepa de maíz, perfecta para cualquier momento del día.",
    variants: [{ name: "Maíz", bg: "#F6DF8E", ink: "#3B5E1F", accent: "#EFC650" }],
    sizes: ["12 und."],
    shape: "arepas",
    sources: ["CAT26"],
  },
  {
    slug: "arepa-yuca-con-queso",
    name: "Arepa de Yuca con Queso",
    category: "arepas",
    kicker: "Arepa",
    title: "Yuca con Queso",
    description: "Arepa de yuca con harina de maíz y queso.",
    variants: [{ name: "Yuca con Queso", bg: "#F3E8C8", ink: "#2C6E8F", accent: "#EADBA8" }],
    sizes: ["12 und."],
    shape: "arepas",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "arepa-yuca",
    name: "Arepa de Yuca (sin queso)",
    category: "arepas",
    kicker: "Arepa",
    title: "Yuca",
    description: "Arepa de yuca con harina de maíz, sin queso.",
    variants: [{ name: "Yuca", bg: "#F1E6CC", ink: "#7A2E2E", accent: "#E8D9A9" }],
    sizes: ["12 und."],
    shape: "arepas",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "arepa-yuca-queso-pesto",
    name: "Arepa de Yuca con Queso y Pesto",
    category: "arepas",
    kicker: "Arepa",
    title: "Yuca, Queso y Pesto",
    description: "Arepa de yuca con queso y pesto.",
    variants: [{ name: "Queso y Pesto", bg: "#E9E3C2", ink: "#2F5A1E", accent: "#DCCF94" }],
    sizes: ["12 und."],
    shape: "arepas",
    sources: ["CAT26"],
  },
  {
    slug: "arepa-platano-con-queso",
    name: "Arepa de Plátano con Queso",
    category: "arepas",
    kicker: "Arepa",
    title: "Plátano con Queso",
    description: "Arepa de plátano con harina de maíz y queso.",
    variants: [{ name: "Plátano con Queso", bg: "#E9A43A", ink: "#2C6E8F", accent: "#D98B22" }],
    sizes: ["12 und."],
    shape: "arepas",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "arepa-zanahoria-chia",
    name: "Arepa de Zanahoria - Chía con Queso",
    category: "arepas",
    kicker: "Arepa",
    title: "Zanahoria & Chía",
    description: "Arepa de zanahoria con chía, harina de maíz y queso.",
    variants: [{ name: "Zanahoria - Chía", bg: "#EE9142", ink: "#2C6E8F", accent: "#E07A2A" }],
    sizes: ["12 und."],
    shape: "arepas",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "tortillas-de-maiz",
    name: "Tortillas de Maíz",
    category: "arepas",
    kicker: "Tortillas",
    title: "Maíz",
    description: "Tortillas de maíz.",
    variants: [{ name: "Maíz", bg: "#F3C93F", ink: "#2C4E1E", accent: "#F7DE84" }],
    sizes: ["10 und."],
    shape: "tortillas",
    sources: ["CAT26"],
  },

  /* ───────────────────────────── GRANOLA ───────────────────────────── */
  {
    slug: "granola",
    name: "Granola",
    category: "granola",
    kicker: "Desayuno y snack en un solo empaque",
    title: "Granola",
    description:
      "Elaborada con ingredientes naturales y avena integral: crujiente, rica en fibra y llena de sabor. Para el desayuno, con yogurt o como snack.",
    variants: [
      {
        name: "The Original",
        bg: "#F4ECE0",
        ink: "#7A4446",
        accent: "#7A4446",
        ingredients: "Avena integral, millet, buckwheat, aceite de coco, maple, azúcar morena, sal.",
      },
      {
        name: "Choco Chips",
        bg: "#F4ECE0",
        ink: "#2D6C7A",
        accent: "#4A2A1E",
        ingredients:
          "Avena integral, chocolate, millet, buckwheat, aceite de coco, maple, azúcar morena, sal.",
      },
      {
        name: "Fresas Secas",
        bg: "#F4ECE0",
        ink: "#A8505A",
        accent: "#D2414F",
        ingredients:
          "Avena integral, fresas, millet, buckwheat, aceite de coco, maple, azúcar morena, sal.",
      },
      {
        name: "Pasas y Almendras",
        bg: "#F4ECE0",
        ink: "#5E7A2C",
        accent: "#8A5A32",
        ingredients:
          "Avena integral, pasas, almendras, millet, buckwheat, aceite de coco, maple, azúcar morena, sal.",
      },
    ],
    sizes: ["Bolsa 225 g", "Frasco 180 g"],
    highlights: ["Hecho con avena integral", "100% natural", "Sin conservantes", "Fuente de fibra"],
    seals: ["kosher"],
    shape: "bag",
    sources: ["CAT26", "LABEL"],
  },

  /* ───────────────────────────── CAFÉ ───────────────────────────── */
  {
    slug: "cafe-artesanal",
    name: "Café Artesanal",
    category: "cafe",
    kicker: "Café",
    title: "Artesanal",
    description:
      "Café artesanal Fresh Lovers, cosechado en la cuenca del Canal de Panamá, con un perfil de sabor único y aroma envolvente.",
    variants: [
      { name: "En Granos", bg: "#F7F5F0", ink: "#3A2A1E", accent: "#8A5A32" },
      { name: "Molido", bg: "#F7F5F0", ink: "#3A2A1E", accent: "#2E4A8C" },
      { name: "Turco Molido", bg: "#F7F5F0", ink: "#3A2A1E", accent: "#5E3F86" },
    ],
    sizes: ["Granos 450 g", "Molido 225 g · 450 g", "Turco 225 g · 450 g"],
    shape: "bag",
    sources: ["CAT26", "CAT22"],
  },

  /* ───────────────────────────── ACEITUNAS ───────────────────────────── */
  {
    slug: "aceitunas-condimentadas",
    name: "Aceitunas Condimentadas",
    category: "aceitunas",
    kicker: "Aceitunas",
    title: "Condimentadas",
    description:
      "Perfectas para cualquier momento del día, con una variedad de sabores de diferentes culturas.",
    variants: [
      {
        name: "con Ou",
        bg: "#C3C59A",
        ink: "#2E3517",
        accent: "#6E7A3A",
        ingredients:
          "Aceitunas, tamarindo, azúcar, aceite de oliva, limón, vinagre, ajo, orégano, paprika, hojuelas de chile picante.",
      },
      {
        name: "Spicy",
        bg: "#C7C39A",
        ink: "#3B2E12",
        accent: "#A2452A",
        ingredients:
          "Aceitunas, tamarindo, azúcar, aceite de oliva, limón, cebolla, pimentón, ajo, cebollina, hojuelas de chile picante.",
      },
      {
        name: "Marinadas",
        bg: "#BFC79E",
        ink: "#2E3517",
        accent: "#3E2A2A",
        ingredients: "Aceitunas, orégano, ajo, limón, laurel, aceite de oliva, pimienta.",
      },
      {
        name: "Greek",
        bg: "#C9CCA6",
        ink: "#2E3517",
        accent: "#4A3E52",
        ingredients:
          "Aceitunas, limón, ajo, aceite de oliva, azúcar, orégano, tomillo, hojuelas de pimienta roja, sal, pimienta.",
      },
    ],
    sizes: ["10 oz"],
    seals: ["kosher"],
    shape: "tray",
    sources: ["CAT26", "LABEL"],
  },

  /* ─────────────────────────── DE LA FINCA ─────────────────────────── */
  {
    slug: "mix-sopero",
    name: "Mix Sopero",
    category: "de-la-finca",
    kicker: "De la finca",
    title: "Mix Sopero",
    description:
      "Yuca, zanahoria, zapallo, ñame y otoe frescos, pelados, limpios y empacados al vacío.",
    variants: [{ name: "Mix Sopero", bg: "#9CCB3B", ink: "#1E3510", accent: "#F0A13A" }],
    sizes: ["1 kilo"],
    shape: "vacuum",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "yuca-al-vacio",
    name: "Yuca al Vacío",
    category: "de-la-finca",
    kicker: "De la finca",
    title: "Yuca",
    description: "Yuca fresca, pelada y limpia, empacada al vacío.",
    variants: [{ name: "Yuca", bg: "#9CCB3B", ink: "#1E3510", accent: "#F4EEDC" }],
    sizes: ["1 kilo"],
    shape: "vacuum",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "zapallo-al-vacio",
    name: "Zapallo al Vacío",
    category: "de-la-finca",
    kicker: "De la finca",
    title: "Zapallo",
    description: "Zapallo fresco, pelado y limpio, empacado al vacío.",
    variants: [{ name: "Zapallo", bg: "#9CCB3B", ink: "#1E3510", accent: "#F2A22E" }],
    sizes: ["1 kilo"],
    shape: "vacuum",
    sources: ["CAT26", "CAT22"],
  },
  {
    slug: "limon-exprimido",
    name: "Limón Exprimido",
    category: "de-la-finca",
    kicker: "De la finca",
    title: "Limón",
    description: "Limón exprimido, listo para usar.",
    variants: [{ name: "Limón", bg: "#D7E84A", ink: "#1E3510", accent: "#F6F8D8" }],
    sizes: ["Botella"],
    shape: "bottle",
    sources: ["CAT26"],
  },

  /* ───────────────────────────── SOPAS ───────────────────────────── */
  {
    slug: "sopas",
    name: "Sopas",
    category: "sopas",
    kicker: "Sopa",
    title: "Sopas",
    description:
      "Cremosas, siempre con ingredientes frescos y naturales, sin lácteos. Se guardan congeladas, listas para calentar y servir.",
    variants: [
      { name: "Tomate", bg: "#E5532E", ink: "#FFFFFF", accent: "#F3E9D8" },
      { name: "Lentejas", bg: "#9A6A3A", ink: "#FFFFFF", accent: "#F3E9D8" },
      { name: "Arvejas", bg: "#8DB04A", ink: "#FFFFFF", accent: "#F3E9D8" },
      { name: "Zapallo", bg: "#EE9A2E", ink: "#FFFFFF", accent: "#F3E9D8" },
      { name: "Vegetales", bg: "#D9A53A", ink: "#FFFFFF", accent: "#F3E9D8" },
    ],
    sizes: ["Congelada"],
    highlights: ["Sin lácteos"],
    shape: "soup",
    sources: ["CAT26"],
  },

  /* ─────────────────────────── FRUTA SECA ─────────────────────────── */
  {
    slug: "fruta-seca",
    name: "Fruta Seca",
    category: "fruta-seca",
    kicker: "Fruit Exotic",
    title: "Fruta Seca",
    description: "Fruta seca completamente natural, sin azúcar.",
    variants: [
      { name: "Manzana Roja", bg: "#D23A3F", ink: "#FFFFFF", accent: "#F4E3C3" },
      { name: "Manzana Verde", bg: "#7FAE2E", ink: "#FFFFFF", accent: "#F4E3C3" },
      { name: "Pera", bg: "#A7B83A", ink: "#FFFFFF", accent: "#F4E3C3" },
    ],
    sizes: ["75 g"],
    highlights: ["Sin azúcar"],
    shape: "bag",
    sources: ["CAT26"],
  },

  /* ───────────────────────────── HARINAS ───────────────────────────── */
  {
    slug: "harinas",
    name: "Harinas",
    category: "harinas",
    kicker: "Harina",
    title: "Harinas",
    description: "Harinas de yuca, plátano y arroz.",
    variants: [
      { name: "de Yuca", bg: "#F6F3EC", ink: "#C2672A", accent: "#C2672A" },
      { name: "de Plátano", bg: "#F6F3EC", ink: "#6E8F2A", accent: "#6E8F2A" },
      { name: "de Arroz", bg: "#F6F3EC", ink: "#3C6EA8", accent: "#3C6EA8" },
    ],
    sizes: ["225 g"],
    shape: "bag",
    sources: ["CAT26"],
  },
];

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const productsIn = (slug: CategorySlug) => products.filter((p) => p.category === slug);
export const skuCount = products.reduce((n, p) => n + p.variants.length, 0);

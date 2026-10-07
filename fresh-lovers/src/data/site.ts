/**
 * Verified brand facts. Every value here has a source noted next to it —
 * do not add claims that can't be traced back to brand material.
 */
export const site = {
  name: "Fresh Lovers",
  legalName: "Fresh Lovers S.A.",
  url: "https://freshloverspty.com",
  tagline: "calidad y sabor", // label sticker "— calidad y sabor —"
  since: 2018, // freshloverspty.com/about
  email: "freshloverspty@gmail.com", // Catálogo de Productos 2026 (cover)
  // Phone printed on every label. Used for WhatsApp: confirm before launch.
  phoneDisplay: "6864-4453",
  phoneE164: "+50768644453",
  whatsapp: "50768644453",
  instagram: "freshloverspty", // instagram.com/freshloverspty
  plant: {
    line1: "Planta #1747l, La Herradura",
    line2: "La Chorrera, Rep. de Panamá",
    locality: "La Chorrera",
    region: "Panamá Oeste",
  },
  kashrut: "Shevet Ahim", // freshloverspty.com/about
  // freshloverspty.com FAQ — "¿Dónde puedo encontrar los productos?"
  stores: [
    "Supermercados Rey",
    "Super Xtra",
    "Super El Fuerte",
    "Super Kosher",
    "Deli K Market",
    "Foodie",
  ],
  // freshloverspty.com FAQ — "¿Tienen productos sin gluten?"
  glutenFreeNote:
    "Sí. Tenemos una amplia gama de productos sin gluten, incluyendo quesos, arepas, yogures, harina de yuca, harina de arroz, harina de plátano y cafés.",
} as const;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const instagramLink = `https://www.instagram.com/${site.instagram}/`;

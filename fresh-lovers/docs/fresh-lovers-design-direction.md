# Fresh Lovers Panamá — Design Direction

_Internal document · Oct 2026_

## 0. Sources & access log

| Source | Status | What was used |
|---|---|---|
| Canva — **"בס״ד" (Catálogo de Productos 2026, 20 pp.)** | ✅ Read-only (text + previews) | Master product list, sizes, category copy, photography direction |
| Canva — "Catalogo Fresh Lovers S.A." (17 pp., older) | ✅ Read-only | Older SKUs, descriptions, brush-stroke motif, "BS"D" mark |
| Canva — label designs (Yogurt Griego 250/150/470 ml, Labne/Dips sticker, Granola, Parfait, Pouches 250 ml Jalav, Aceitunas, Elaborado-por sticker) | ✅ Read-only (text + previews) | Label typography/geometry/colours, ingredients, net contents, kosher marks |
| freshloverspty.com | ⚠️ Blocked by sandbox egress policy | Content via search-engine extracts only (about text, FAQ, stores) |
| Instagram @freshloverspty + reference reel | ⚠️ Blocked by sandbox egress policy | Not inspected visually. Handle verified via search index |
| Local catalog file | ❌ None in container | — (Canva catalog used instead) |

Nothing in Canva was opened in edit mode: no transactions, exports, copies, comments or uploads.

## 1. What Fresh Lovers is

- **Fresh Lovers S.A.** is a Panamanian food producer, active **since 2018** (about page).
- Plant: **Planta #1747l, La Herradura, La Chorrera, Rep. de Panamá**. Tel **6864-4453** (on every label).
- Kashrut supervised by **Shevet Ahim** (about page). Dairy labels carry **"Jalav Israel"**; some savoury labels carry **"Bishul Israel"**.
- Sold in **Supermercados Rey, Super Xtra, Super El Fuerte, Super Kosher, Deli K Market, Foodie** (FAQ).
- Brand line from labels: **"— calidad y sabor —"**.
- Contact from the 2026 catalog cover: **www.freshloverspty.com · freshloverspty@gmail.com**.

## 2. Products and categories (2026 catalog)

| Category | Lines |
|---|---|
| Quesos | Prensado con Sal / Bajo en Sal, Cremoso, Cremoso Aleppo, Cremoso Aceituna, Nacional (8 oz; barra ≈2.5 kg), Mozzarella (8 oz, rayado, rebanado, barra), Snack Pack |
| Labne & Dips | Labne, Labne con Za'atar (266 ml), Labne con Chips, Queso Ricotta (266 ml), Dip Aceituna (180 ml) |
| Arepas & Tortillas | Maíz con Queso (9 und), Yuca con Queso, Plátano con Queso, Zanahoria-Chía con Queso, Yuca sin queso, Maíz, Yuca con Queso y Pesto (12 und), Tortillas de Maíz (10 und) |
| Yogurt | Pouch 250 ml (8 flavours), Yogurt Griego (labels: 150/250/470 ml), Copa 150 ml (4), Copa Especiales (3), Parfait (copa/vaso), YoSnack (2 + toppings), Kids Pouches (4) |
| Granola | The Original, Choco Chips, Fresas Secas, Pasas y Almendras (bolsa 225 g / frasco 180 g) |
| Café Artesanal | En granos 450 g, Molido 225/450 g, Turco 225/450 g — "cosechado en la cuenca del Canal de Panamá" |
| Aceitunas | Con Ou, Spicy, Marinadas, Greek (10 oz) |
| De la Finca | Mix Sopero, Yuca al vacío, Zapallo al vacío (1 kg), Limón Exprimido |
| Sopas | Tomate, Lentejas, Arvejas, Zapallo, Vegetales (congeladas, sin lácteos) |
| Fruta seca | Manzana Roja, Manzana Verde, Pera (75 g, "sin azúcar") |
| Harinas | Yuca, Plátano, Arroz (225 g) |

## 3. Existing visual identity

- **Logo**: a black **scalloped cartouche** (a baroque label frame) with a two-leaf sprout, condensed caps **FRESH**, a rule, and widely tracked lowercase **lovers**. It also appears inverted (white on colour) on the labels.
- **Typography on packs**: a high-contrast Didone (GRIEGO, LABNE, NATURAL), widely tracked thin caps (Y O G U R T), and a lowercase serif for the flavour name (vainilla, natural).
- **Colour**: every SKU owns a colour. Dusty blue = natural, vanilla gold, strawberry pink, **cobalt periwinkle = Labne**, maroon = Granola, sage = Aceitunas, lime = De la Finca. Kids pouches use saturated yellow/blue/pink/brown.
- **Motifs**: half-circle colour fields behind the food photos, the blue watercolour **brush stroke** under catalog titles, and the **mola-like geometric pattern** on the coffee bags.
- **Seals**: K-crown kosher marks (green, blue and black variants) and **בס״ד** on catalogs.

## 4. Packaging observations

- The labels are far more premium than the current website: editorial Didone on generous white space.
- A strong system: **cartouche + Didone name + tracked category + italic flavour + colour field**. That repeats across Griego, Labne, Aceitunas and Granola, which makes it ideal as a UI language.
- Consistency issues: the kids pouches and YoSnack are a separate "fun" sub-brand. Arepas, soups and flours vary.

## 5. Current website weaknesses

From the search extracts: generic WordPress/Wix structure ("Welcome" page titles), thin product pages and no real catalog navigation. It also lacks a mobile-first WhatsApp path and kosher info presented as a feature, and it doesn't convey the label quality.

## 6. Instagram observations

Not directly inspectable here. The catalog photography (likely shared with IG) is warm, natural-light tabletop: wood, marble, linen, fresh ingredients around the pack, and hands holding pouches on saturated colour backgrounds.

## 7. Reel → design principles applied

The reel couldn't be opened. These principles come from the brief and from best-in-class food and editorial sites:
1. **One idea per screen.** Few elements, oversized type, lots of air.
2. **Product as object.** Packaging is centred, persistent and layered over type.
3. **Colour as narrative.** The background shifts with the product rather than using decorative gradients.
4. **Motion = continuity.** Elements persist between states (pinned product, flavour morph), not fly-ins.
5. **Editorial crop.** Type bleeds off-edge and frames are masked by brand shapes.

## 8. Aesthetic — "Etiqueta viva" (the living label)

The interface is built from the label system itself:
- **Cartouche** → image masks, seal badges, menu button, and the loader.
- **Didone + tracked caps** → all headings follow the label's hierarchy (category / NAME / flavour).
- **Per-SKU colour fields** → product backgrounds and section transitions.
- **Brush stroke** → the single decorative divider.
- **Back-of-label legal text** → turned into monumental typography for the brand story ("Elaborado por Fresh Lovers S.A. …").
- Packaging is **rendered in code (SVG)** with each label's colours and type. That keeps products crisp at any size and needs no fake stock imagery. Every product has an `image` slot for real photography.
- Paper/cream base (#F4EFE6), ink black, and SKU colours used one at a time.

## 9. Site architecture

- `/` — Hero → El Estante (category shelf) → Griego (pinned flavour sequence) → Labne / Café features → Historia (label-text story) → Kosher → Dónde comprar → Contacto
- `/productos` — full catalog: category filter, search, packaging grid
- `/productos/[slug]` — product family pages with variants, sizes, ingredients (when on label), seals, and related products
- `sitemap.xml`, `robots.txt`, OG image, JSON-LD (Organization, Product/ItemList, FAQPage)

## 10. Animation philosophy

- Motion only where it carries meaning: **flavour morph** (pinned product changes label colour), **category colour transition**, **text reveal** for the story, **cursor parallax** on the hero packs (desktop only), and a short **cartouche intro** (<1.2 s).
- Lenis smooth scroll, disabled under `prefers-reduced-motion`. All reveals degrade to static.
- Transform/opacity only; no layout thrash.

## 11. Mobile strategy

- Designed portrait-first for Instagram traffic: hero packs stacked, type at 18–22 vw.
- **Persistent bottom bar** (Productos · WhatsApp) in the thumb zone.
- Native horizontal swipe with scroll-snap for the shelf. No scroll hijacking.
- Full-screen menu with large tap targets. The Griego sequence collapses to a swipeable flavour picker.

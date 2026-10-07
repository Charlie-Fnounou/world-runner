# Fresh Lovers Panamá — sitio web

Sitio oficial de Fresh Lovers (Next.js 16 · React 19 · Tailwind 4 · Motion · Lenis).
Proyecto independiente dentro de este repo: no comparte código ni dependencias con `world-runner`.

## Correr localmente

```bash
cd fresh-lovers
npm install
npm run dev        # http://localhost:3100
# producción
npm run build && npm start   # http://localhost:3100
```

## Estructura

```
src/
  app/
    page.tsx                 Home (hero → estante → griego → labne/arepas/café → historia → kosher → dónde comprar → contacto)
    productos/page.tsx       Catálogo con filtro por categoría (?c=) y búsqueda
    productos/[slug]/        Ficha de producto (SSG, 36 páginas), selector de sabor (?v=)
    sitemap.ts robots.ts manifest.ts opengraph-image.tsx icon.svg not-found.tsx
  components/
    Pack.tsx                 Empaques dibujados en SVG a partir del sistema de etiquetas real
    Logo.tsx                 Logotipo + cartucho (cartouche) de la marca
    home/*                   Secciones de la home
    catalog/*                Catálogo y ficha
  data/
    catalog.ts               ÚNICA fuente de productos (con fuentes por producto)
    site.ts                  Datos verificados de contacto, tiendas, kashrut
    faqs.ts
docs/fresh-lovers-design-direction.md   Investigación y dirección de diseño
```

## Editar productos

Todo sale de `src/data/catalog.ts`. Las fotos viven en `public/products/` (recortes del
catálogo 2026) y `public/studio/` (fotos de estudio), y se registran en `src/data/photos.ts`.
Cada producto usa su foto de estudio en `image`; cada sabor puede tener su propia foto en
`variants[].photo`.

## Antes de publicar

- Confirmar que **6864-4453** (teléfono de las etiquetas) es el WhatsApp comercial.
- Cambiar el logo trazado del catálogo (`src/lib/logo.ts`) por el vector oficial si existe.
- Confirmar qué SKUs de Yogurt Griego ya están en anaqueles (vienen de etiquetas 2026, no del catálogo).

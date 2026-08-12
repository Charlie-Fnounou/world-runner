# Agente de recolectores (borrador semanal)

Cada semana, un workflow de GitHub Actions (`.github/workflows/agente-recolectores.yml`)
corre `procesar.mjs` sin que nadie tenga que tener la computadora prendida.
Este agente **nunca publica nada directo a la web**: solo escribe un archivo
de collector nuevo (marcado como borrador, sin probar) y abre un Pull
Request para que alguien lo revise antes de mergear.

## Cómo funciona

1. Toma el primer país de `candidatos.json` (la "cola").
2. Descarga el HTML real de esa fuente.
3. Le pasa ese HTML + un collector existente como ejemplo de estilo a
   Gemini (gratis, mismo modelo que ya usa el asistente de IA del sitio),
   pidiéndole que escriba un collector nuevo siguiendo la misma
   convención.
4. Si Gemini decide que la fuente no es viable (HTML insuficiente, todo
   cargado por JavaScript, etc.), descarta el candidato sin escribir nada.
5. Si escribe un collector, lo guarda en `src/lib/collectors/` con un
   comentario de advertencia arriba de todo — ese archivo no está
   conectado a nada (`route.ts`/`robots.ts` no lo importan), así que no
   hace nada hasta que alguien lo revise y lo active a mano.
6. Saca ese país de la cola.
7. GitHub Actions abre un Pull Request con lo que haya cambiado.

## Cómo sumar más países a la cola

Agregar un objeto más a `candidatos.json`:

```json
{
  "pais": "Nombre del país",
  "codigoPais": "XX",
  "url": "https://sitio-real-de-carreras.com/calendario",
  "notas": "Cualquier cosa útil que ya sepas de este sitio: si bloquea bots, qué formato de fecha usa, etc."
}
```

Importante: la URL tiene que ser una fuente **real y ya verificada** (no
inventada) — el agente no tiene forma de buscar en internet por su
cuenta, solo de escribir código a partir del HTML real que le pasás acá.

## Cómo revisar un Pull Request que abrió el agente

1. Mirá el diff: va a ser un solo archivo nuevo en `src/lib/collectors/`.
2. Descargá esa rama y probá el collector a mano:
   ```bash
   npx tsx -e "import { correrCollectorXxx } from './src/lib/collectors/archivo.ts'; correrCollectorXxx().then(r => console.log(JSON.stringify(r)))"
   ```
3. Si trae carreras reales sin errores raros: agregalo a la lista
   `COLLECTORES` en `src/app/api/cron/collectors/route.ts` y
   `src/app/actions/robots.ts`, y mergeá el PR.
4. Si no sirve: cerrá el PR sin mergear (o pedile a Claude que lo
   arregle a mano).

## Correrlo manualmente (sin esperar al lunes)

Desde la pestaña "Actions" del repo en GitHub → "Agente de recolectores"
→ "Run workflow".

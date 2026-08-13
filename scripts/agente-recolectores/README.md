# Agente de recolectores (borrador semanal)

Cada semana, un workflow de GitHub Actions (`.github/workflows/agente-recolectores.yml`)
corre `procesar.mjs` sin que nadie tenga que tener la computadora prendida.
Este agente **nunca publica nada directo a la web**: solo escribe un archivo
de collector nuevo (marcado como borrador, sin probar) y abre un Pull
Request para que alguien lo revise antes de mergear.

## Cómo funciona

1. Si `candidatos.json` (la "cola") tiene algo cargado, toma el primero.
   **Si está vacía, el agente busca un país nuevo por su cuenta**: le pide
   a Gemini que busque de verdad en internet (grounding con Google
   Search, no que invente de memoria) un país que todavía no esté
   cubierto — cruzando la lista de países ya cubiertos (leída de
   `route.ts`) y la de intentos previos que no funcionaron
   (`descartados.json`, para no repetir el mismo error dos veces). Tiene
   prohibido sugerir revendedores globales de inscripciones (Ahotu,
   Finishers, running.life, etc. — ver `BLACKLIST` en `procesar.mjs`).
2. Descarga el HTML real de esa fuente, identificándose honestamente
   como `WorldRunnerBot/1.0` (nunca un User-Agent de navegador
   spoofeado — ver el comentario ético en
   `src/lib/collectors/marrakechmarathon.ts`). Si la fuente no es
   accesible así, se descarta y queda anotada en `descartados.json`.
3. Le pasa ese HTML + un collector existente como ejemplo de estilo a
   Gemini, pidiéndole que escriba un collector nuevo siguiendo la misma
   convención.
4. Si Gemini decide que la fuente no es viable (HTML insuficiente, todo
   cargado por JavaScript, etc.), descarta el candidato sin escribir
   nada y lo anota en `descartados.json`.
5. Si escribe un collector, lo guarda en `src/lib/collectors/` con un
   comentario de advertencia arriba de todo — ese archivo no está
   conectado a nada (`route.ts`/`robots.ts` no lo importan), así que no
   hace nada hasta que alguien lo revise y lo active a mano.
6. GitHub Actions abre un Pull Request con lo que haya cambiado.

## Cómo sumar países a la cola a mano (opcional)

Normalmente no hace falta — el agente busca solo cuando la cola está
vacía. Pero si ya tenés una fuente real verificada y querés saltar el
paso de búsqueda, se puede agregar un objeto a `candidatos.json`:

```json
{
  "pais": "Nombre del país",
  "codigoPais": "XX",
  "url": "https://sitio-real-de-carreras.com/calendario",
  "notas": "Cualquier cosa útil que ya sepas de este sitio: si bloquea bots, qué formato de fecha usa, etc."
}
```

Importante: la URL tiene que ser una fuente **real y ya verificada** (no
inventada).

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

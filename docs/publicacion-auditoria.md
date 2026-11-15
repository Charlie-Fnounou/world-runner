# Publicar la rama `auditoria-produccion` (y cómo volver atrás)

Hay **dos cambios separados** y se hacen en este orden, nunca al revés:

1. **Código** (merge a `main` → Vercel publica). No toca datos.
2. **Datos** (`scripts/migrar-veracidad.ts`). Corrige datos guardados. Se corre a mano, después del código, desde la computadora que tiene el `.env` de producción.

¿Por qué ese orden? El código viejo **no entiende** el estado `SIN_CONFIRMAR` ("Estado sin confirmar"): si lo encuentra en la base, se cae el listado. El código nuevo entiende los estados viejos y los nuevos. Así que primero va el código y después los datos.

> El esquema de la base no cambia (comprobado: `prisma migrate diff` entre producción y la rama da vacío). No hay que correr `prisma db push`.

---

## Fase 0 — Antes de empezar

- [ ] Revisar el PR de `auditoria-produccion` y aprobarlo.
- [ ] En Vercel → world-runner → Deployments, **anotar el deploy de producción actual** (es al que se vuelve si algo sale mal).
- [ ] Respaldo completo de la base (el plan gratis de Supabase no tiene backups). Con las herramientas de PostgreSQL instaladas:
      `pg_dump "$DIRECT_URL" > respaldo-antes-auditoria.sql` — guardarlo fuera del repo.
- [ ] Elegir un horario lejos del robot diario (06:00 UTC = 01:00 en Panamá). Por ejemplo entre 14:00 y 22:00 UTC.

## Fase 1 — Código

1. Unir el PR a `main`. Vercel publica solo (2–4 minutos).
2. Comprobar en https://theworldrunner.com :
   - [ ] Portada, `/calendario`, `/rankings`, una ficha de carrera y `/radar` cargan.
   - [ ] https://theworldrunner.com/api/salud responde `ok`.
   - [ ] `/admin/robots` muestra "Fuentes pausadas (4)".
   - [ ] La consola del navegador no muestra el error #418 (estaba en producción; lo corrige esta rama).
3. Hasta que se corra la Fase 2, la web sigue mostrando los estados viejos ("abierta" deducida por la fecha). Desde el **primer cron después del deploy**, el robot ya guarda `SIN_CONFIRMAR` en lo que actualiza: a partir de ahí, volver al código viejo exige el paso "preparar reversión" (ver abajo).

## Fase 2 — Datos

Todo desde la carpeta del proyecto, con el `.env` de producción.

1. **Simulación** (no escribe nada):
   `npx tsx --env-file=.env scripts/migrar-veracidad.ts`
   En el ensayo con una copia de producción (15/11/2026) dio: semilla-v1 **559** cambios, estados-v1 **9.461**, duplicados-v1 **39**. Si los números son muy distintos, parar y revisar.
2. **Aplicar**:
   `npx tsx --env-file=.env scripts/migrar-veracidad.ts --aplicar --confirmo-produccion`
   - Antes de escribir guarda el plan con el valor anterior de cada campo en `prisma/respaldos/veracidad-<paso>-<host>-<base>.json`. **No borrar esos archivos** (no van a Git; copiarlos a un lugar seguro).
   - Si se corta (internet, cierre de la terminal), volver a correr el mismo comando: retoma el plan guardado.
   - Correrlo otra vez cuando ya terminó no cambia nada ("ya completado").
3. **Confirmar inscripciones abiertas con RunSignup** (opcional, se puede repetir):
   `npx tsx --env-file=.env scripts/migrar-veracidad.ts --aplicar --confirmo-produccion --runsignup`
   Solo pasa `SIN_CONFIRMAR → ABIERTA` cuando RunSignup lo informa, con respaldo propio (`veracidad-runsignup-<fecha>-...json`). En el ensayo se probó con 1 mes (714 confirmadas); con los 18 meses por defecto no se midió cuánto tarda.
4. **Refrescar las páginas**: las páginas se regeneran una vez por día. Para verlas ya: Vercel → Deployments → el deploy actual → "Redeploy".
5. Comprobar: una carrera sin fuente oficial de estado muestra "Estado sin confirmar"; una de RunSignup confirmada muestra "Abierta"; las carreras del catálogo inicial ya no muestran valoraciones ni reseñas inventadas.

---

## Volver atrás

### A. Deshacer solo los datos (el código nuevo queda)

Con cada plan guardado, **en orden inverso**: primero los `runsignup-*` (el más reciente primero), después `duplicados-v1`, `estados-v1` y `semilla-v1`.

1. Simulación: `npx tsx --env-file=.env scripts/restaurar-veracidad.ts prisma/respaldos/<plan>.json`
2. Aplicar: `... --aplicar --confirmo-produccion`

Un campo que un robot o un admin cambió después de la migración **no se pisa** (aparece como `cambiadosDespues`); solo con `--forzar`. Al restaurar un paso, queda liberado para poder migrarlo otra vez.

### B. Volver al código anterior

1. **Siempre primero**: `npx tsx --env-file=.env scripts/preparar-reversion.ts` (simulación) y después `... --aplicar --confirmo-produccion`. Pasa `SIN_CONFIRMAR` a lo que mostraba el código viejo (próximamente / cerrada), con respaldo. Si da 0, no hace nada.
2. Vercel → Deployments → el deploy anotado en la Fase 0 → "Promote to Production".
3. Si el robot de las 06:00 UTC corre con el código viejo, no crea `SIN_CONFIRMAR`; no hace falta repetir el paso 1.

### C. Volver otra vez al código nuevo

Promover el deploy nuevo y deshacer la preparación con su respaldo:
`npx tsx --env-file=.env scripts/restaurar-veracidad.ts prisma/respaldos/reversion-<host>-<base>-<n>.json --aplicar --confirmo-produccion`

---

## Lo que se ensayó (copias locales de producción, nunca la base real)

- Migración completa, segunda y tercera corrida: la segunda y la tercera no cambian nada y no revierten las 714 inscripciones confirmadas por RunSignup.
- Corte a mitad de camino (después de 10 tandas) y reanudación: mismo resultado que sin corte, salvo 2 filas que el robot actualizó durante el corte, que se respetaron.
- Restauración: todos los campos de negocio vuelven a su valor exacto (0 diferencias). Solo cambia `actualizadoEn` (fecha técnica que Prisma actualiza sola en cada escritura).
- Código viejo + base después de `preparar-reversion`: funciona. Código viejo + base con `SIN_CONFIRMAR`: falla (por eso el paso B.1).

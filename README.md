# The World Runner

Directorio mundial de carreras de running (theworldrunner.com). Next.js 16 (App Router) + TypeScript + Tailwind, PostgreSQL en Supabase con Prisma 6, alojado en Vercel.

Antes de tocar código de Next.js, leer `AGENTS.md`: esta versión tiene cambios respecto de lo habitual y la documentación correcta está en `node_modules/next/dist/docs/`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor local en http://localhost:3000 (usa la base real de `.env`). |
| `npm test` | Pruebas automáticas (Node test runner, sin base de datos). |
| `npm run typecheck` | Chequeo de tipos. |
| `npm run lint` | ESLint. |
| `npm run build` | Build de producción. Consulta la base (lectura) para pre-generar páginas. |
| `npx prisma db push` | Aplica cambios de `prisma/schema.prisma` a la base. **No usar** `prisma migrate dev/reset`: Supabase trae extensiones que Prisma toma como "drift" y quiere resetear. **No actualizar a Prisma 7** (cambia la configuración y rompe `url/directUrl`). |

## Variables de entorno (Vercel → Settings → Environment Variables, y `.env` local)

| Variable | Obligatoria | Para qué |
| --- | --- | --- |
| `DATABASE_URL` | sí | Postgres de Supabase vía pooler (puerto 6543). |
| `DIRECT_URL` | sí | Postgres directo (puerto 5432), lo usa `prisma db push`. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sí | Login (email y Google). |
| `SUPABASE_SERVICE_ROLE_KEY` | sí | Generar links de login por email (solo servidor). |
| `RESEND_API_KEY` | sí | Envío de emails (login, alertas, resúmenes). |
| `CRON_SECRET` | sí | Protege `/api/cron/collectors` (Vercel Cron lo manda solo). |
| `GEMINI_API_KEY` | no | Asistente con IA, traducciones y agente que completa datos. Sin ella esas funciones se apagan solas. |
| `RUNSIGNUP_CLIENT_ID`, `RUNSIGNUP_CLIENT_SECRET` | no | Conexión OAuth con RunSignup (panel de robots). |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | no | Planes de pago. Sin ellas `/planes` muestra "Muy pronto". |
| `PAYPAL_ENV` | no | `live` para cobrar de verdad; cualquier otro valor = sandbox (pruebas). |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | no | Publicidad de Google AdSense (no se muestra a usuarios Pro). |

Nunca pegar valores de estas variables en comandos de terminal ni en commits.

## Cómo se actualizan las carreras

- `vercel.json` dispara `/api/cron/collectors` **una vez por día** (06:00 UTC; el plan gratis de Vercel no permite más). Ahí corren las fuentes "diarias" y, rotando, 1/7 de las "semanales"; después la limpieza de datos (`sanidad.ts`, incluye marcar duplicados), traducciones, resúmenes por email, enriquecimiento de RunSignup y, los lunes, el agente de IA que completa datos faltantes (`rellenoDatos.ts`).
- Un candado en la base (`cronLock.ts`) evita dos corridas a la vez.
- Cada fuente queda registrada en la tabla `EjecucionRobot` y se ve en `/admin/robots`. Una corrida que no trae nada queda como PARCIAL (casi siempre significa que el sitio de la fuente cambió).
- `/api/salud` responde 200 si la base contesta y el cron corrió en las últimas 30 horas, 503 si no. Sirve para un monitor de uptime gratuito.

### Reglas de veracidad (no romperlas)

- El estado de inscripción solo se afirma si la fuente lo informa (`estado` en `CarreraExterna`). Si no, queda `SIN_CONFIRMAR` ("Estado sin confirmar"). Una fecha pasada se muestra como cerrada.
- Nunca se inventan precio, cupo, desnivel, clima, dificultad ni valoraciones: sin dato se guarda `null` y la web muestra "—".
- Los rankings solo usan carreras con el dato real y necesitan al menos 3; las valoraciones solo cuentan reseñas reales.
- Los duplicados no se borran: se marcan con `duplicadoDeId`, salen de los listados y su ficha redirige a la principal.
- Los robots se identifican como `WorldRunnerBot/1.0`. Si una fuente nos bloquea (403), no se la esquiva haciéndose pasar por un navegador.
- Fuentes pausadas: `src/lib/collectors/pausadas.ts` lista las que el cron no llama, con el motivo y la fecha en que se comprobó (hoy: runningcalendar AU/NZ/IE nos responden 403; ethiopianrun cambió su sitio y su API ya no existe). Se ven en `/admin/robots`. Para reactivar una, probarla con una sola visita y, si responde, quitarla de la lista. Sus carreras ya guardadas no se borran.
- Lo que llega de fuentes externas se valida (`collectors/validacion.ts`) y se escapa al mostrarlo (`lib/seguridad.ts`).

## Publicar (deploy) y volver atrás

Para la actualización de la auditoría (código + migración de datos) seguir [docs/publicacion-auditoria.md](docs/publicacion-auditoria.md).

1. Trabajar en una rama, correr `npm test`, `npm run typecheck`, `npm run lint` y `npm run build`.
2. Si cambió el esquema: `npx prisma db push` (solo cambios que agregan; nunca borrar columnas con datos sin respaldo).
3. Unir la rama a `main`: Vercel publica solo.
4. Si hay un script de datos pendiente (ver abajo), correrlo justo después del deploy.

**Volver atrás:** en Vercel → proyecto world-runner → Deployments → el deploy anterior → "Promote to Production" (instantáneo, no toca la base). Para el código: `git revert <commit>` y push.

**Respaldos de la base:** el plan gratis de Supabase no tiene backups automáticos con restauración a un punto en el tiempo. Los scripts que modifican datos guardan antes un respaldo en `prisma/respaldos/`. Para un respaldo completo manual: `pg_dump "$DIRECT_URL" > respaldo.sql` (necesita las herramientas de PostgreSQL instaladas).

## Scripts de datos

- `scripts/migrar-veracidad.ts`: corrige datos ya guardados (estados deducidos → sin confirmar, datos inventados del catálogo inicial, duplicados). Sin argumentos solo muestra qué cambiaría; `--aplicar` respalda y aplica; `--runsignup` además confirma con RunSignup qué inscripciones están abiertas. Es idempotente. Se deshace con `scripts/restaurar-veracidad.ts`.
- `scripts/preparar-reversion.ts`: antes de volver a un deploy anterior a la auditoría (el código viejo no entiende `SIN_CONFIRMAR`).

## Pagos

PayPal (Stripe no acepta comercios de Panamá). Con las variables cargadas, la primera visita a `/planes` crea producto, planes y webhook en la cuenta de PayPal; `/admin/pagos` muestra el estado y permite recrearlos (necesario si cambian los precios de `src/lib/precios.ts`). Toda confirmación de pago se verifica contra la API de PayPal y el webhook (`/api/paypal/webhook`) valida la firma.

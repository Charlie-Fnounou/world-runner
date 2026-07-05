-- Este SQL se ejecuta UNA VEZ, después de la primera sincronización del
-- esquema de Prisma (`npx prisma db push` o `migrate dev`). Activa la
-- búsqueda difusa sin tildes y tolerante a errores de escritura.

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- unaccent() es "STABLE" en Postgres, no "IMMUTABLE", así que no se puede
-- usar directo en un índice. Se envuelve en una función marcada IMMUTABLE
-- (es seguro: unaccent con el diccionario por defecto no cambia con el tiempo).
create or replace function immutable_unaccent(text)
returns text as $$
  select public.unaccent($1)
$$ language sql immutable parallel safe strict
   set search_path = public;

-- Índices GIN para búsqueda difusa rápida sin tildes y tolerante a errores.
create index if not exists evento_nombre_trgm_idx
  on "Evento" using gin (immutable_unaccent(nombre) gin_trgm_ops);

create index if not exists evento_ciudad_trgm_idx
  on "Evento" using gin (immutable_unaccent(ciudad) gin_trgm_ops);

create index if not exists evento_pais_trgm_idx
  on "Evento" using gin (immutable_unaccent(pais) gin_trgm_ops);

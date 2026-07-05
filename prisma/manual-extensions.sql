-- Este SQL se ejecuta UNA VEZ, a mano, en el editor SQL de Supabase,
-- después de la primera migración de Prisma (`npx prisma migrate dev`).
-- Prisma crea las tablas; este script activa la búsqueda difusa.

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- Índices GIN para búsqueda difusa rápida sin tildes y tolerante a errores.
create index if not exists evento_nombre_trgm_idx
  on "Evento" using gin (unaccent(nombre) gin_trgm_ops);

create index if not exists evento_ciudad_trgm_idx
  on "Evento" using gin (unaccent(ciudad) gin_trgm_ops);

create index if not exists evento_pais_trgm_idx
  on "Evento" using gin (unaccent(pais) gin_trgm_ops);

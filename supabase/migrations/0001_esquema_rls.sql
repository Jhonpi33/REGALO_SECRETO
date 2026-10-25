-- =============================================================
-- Regalo Secreto — Esquema + Row Level Security (privacidad)
-- Fecha de revelación: 2026-11-20 00:00:00 (America/Bogota, UTC-5)
-- Ejecutar con:  supabase db push   (o pegarlo en el SQL Editor)
-- =============================================================

-- ---------- Utilidades ----------
create extension if not exists pgcrypto;

-- ---------- 1) Perfiles ----------
create table if not exists public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null check (char_length(nombre) between 1 and 60),
  tema       text not null default 'rosa' check (tema in ('rosa', 'azul')),
  pareja_id  uuid references public.perfiles (id),
  creada_en  timestamptz not null default now(),
  constraint pareja_distinta check (pareja_id is null or pareja_id <> id)
);

create index if not exists perfiles_pareja_idx on public.perfiles (pareja_id);

-- ---------- 2) Pistas ----------
create table if not exists public.pistas (
  id         uuid primary key default gen_random_uuid(),
  autor_id   uuid not null references public.perfiles (id) on delete cascade,
  texto      text not null check (char_length(texto) between 1 and 400),
  categoria  text check (categoria is null or char_length(categoria) <= 60),
  nivel      text not null default 'tibia' check (nivel in ('fria', 'tibia', 'caliente')),
  creada_en  timestamptz not null default now()
);

create index if not exists pistas_autor_idx on public.pistas (autor_id, creada_en desc);

-- ---------- 3) Corazonadas (privadas) ----------
create table if not exists public.corazonadas (
  id              uuid primary key default gen_random_uuid(),
  autor_id        uuid not null unique references public.perfiles (id) on delete cascade,
  teoria          text check (teoria is null or char_length(teoria) <= 1200),
  regalo_elegido  text check (regalo_elegido is null or char_length(regalo_elegido) <= 300),
  enlace          text,
  presupuesto_cop numeric check (presupuesto_cop is null or presupuesto_cop >= 0),
  estado          text not null default 'pensando' check (estado in ('pensando', 'comprado', 'envuelto')),
  actualizada_en  timestamptz not null default now()
);

create index if not exists corazonadas_autor_idx on public.corazonadas (autor_id);

-- ---------- 4) Historial de consultas a la IA ----------
create table if not exists public.consultas_ia (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references public.perfiles (id) on delete cascade,
  pregunta        text,
  presupuesto_cop numeric,
  respuesta_json  jsonb,
  creada_en       timestamptz not null default now()
);

create index if not exists consultas_ia_usuario_idx on public.consultas_ia (usuario_id, creada_en desc);

-- ---------- 5) Suscripciones push (una fila por dispositivo) ----------
create table if not exists public.push_suscripciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  endpoint    text not null unique,
  claves      jsonb not null,
  agente      text,
  creada_en   timestamptz not null default now()
);

create index if not exists push_usuario_idx on public.push_suscripciones (usuario_id);

-- =============================================================
--  Funciones auxiliares (security definer: evitan bucles de RLS)
-- =============================================================

-- ¿Pasó la fecha de revelación? (20/11/2026 00:00 hora Bogotá)
create or replace function public.es_revelado()
returns boolean
language sql
stable
as $$
  select now() >= timestamptz '2026-11-20 00:00:00-05';
$$;

-- Id de la pareja del usuario que está conectado.
create or replace function public.mi_pareja_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pareja_id from public.perfiles where id = auth.uid();
$$;

revoke all on function public.mi_pareja_id() from public;
grant execute on function public.es_revelado() to authenticated, anon;
grant execute on function public.mi_pareja_id() to authenticated;

-- =============================================================
--  RLS
-- =============================================================
alter table public.perfiles           enable row level security;
alter table public.pistas             enable row level security;
alter table public.corazonadas        enable row level security;
alter table public.consultas_ia       enable row level security;
alter table public.push_suscripciones enable row level security;

-- ---------- perfiles ----------
drop policy if exists perfiles_leer on public.perfiles;
create policy perfiles_leer on public.perfiles
  for select
  to authenticated
  using (
    id = auth.uid()                       -- mi propio perfil
    or pareja_id = auth.uid()             -- el perfil de mi pareja
    or public.es_revelado()               -- después de la revelación, todo es público entre los dos
  );

drop policy if exists perfiles_crear on public.perfiles;
create policy perfiles_crear on public.perfiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists perfiles_editar on public.perfiles;
create policy perfiles_editar on public.perfiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists perfiles_borrar on public.perfiles;
create policy perfiles_borrar on public.perfiles
  for delete
  to authenticated
  using (id = auth.uid());

-- ---------- pistas ----------
-- Leo las mías y las de mi pareja (para poder adivinar).
drop policy if exists pistas_leer on public.pistas;
create policy pistas_leer on public.pistas
  for select
  to authenticated
  using (
    autor_id = auth.uid()
    or autor_id = public.mi_pareja_id()
    or public.es_revelado()
  );

-- Solo puedo escribir pistas mías.
drop policy if exists pistas_crear on public.pistas;
create policy pistas_crear on public.pistas
  for insert
  to authenticated
  with check (autor_id = auth.uid());

-- Editar mis pistas hasta el día de la revelación (nunca las de mi pareja).
drop policy if exists pistas_editar on public.pistas;
create policy pistas_editar on public.pistas
  for update
  to authenticated
  using (autor_id = auth.uid() and not public.es_revelado())
  with check (autor_id = auth.uid());

-- Borrar mis pistas hasta el día de la revelación.
drop policy if exists pistas_borrar on public.pistas;
create policy pistas_borrar on public.pistas
  for delete
  to authenticated
  using (autor_id = auth.uid() and not public.es_revelado());

-- ---------- corazonadas ----------
-- 1) Siempre veo las mías.
drop policy if exists corazonadas_mias on public.corazonadas;
create policy corazonadas_mias on public.corazonadas
  for select
  to authenticated
  using (autor_id = auth.uid());

-- 2) Las de mi pareja SOLO después del 20/11/2026 00:00 (Bogotá).
drop policy if exists corazonadas_pareja_reveladas on public.corazonadas;
create policy corazonadas_pareja_reveladas on public.corazonadas
  for select
  to authenticated
  using (autor_id = public.mi_pareja_id() and public.es_revelado());

-- 3) Solo yo escribo la mía.
drop policy if exists corazonadas_crear on public.corazonadas;
create policy corazonadas_crear on public.corazonadas
  for insert
  to authenticated
  with check (autor_id = auth.uid());

-- 4) Solo yo la modifico / borro.
drop policy if exists corazonadas_editar on public.corazonadas;
create policy corazonadas_editar on public.corazonadas
  for update
  to authenticated
  using (autor_id = auth.uid())
  with check (autor_id = auth.uid());

drop policy if exists corazonadas_borrar on public.corazonadas;
create policy corazonadas_borrar on public.corazonadas
  for delete
  to authenticated
  using (autor_id = auth.uid());

-- ---------- consultas_ia ----------
drop policy if exists consultas_mias on public.consultas_ia;
create policy consultas_mias on public.consultas_ia
  for select
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists consultas_crear on public.consultas_ia;
create policy consultas_crear on public.consultas_ia
  for insert
  to authenticated
  with check (usuario_id = auth.uid());

-- ---------- push_suscripciones ----------
drop policy if exists push_mias on public.push_suscripciones;
create policy push_mias on public.push_suscripciones
  for select
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists push_crear on public.push_suscripciones;
create policy push_crear on public.push_suscripciones
  for insert
  to authenticated
  with check (usuario_id = auth.uid());

drop policy if exists push_actualizar on public.push_suscripciones;
create policy push_actualizar on public.push_suscripciones
  for update
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists push_borrar on public.push_suscripciones;
create policy push_borrar on public.push_suscripciones
  for delete
  to authenticated
  using (usuario_id = auth.uid());

-- =============================================================
--  Actualizar  actualizada_en  automáticamente
-- =============================================================
create or replace function public.marcar_actualizada()
returns trigger
language plpgsql
as $$
begin
  new.actualizada_en := now();
  return new;
end;
$$;

drop trigger if exists corazonadas_actualizada on public.corazonadas;
create trigger corazonadas_actualizada
  before update on public.corazonadas
  for each row execute function public.marcar_actualizada();

-- =============================================================
--  Aviso cuando llega una pista nueva (opcional, para banners)
-- =============================================================
alter publication supabase_realtime add table public.pistas;

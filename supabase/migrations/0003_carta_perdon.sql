-- =============================================================
-- Regalo Secreto — Carta de perdón (Jhon pide perdón a Majo)
--
-- Una sola fila "viva": quien envía la carta (de_id) y quien
-- debe responder (para_id). Se guarda cuántas veces apretó "No"
-- y en qué momento perdonó.
-- =============================================================

create table if not exists public.perdones (
  id            uuid primary key default gen_random_uuid(),
  de_id         uuid not null references public.perfiles (id) on delete cascade,
  para_id       uuid not null references public.perfiles (id) on delete cascade,
  mensaje       text not null
                default 'Amor, te amo mucho. Perdóname, pero te amo mucho y te extraño demasiado 💕',
  estado        text not null default 'pendiente'
                check (estado in ('pendiente', 'perdonado')),
  rechazos      integer not null default 0 check (rechazos >= 0),
  creada_en     timestamptz not null default now(),
  respondida_en timestamptz,
  constraint perdones_personas_distintas check (de_id <> para_id)
);

create index if not exists perdones_estado_idx on public.perdones (estado, creada_en desc);

alter table public.perdones enable row level security;

-- Ambos miembros de la pareja pueden VER la carta (cada uno su estado).
drop policy if exists perdones_ver on public.perdones;
create policy perdones_ver on public.perdones
  for select to authenticated
  using (de_id = auth.uid() or para_id = auth.uid());

-- Solo quien la envía puede crearla (debe ser él mismo).
drop policy if exists perdones_crear on public.perdones;
create policy perdones_crear on public.perdones
  for insert to authenticated
  with check (de_id = auth.uid());

-- Solo quien recibe la carta puede responderla (perdón / rechazos).
drop policy if exists perdones_responder on public.perdones;
create policy perdones_responder on public.perdones
  for update to authenticated
  using (para_id = auth.uid())
  with check (para_id = auth.uid());

-- Solo quien la envió puede descartarla (para poder reenviar una nueva).
drop policy if exists perdones_borrar on public.perdones;
create policy perdones_borrar on public.perdones
  for delete to authenticated
  using (de_id = auth.uid());

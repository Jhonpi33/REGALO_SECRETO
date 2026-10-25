-- =============================================================
-- Regalo Secreto — Notificaciones programadas con pg_cron
--
-- pg_cron trabaja en UTC. Bogotá es UTC-5, así que:
--   7:00 p. m. Bogotá  =  00:00 UTC (día siguiente)
--   9:00 a. m. Bogotá  =  14:00 UTC
--   8:00 a. m. Bogotá  =  13:00 UTC
-- =============================================================

-- Habilita pg_cron y la extensión de peticiones HTTP (ya vienen en Supabase)
create extension if not exists pg_cron;
create extension if not exists http with schema extensions;

-- -------------------------------------------------------------
-- Tabla privada de configuración.
-- Sin políticas de RLS => ni anon ni authenticated pueden leerla.
-- Solo el rol postgres / service_role la ve.
-- -------------------------------------------------------------
create schema if not exists private;

create table if not exists private.ajustes (
  clave text primary key,
  valor text not null
);

alter table private.ajustes enable row level security;

-- -------------------------------------------------------------
-- Función que llama a una Edge Function de este proyecto.
-- Se configura llenando private.ajustes (ver SETUP.md, paso 9).
-- -------------------------------------------------------------
create or replace function public.llamar_funcion(p_nombre text, p_payload jsonb)
returns integer
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_url text;
  v_key text;
  v_resp record;
begin
  select valor into v_url from private.ajustes where clave = 'supabase_url';
  select valor into v_key from private.ajustes where clave = 'anon_key';

  if v_url is null or v_key is null then
    raise exception 'Falta configurar private.ajustes (claves: supabase_url y anon_key). Mira el SETUP.md.';
  end if;

  select * into v_resp
  from extensions.net.http_post(
    url     := rtrim(v_url, '/') || '/functions/v1/' || p_nombre,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_key
               ),
    body    := p_payload,
    timeout_milliseconds := 30000
  );

  return v_resp.status_code;
end;
$$;

-- Nadie desde la app puede ejecutarla (solo los cron jobs).
revoke execute on function public.llamar_funcion(text, jsonb) from public, anon, authenticated;
grant  execute on function public.llamar_funcion(text, jsonb) to service_role, postgres;

-- -------------------------------------------------------------
-- Programación de los avisos (todos en hora de Bogotá)
-- -------------------------------------------------------------

-- 1) Recordatorio diario a las 7:00 p. m. (00:00 UTC del día siguiente)
select cron.unschedule('regalo-recordatorio-diario');
select cron.schedule(
  'regalo-recordatorio-diario',
  '0 0 * * *',
  $$select public.llamar_funcion('notificar', jsonb_build_object('tipo', 'recordatorio-diario'));$$
);

-- 2) Una semana antes: viernes 13 de noviembre de 2026, 9:00 a. m. (14:00 UTC)
select cron.unschedule('regalo-una-semana');
select cron.schedule(
  'regalo-una-semana',
  '0 14 13 11 *',
  $$select public.llamar_funcion('notificar', jsonb_build_object('tipo', 'una-semana'));$$
);

-- 3) Víspera: 19 de noviembre de 2026, 9:00 a. m. (14:00 UTC)
select cron.unschedule('regalo-vispera');
select cron.schedule(
  'regalo-vispera',
  '0 14 19 11 *',
  $$select public.llamar_funcion('notificar', jsonb_build_object('tipo', 'vispera'));$$
);

-- 4) Día de la revelación: 20 de noviembre de 2026, 8:00 a. m. (13:00 UTC)
select cron.unschedule('regalo-dia-grande');
select cron.schedule(
  'regalo-dia-grande',
  '0 13 20 11 *',
  $$select public.llamar_funcion('notificar', jsonb_build_object('tipo', 'dia-grande'));$$
);

-- -------------------------------------------------------------
-- Ver los jobs programados:
--   select jobid, schedule, command from cron.job;
-- Quitar uno:
--   select cron.unschedule('regalo-recordatorio-diario');
-- Después del 20/11/2026 puedes desprogramarlos todos con:
--   select cron.unschedule(jobid) from cron.job where command like '%regalo%';
-- -------------------------------------------------------------

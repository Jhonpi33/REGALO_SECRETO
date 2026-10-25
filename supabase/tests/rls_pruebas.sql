-- =============================================================
-- PRUEBAS DE PRIVACIDAD (RLS) — "Regalo Secreto"
--
-- Cómo ejecutarlas:
--   1. Reemplaza  <ID_JHON>  y  <ID_MAJO>  con los UUID reales
--      (Authentication → Users → user uid).
--   2. Pega TODO el archivo en el SQL Editor de Supabase y ejecútalo.
--   3. Debe terminar con el mensaje final:
--        ✅ TODAS LAS PRUEBAS DE RLS PASARON
--      Si algo falla, verás un error que empieza con  ❌ FALLA:
--
-- Corre dentro de una transacción y hace ROLLBACK: no deja datos.
-- =============================================================

do $$
declare
  jhon  uuid := '<ID_JHON>';
  majo  uuid := '<ID_MAJO>';
  n     int;
  tiene boolean;
begin
  ---------------------------------------------------------------
  -- Simulamos que entra Majo (rol authenticated, sin service_role)
  ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', majo, 'role', 'authenticated', 'email', 'majo@example.com')::text,
    false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  perform set_config('role', 'authenticated', false);

  ---------------------------------------------------------------
  -- 1) Ve exactamente 2 perfiles: el suyo y el de su pareja
  ---------------------------------------------------------------
  select count(*) into n from public.perfiles;
  if n <> 2 then
    raise exception '❌ FALLA: Majo debería ver 2 perfiles (la pareja), vio %', n;
  end if;
  raise notice '✅ 1) Majo ve solo los 2 perfiles de la pareja';

  ---------------------------------------------------------------
  -- 2) NO ve las corazonadas de Jhon antes de la revelación
  ---------------------------------------------------------------
  select count(*) into n from public.corazonadas where autor_id = jhon;
  if not public.es_revelado() then
    if n <> 0 then
      raise exception '❌ FALLA: Majo vio % corazonadas de Jhon antes del 20/11/2026', n;
    end if;
    raise notice '✅ 2) Las corazonadas de Jhon están ocultas para Majo';
  else
    raise notice '⚠️ 2) La revelación ya pasó: Majo ahora ve % corazonadas de Jhon (esperado)', n;
  end if;

  ---------------------------------------------------------------
  -- 3) Sí ve las suyas propias
  ---------------------------------------------------------------
  insert into public.corazonadas (autor_id, teoria, regalo_elegido, estado)
  values (majo, 'PRUEBA RLS: esto es solo mío', 'Un regalo de prueba', 'pensando')
  on conflict (autor_id) do nothing;

  select count(*) into n from public.corazonadas where autor_id = majo;
  if n <> 1 then
    raise exception '❌ FALLA: Majo no pudo leer su propia corazonada (ve %)', n;
  end if;
  raise notice '✅ 3) Majo lee su propia corazonada';

  ---------------------------------------------------------------
  -- 4) NO puede editar la corazonada de Jhon (ni siquiera existe para ella)
  ---------------------------------------------------------------
  update public.corazonadas
     set teoria = 'INTENTO DE EDICIÓN AJENA'
   where autor_id = jhon;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception '❌ FALLA: Majo actualizó % filas de corazonadas de Jhon', n;
  end if;
  raise notice '✅ 4) Majo no puede editar la corazonada de Jhon';

  ---------------------------------------------------------------
  -- 5) Ve las pistas de Jhon (para poder adivinar)…
  ---------------------------------------------------------------
  select count(*) into n from public.pistas where autor_id = jhon;
  raise notice 'ℹ️ 5) Majo ve % pistas de Jhon (debe ser > 0 si hay semilla)', n;

  ---------------------------------------------------------------
  -- 6) …pero NO puede editarlas ni borrarlas
  ---------------------------------------------------------------
  update public.pistas
     set texto = 'INTENTO DE EDICIÓN AJENA'
   where autor_id = jhon;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception '❌ FALLA: Majo actualizó % pistas de Jhon', n;
  end if;

  delete from public.pistas where autor_id = jhon;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception '❌ FALLA: Majo borró % pistas de Jhon', n;
  end if;
  raise notice '✅ 6) Majo no puede editar ni borrar las pistas de Jhon';

  ---------------------------------------------------------------
  -- 7) No puede escribir una pista haciéndose pasar por Jhon
  ---------------------------------------------------------------
  begin
    insert into public.pistas (autor_id, texto) values (jhon, 'PISTA FALSA');
    raise exception '❌ FALLA: Majo insertó una pista con el autor de Jhon';
  exception when others then
    if sqlerrm like '❌ FALLA%' then raise; end if;
    raise notice '✅ 7) No se puede suplantar el autor de una pista';
  end;

  ---------------------------------------------------------------
  -- 8) Sí puede crear sus propias pistas
  ---------------------------------------------------------------
  insert into public.pistas (autor_id, texto, categoria, nivel)
  values (majo, 'PISTA DE PRUEBA RLS (se borra sola)', 'Otra', 'tibia');
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception '❌ FALLA: Majo no pudo crear su propia pista';
  end if;
  raise notice '✅ 8) Majo crea sus propias pistas';

  ---------------------------------------------------------------
  -- 9) El historial de IA es privado para quien consulta
  ---------------------------------------------------------------
  insert into public.consultas_ia (usuario_id, respuesta_json)
  values (majo, '{"ideas": [], "nota": "prueba"}'::jsonb);

  select count(*) into n from public.consultas_ia where usuario_id = jhon;
  if n <> 0 then
    raise exception '❌ FALLA: Majo vio % consultas de IA de Jhon', n;
  end if;
  raise notice '✅ 9) Las consultas de IA de Jhon son invisibles para Majo';

  ---------------------------------------------------------------
  -- 10) Las suscripciones push de Jhon no son visibles ni editables
  ---------------------------------------------------------------
  select count(*) into n from public.push_suscripciones where usuario_id <> majo;
  if n <> 0 then
    raise exception '❌ FALLA: Majo vio % suscripciones push ajenas', n;
  end if;
  raise notice '✅ 10) Las suscripciones push ajenas están protegidas';

  ---------------------------------------------------------------
  -- 11) Todavía no es la revelación
  ---------------------------------------------------------------
  if public.es_revelado() then
    raise notice '⚠️ 11) La fecha de revelación YA PASÓ: las pruebas 2, 4 y 9 cambiarán de comportamiento.';
  else
    raise notice '✅ 11) La revelación aún no ha ocurrido (es_revelado() = false)';
  end if;

  ---------------------------------------------------------------
  -- 12) La función privada NO es visible desde la app
  ---------------------------------------------------------------
  select has_function_privilege('authenticated', 'public.llamar_funcion(text,jsonb)', 'execute')
    into tiene;
  if tiene then
    raise exception '❌ FALLA: el rol authenticated SÍ puede ejecutar llamar_funcion()';
  end if;
  raise notice '✅ 12) Las funciones privadas no son accesibles desde la app';

  raise notice '';
  raise notice '🎉 TODAS LAS PRUEBAS DE RLS PASARON';
end $$;

-- Limpieza (por si el ROLLBACK no se ejecuta)
rollback;

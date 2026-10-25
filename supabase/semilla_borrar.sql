-- =============================================================
-- Borra TODOS los datos de prueba creados por  supabase/semilla.sql
-- Es seguro: solo borra las pistas y corazonadas exactas de la semilla.
-- =============================================================

delete from public.pistas
where texto in (
  'Es algo que uso casi todos los días por la mañana.',
  'Viene en color azul o negro.',
  'Tiene que ver con mi hobby de los fines de semana.',
  'Se consigue fácil en tiendas de Bogotá.',
  'Huele delicioso y va en el escritorio.',
  'Me encanta para mis tardes de lectura.',
  'Es de un color que combina con todo mi cuarto.',
  'Me gustaría algo para guardar recuerdos.',
  'Se puede pedir online y llega en una semana.'
);

delete from public.corazonadas
where teoria in (
  'Creo que quiere algo para sus tardes de té y lectura.',
  'Creo que le haría falta algo para su escritorio.'
);

delete from public.consultas_ia
where respuesta_json ->> 'nota' like 'Datos de prueba de la semilla%';

-- Si quieres borrar TODO de una vez (incluidas las pistas reales):
--   truncate table public.pistas, public.corazonadas, public.consultas_ia restart identity cascade;

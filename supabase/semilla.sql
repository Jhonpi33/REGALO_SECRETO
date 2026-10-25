-- =============================================================
-- SEMILLA OPCIONAL — datos de prueba para probar la app.
--
-- ANTES DE EJECUTAR:
--   1. Reemplaza  <ID_JHON>  y  <ID_MAJO>  con los UUID de cada usuario.
--      Los encuentras en:  Authentication → Users  (columna "user uid")
--   2. Ejecútalo en el SQL Editor de Supabase.
--
-- PARA BORRAR TODO LO DE PRUEBA:
--   ejecuta  supabase/semilla_borrar.sql
-- =============================================================

-- Pistas de Jhon (tema azul)
insert into public.pistas (autor_id, texto, categoria, nivel, creada_en) values
  ('<ID_JHON>', 'Es algo que uso casi todos los días por la mañana.', 'Algo que uso', 'tibia',  now() - interval '6 days'),
  ('<ID_JHON>', 'Viene en color azul o negro.',                          'Un color',      'fria',    now() - interval '5 days'),
  ('<ID_JHON>', 'Tiene que ver con mi hobby de los fines de semana.',    'Un hobby',      'tibia',   now() - interval '3 days'),
  ('<ID_JHON>', 'Se consigue fácil en tiendas de Bogotá.',               'Otra',          'caliente', now() - interval '1 day'),
  ('<ID_JHON>', 'Huele delicioso y va en el escritorio.',                'Algo que uso',  'fria',    now());

-- Pistas de Majo (tema rosa)
insert into public.pistas (autor_id, texto, categoria, nivel, creada_en) values
  ('<ID_MAJO>', 'Me encanta para mis tardes de lectura.',                'Un hobby',        'tibia',    now() - interval '6 days'),
  ('<ID_MAJO>', 'Es de un color que combina con todo mi cuarto.',        'Un color',        'fria',    now() - interval '4 days'),
  ('<ID_MAJO>', 'Me gustaría algo para guardar recuerdos.',              'Algo que me gustaría tener', 'tibia', now() - interval '2 days'),
  ('<ID_MAJO>', 'Se puede pedir online y llega en una semana.',          'Otra',            'caliente', now() - interval '1 day');

-- Corazonadas de prueba (privadas; solo las verá la pareja después del 20/11/2026)
insert into public.corazonadas (autor_id, teoria, regalo_elegido, presupuesto_cop, estado) values
  ('<ID_JHON>', 'Creo que quiere algo para sus tardes de té y lectura.', 'Un set de té japonés + un book'que', 180000, 'comprado'),
  ('<ID_MAJO>', 'Creo que le haría falta algo para su escritorio.',     'Un reloj de mesa minimalista',      220000, 'pensando')
on conflict (autor_id) do nothing;

-- Una consulta de IA de ejemplo (para ver el historial)
insert into public.consultas_ia (usuario_id, presupuesto_cop, respuesta_json) values
  ('<ID_JHON>', 200000, '{
     "nota": "Datos de prueba de la semilla (no la generó la IA).",
     "ideas": [
       {"idea": "Set de té + libreta", "por_que": "Sus pistas hablan de tardes tranquilas.", "confianza": 72, "donde_conseguirlo": "Tienda de artesanías o feria"}
     ]
   }'::jsonb);

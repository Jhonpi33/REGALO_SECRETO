// =============================================================
// Edge Function: ia-regalo
// "¿Qué querrá mi pareja?"
//
// Recibe las pistas de la PAREJA del usuario que consulta,
// las envía a Claude (Anthropic) y devuelve 3 a 5 ideas de regalo
// en JSON. La API key de Anthropic vive SOLO aquí, como secreto.
//
// Secretos necesarios (supabase secrets set):
//   ANTHROPIC_API_KEY   -> llave de https://console.anthropic.com
//
// Variables de entorno (ya existen en el proyecto):
//   SUPABASE_URL, SUPABASE_ANON_KEY
// =============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
// Si un modelo deja de estar disponible, se prueba el siguiente de la lista.
const MODELOS = ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-haiku-20240307']
const LIMITE_CONSULTAS_DIA = 5
const MINIMO_PISTAS = 3

// Horario de Bogotá (UTC-5) para contar "consultas de hoy"
const ZONA = 'America/Bogota'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Prompt de sistema: honesto, en español y sin inventar pistas.
const PROMPT_SISTEMA = `Eres la IA amiga de "Regalo Secreto", un juego de amigo secreto entre dos personas (Jhon y Majo).
Tu tarea: a partir EXCLUSIVAMENTE de las pistas que una de ellas dejó sobre el regalo que le gustaría recibir,
proponer de 3 a 5 ideas de regalo realistas.

Reglas estrictas:
- Usa SOLO la información de las pistas recibidas. No inventes pistas ni datos que no estén ahí.
- Si hay pocas pistas o son muy vagas, dilo con honestidad en el campo "nota" (por ejemplo:
  "Aún hay muy poca información para estar seguro, pero esto es lo que se intuye").
- Responde SIEMPRE en español.
- Sé concreto y útil para Colombia: el campo "donde_conseguirlo" debe sugerir un tipo de lugar
  (tienda física, feria, mercado, tienda online colombiana, etc.), no marcas inventadas.
- Si te dan un presupuesto en COP, respétalo: todas las ideas deben caber en ese presupuesto.
- El campo "confianza" va de 0 a 100 y debe reflejar cuánto respaldan las pistas esa idea.

Formato de respuesta: SOLO un JSON válido, sin markdown ni texto antes o después:
{
  "nota": "string corto con el nivel de información disponible",
  "ideas": [
    { "idea": "string", "por_que": "string que conecta la idea con pistas concretas",
      "confianza": 0, "donde_conseguirlo": "string" }
  ]
}`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return json({ error: 'Falta la sesión de usuario.' }, 401)

    const body = await req.json().catch(() => ({}))
    const presupuesto: number | null = body.presupuesto_cop ?? null
    const pregunta: string = (body.pregunta ?? '').toString().slice(0, 240)

    // Cliente con la sesión del usuario: TODAS las consultas respetan la RLS.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
    )

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) return json({ error: 'Sesión inválida.' }, 401)
    const usuarioId = userData.user.id

    // ---------- 1) Pistas de la pareja ----------
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id, nombre, pareja_id, pareja:pareja_id(id, nombre)')
      .eq('id', usuarioId)
      .maybeSingle()

    const parejaId: string | null = perfil?.pareja_id ?? null
    if (!parejaId) return json({ aviso: 'Aún no tienes pareja vinculada en la app.' }, 400)

    const { data: pistas, error: errorPistas } = await supabase
      .from('pistas')
      .select('texto, categoria, nivel, creada_en')
      .eq('autor_id', parejaId)
      .order('creada_en', { ascending: true })

    if (errorPistas) return json({ error: 'No pude leer las pistas: ' + errorPistas.message }, 500)

    if (!pistas || pistas.length < MINIMO_PISTAS) {
      return json({
        aviso: `Aún hay muy poca información: hacen falta al menos ${MINIMO_PISTAS} pistas y hay ${
          pistas?.length ?? 0 }.`,
        ideas: []
      })
    }

    // ---------- 2) Límite de 5 consultas por día (hora Bogotá) ----------
    const desde = inicioDelDiaBogota()
    const { count } = await supabase
      .from('consultas_ia')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .gte('creada_en', desde.toISOString())

    if ((count ?? 0) >= LIMITE_CONSULTAS_DIA) {
      return json({ error: `Ya usaste tus ${LIMITE_CONSULTAS_DIA} consultas de hoy. Vuelve mañana 🌅` }, 429)
    }

    // ---------- 3) Llamada a Claude ----------
    const pistasTexto = pistas
      .map((p, i) => `${i + 1}. [${p.categoria ?? 'sin categoría'}] [nivel: ${p.nivel}] ${p.texto}`)
      .join('\n')

    const usuario = [
      `Pistas de ${perfil?.pareja?.nombre ?? 'mi pareja'} (${pistas.length} en total):`,
      '',
      pistasTexto
    ]
    if (presupuesto) usuario.push('', `Presupuesto disponible: $${presupuesto} COP`)
    if (pregunta) usuario.push('', `Comentario adicional de quien consulta: ${pregunta}`)
    usuario.push('', 'Devuelve SOLO el JSON con 3 a 5 ideas.')

    const clave = Deno.env.get('ANTHROPIC_API_KEY')
    if (!clave) {
      return json({ error: 'Falta el secreto ANTHROPIC_API_KEY en las Edge Functions.' }, 500)
    }

    let datos: Record<string, any>
    try {
      datos = await llamarClaude(clave, PROMPT_SISTEMA, usuario.join('\n'))
    } catch (e) {
      console.error('Error llamando a Claude:', e)
      return json({ error: 'La IA no respondió bien. Intenta de nuevo en un momento.' }, 502)
    }

    const texto: string = datos?.content?.[0]?.text ?? ''
    const salida = extraerJSON(texto)

    if (!salida || !Array.isArray(salida.ideas)) {
      console.error('Respuesta ilegible de la IA:', texto)
      return json({ error: 'La IA devolvió algo que no pude leer. Intenta otra vez.' }, 502)
    }

    const ideas = salida.ideas.slice(0, 5).map((i: Record<string, unknown>) => ({
      idea: String(i.idea ?? ''),
      por_que: String(i.por_que ?? ''),
      confianza: Math.max(0, Math.min(100, Number(i.confianza ?? 0))),
      donde_conseguirlo: String(i.donde_conseguirlo ?? '')
    }))

    // ---------- 4) Guardar el historial (privado para quien consulta) ----------
    const { data: guardada, error: errorGuardar } = await supabase
      .from('consultas_ia')
      .insert({
        usuario_id: usuarioId,
        pregunta: pregunta || null,
        presupuesto_cop: presupuesto,
        respuesta_json: { ideas, nota: salida.nota ?? null }
      })
      .select('id, creada_en')
      .single()

    if (errorGuardar) console.error('No se guardó la consulta:', errorGuardar.message)

    return json({
      id: guardada?.id,
      ideas,
      nota: salida.nota ?? null,
      restantes: Math.max(0, LIMITE_CONSULTAS_DIA - ((count ?? 0) + 1))
    })
  } catch (e) {
    console.error('Fallo inesperado:', e)
    return json({ error: 'Algo salió mal. Intenta de nuevo.' }, 500)
  }
})

// ---------- Helpers ----------

/** Devuelve un objeto JSON con cabeceras CORS. */
function json(datos: unknown, status = 200): Response {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  })
}

/**
 * Llama a Claude. Si un modelo ya no existe (404) prueba el siguiente
 * de la lista MODELOS, para que la app no se rompa con los cambios de Anthropic.
 */
async function llamarClaude(
  clave: string,
  system: string,
  mensaje: string
): Promise<Record<string, any>> {
  let ultimoError = ''

  for (const modelo of MODELOS) {
    const respuesta = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': clave,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 1600,
        system,
        messages: [{ role: 'user', content: mensaje }]
      })
    })

    if (respuesta.ok) return await respuesta.json()

    ultimoError = await respuesta.text()
    console.error(`Anthropic respondió ${respuesta.status} con ${modelo}:`, ultimoError)

    // 404 = el modelo no existe; 400 = mensaje inválido → no insistimos
    if (respuesta.status !== 404) break
  }

  throw new Error(ultimoError || 'Sin respuesta de la IA')
}

/** Extrae el primer objeto JSON de un texto (por si viene entre ``` o con charlas). */
function extraerJSON(texto: string): Record<string, unknown> | null {
  const limpio = texto.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(limpio)
  } catch (_) {
    const inicio = limpio.indexOf('{')
    const fin = limpio.lastIndexOf('}')
    if (inicio >= 0 && fin > inicio) {
      try {
        return JSON.parse(limpio.slice(inicio, fin + 1))
      } catch (_) {
        return null
      }
    }
    return null
  }
}

/** Medianoche de hoy en hora de Bogotá, como objeto Date. */
function inicioDelDiaBogota(): Date {
  const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const hoy = formato.format(new Date()) // YYYY-MM-DD
  return new Date(`${hoy}T00:00:00-05:00`)
}

// =============================================================
// Edge Function: notificar
// Envía las notificaciones push programadas (Web Push + VAPID).
//
// Se invoca desde pg_cron (ver supabase/migrations/0002...)
// o desde la app (carta de perdón).
//
// Recibe:
//   { "tipo": "recordatorio-diario" | "una-semana" | "vispera" | "dia-grande",
//     "forzar": false }        <- forzar:true ignora la validación de fecha
//   { "tipo": "perdon" }       -> carta de perdón a la pareja
//   { "tipo": "perdon-si" }    -> "me perdonaste" (avisa a quien envió la carta)
//   { "tipo": "perdon-no" }    -> "todavía no"     (avisa a quien envió la carta)
//
// Los tipos "perdon*" exigen sesión de usuario real (nunca el rol anon).
//
// Secretos necesarios:
//   VAPID_PRIVATE_KEY   -> generada con  npx web-push generate-vapid-keys
//   VAPID_PUBLIC_KEY    -> la pública (también va en el .env del frontend)
//   VAPID_SUBJECT       -> mailto:tu@correo.com
// =============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const ZONA = 'America/Bogota'
const REVELACION = new Date('2026-11-20T00:00:00-05:00')

const CARTA = 'Amor, te amo mucho. Perdóname, pero te amo mucho y te extraño demasiado 💕'
const TIPOS_PERDON = new Set(['perdon', 'perdon-si', 'perdon-no'])

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

type MensajePush = { titulo: string; cuerpo: string; ruta: string; tag: string }
type Destinatario = { id: string; nombre: string }

/** Mensajes de cada aviso (tono cariñoso y divertido). */
const MENSAJES: Record<string, MensajePush> = {
  'recordatorio-diario': {
    titulo: '¿Ya dejaste tu pista de hoy? 🎁',
    cuerpo: 'Tu pareja está esperando una pista. ¡Déjala antes de que se te olvide!',
    ruta: '/app/pistas?nueva=1',
    tag: 'recordatorio'
  },
  'una-semana': {
    titulo: 'Falta 1 semana para descubrirnos 💌',
    cuerpo: '¿Quieres agregar otra pista? Es hora de cuadrar el regalo.',
    ruta: '/app/pistas?nueva=1',
    tag: 'una-semana'
  },
  vispera: {
    titulo: '¡Mañana es el gran día! ⏳',
    cuerpo: 'Última noche de secretos: mañana abrimos los regalos.',
    ruta: '/app/pistas',
    tag: 'vispera'
  },
  'dia-grande': {
    titulo: '¡Hoy se descubre el regalo secreto! 🎉',
    cuerpo: 'Abre la app: ya se puede ver todo lo que estuvo en secreto.',
    ruta: '/app/revelacion',
    tag: 'dia-grande'
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json().catch(() => ({}))
    const tipo: string = body.tipo ?? 'recordatorio-diario'
    const forzar: boolean = Boolean(body.forzar)

    // Cliente administrador (solo se usa aquí, nunca en el frontend)
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    let mensaje: MensajePush
    let destinatarios: Destinatario[] = []
    let extra: Record<string, unknown> = {}

    if (TIPOS_PERDON.has(tipo)) {
      // ---------- Carta de perdón: exige usuario real ----------
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
      const { data: authData, error: errorAuth } = await supabase.auth.getUser(token)
      const usuario = authData?.user
      if (errorAuth || !usuario) {
        return json({ error: 'Esta notificación requiere sesión iniciada.' }, 401)
      }

      const { data: fila0 } = await supabase
        .from('perdones')
        .select('*')
        .order('creada_en', { ascending: false })
        .limit(1)
        .maybeSingle()

      let fila = fila0

      if (!fila && tipo !== 'perdon') {
        return json({ error: 'No hay ninguna carta de perdón pendiente.' }, 400)
      }

      if (!fila) {
        // Primera vez: la crea con la carta escrita
        const { data: miPerfil } = await supabase
          .from('perfiles')
          .select('id, nombre, pareja_id')
          .eq('id', usuario.id)
          .maybeSingle()
        if (!miPerfil?.pareja_id) return json({ error: 'No hay pareja configurada.' }, 400)

        const { data: creada, error: errorCrear } = await supabase
          .from('perdones')
          .insert({ de_id: usuario.id, para_id: miPerfil.pareja_id, mensaje: CARTA })
          .select('*')
          .single()
        if (errorCrear) throw new Error(errorCrear.message)
        fila = creada
      }

      const { data: perfiles } = await supabase
        .from('perfiles')
        .select('id, nombre')
        .in('id', [fila.de_id, fila.para_id])
      const nombreDe = perfiles?.find((p) => p.id === fila!.de_id)?.nombre ?? 'Tu pareja'
      const nombrePara = perfiles?.find((p) => p.id === fila!.para_id)?.nombre ?? 'Tu pareja'

      if (tipo === 'perdon' && fila.de_id !== usuario.id) {
        return json({ error: 'Solo quien envió la carta puede reenviarla.' }, 403)
      }
      if (tipo !== 'perdon' && fila.para_id !== usuario.id) {
        return json({ error: 'Solo quien recibió la carta puede responder.' }, 403)
      }
      if (tipo !== 'perdon' && fila.estado !== 'pendiente') {
        return json({ ok: true, motivo: 'La carta ya fue respondida.', estado: fila.estado }, 200)
      }

      if (tipo === 'perdon') {
        // (Re)envía la carta a quien debe responderla
        await supabase
          .from('perdones')
          .update({ estado: 'pendiente', rechazos: 0, respondida_en: null })
          .eq('id', fila.id)
        fila = { ...fila, estado: 'pendiente', rechazos: 0 }

        mensaje = {
          titulo: 'Amor, te amo mucho 💕',
          cuerpo: `${fila.mensaje} ¿Me perdonas?`,
          ruta: '/app/perdon',
          tag: 'perdon'
        }
        destinatarios = [{ id: fila.para_id, nombre: nombrePara }]
      } else if (tipo === 'perdon-no') {
        const rechazos = (fila.rechazos ?? 0) + 1
        await supabase.from('perdones').update({ rechazos }).eq('id', fila.id)
        extra = { rechazos }

        mensaje = {
          titulo: `Uy… todavía no 😅 (intento ${rechazos})`,
          cuerpo: `${nombrePara} apretó "No" otra vez. ¡No te rindas, ${nombreDe}!`,
          ruta: '/app/perdon',
          tag: 'perdon-no'
        }
        destinatarios = [{ id: fila.de_id, nombre: nombreDe }]
      } else {
        // perdon-si 🎉
        await supabase
          .from('perdones')
          .update({ estado: 'perdonado', respondida_en: new Date().toISOString() })
          .eq('id', fila.id)

        mensaje = {
          titulo: '¡Ella dice que SÍ! 💕',
          cuerpo: `${nombrePara} te perdona 💋… y te ganaste unas gomitas 🍬`,
          ruta: '/app/perdon',
          tag: 'perdon-si'
        }
        destinatarios = [{ id: fila.de_id, nombre: nombreDe }]
        extra = { estado: 'perdonado', rechazos: fila.rechazos ?? 0 }
      }
    } else {
      // ---------- Avisos programados ----------
      const m = MENSAJES[tipo]
      if (!m) return json({ error: `Tipo de aviso desconocido: ${tipo}` }, 400)
      mensaje = m

      const ahora = new Date()
      const hoy = diaBogota(ahora)

      // Guardas de fecha: los avisos solo salen en su día.
      if (!forzar) {
        if (tipo === 'recordatorio-diario' && ahora >= REVELACION) {
          return json({ ok: true, motivo: 'Ya pasó la revelación; no hay más recordatorios.' })
        }
        if (tipo === 'una-semana' && !(hoy === '2026-11-13' && ahora.getHours() >= 4)) {
          return json({ ok: true, motivo: 'El aviso de una semana corresponde al 13/11/2026.' })
        }
        if (tipo === 'vispera' && hoy !== '2026-11-19') {
          return json({ ok: true, motivo: 'El aviso de víspera corresponde al 19/11/2026.' })
        }
        if (tipo === 'dia-grande' && hoy !== '2026-11-20') {
          return json({ ok: true, motivo: 'El aviso del gran día corresponde al 20/11/2026.' })
        }
      }

      // ---------- 1) A quién le llega ----------
      const { data: perfiles, error: errorPerfiles } = await supabase
        .from('perfiles')
        .select('id, nombre')
      if (errorPerfiles) throw new Error(errorPerfiles.message)

      destinatarios = perfiles ?? []

      if (tipo === 'recordatorio-diario') {
        // Solo a quien NO dejó pista hoy (hora Bogotá)
        const { data: pistasHoy } = await supabase
          .from('pistas')
          .select('autor_id, creada_en')
          .gte('creada_en', `${hoy}T00:00:00-05:00`)

        const conPista = new Set((pistasHoy ?? []).map((p) => p.autor_id))
        destinatarios = destinatarios.filter((u) => !conPista.has(u.id))
      }
    }

    if (!destinatarios.length) {
      return json({ ok: true, motivo: 'Nadie necesita este aviso ahora.', enviados: 0 })
    }

    // ---------- 2) Preparar Web Push ----------
    const privada = Deno.env.get('VAPID_PRIVATE_KEY')
    const publica = Deno.env.get('VAPID_PUBLIC_KEY')
    const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hola@regalosecreto.app'

    if (!privada || !publica) {
      return json(
        { error: 'Faltan VAPID_PRIVATE_KEY y VAPID_PUBLIC_KEY en los secretos de las Edge Functions.' },
        500
      )
    }
    webpush.setVapidDetails(subject, publica, privada)

    // ---------- 3) Enviar ----------
    let enviados = 0
    let fallidos = 0
    const detalle: string[] = []

    for (const usuario of destinatarios) {
      const { data: suscripciones } = await supabase
        .from('push_suscripciones')
        .select('id, endpoint, claves')
        .eq('usuario_id', usuario.id)

      for (const sub of suscripciones ?? []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.claves.p256dh, auth: sub.claves.auth }
            },
            JSON.stringify({
              titulo: mensaje.titulo,
              cuerpo: mensaje.cuerpo,
              ruta: mensaje.ruta,
              tag: mensaje.tag
            })
          )
          enviados++
          detalle.push(`${usuario.nombre}: ok`)
        } catch (e: any) {
          fallidos++
          detalle.push(`${usuario.nombre}: ${e?.statusCode ?? 'error'}`)
          // Suscripción vencida (cambiaron de celular, cerraron la app, etc.)
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await supabase.from('push_suscripciones').delete().eq('id', sub.id)
          }
        }
      }
    }

    return json({
      ok: true,
      tipo,
      ...extra,
      destinatarios: destinatarios.length,
      enviados,
      fallidos,
      detalle
    })
  } catch (e) {
    console.error('Fallo enviando notificaciones:', e)
    return json({ error: 'No se pudieron enviar las notificaciones.' }, 500)
  }
})

// ---------- Helpers ----------

function json(datos: unknown, status = 200): Response {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  })
}

/** Fecha calendario (YYYY-MM-DD) en hora de Bogotá. */
function diaBogota(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d)
}

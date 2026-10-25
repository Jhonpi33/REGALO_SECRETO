// =============================================================
// Edge Function: notificar
// Envía las notificaciones push programadas (Web Push + VAPID).
//
// Se invoca desde pg_cron (ver supabase/migrations/0002...).
// Recibe: { "tipo": "recordatorio-diario" | "una-semana" | "vispera" | "dia-grande",
//           "forzar": false }   <- forzar:true ignora la validación de fecha
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

/** Mensajes de cada aviso (tono cariñoso y divertido). */
const MENSAJES: Record<string, { titulo: string; cuerpo: string; ruta: string; tag: string }> = {
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

    const mensaje = MENSAJES[tipo]
    if (!mensaje) return json({ error: `Tipo de aviso desconocido: ${tipo}` }, 400)

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

    // Cliente administrador (solo se usa aquí, nunca en el frontend)
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    // ---------- 1) A quién le llega ----------
    const { data: perfiles, error: errorPerfiles } = await supabase
      .from('perfiles')
      .select('id, nombre')
    if (errorPerfiles) throw new Error(errorPerfiles.message)

    let destinatarios = perfiles ?? []

    if (tipo === 'recordatorio-diario') {
      // Solo a quien NO dejó pista hoy (hora Bogotá)
      const { data: pistasHoy } = await supabase
        .from('pistas')
        .select('autor_id, creada_en')
        .gte('creada_en', `${hoy}T00:00:00-05:00`)

      const conPista = new Set((pistasHoy ?? []).map((p) => p.autor_id))
      destinatarios = destinatarios.filter((u) => !conPista.has(u.id))
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

    return json({ ok: true, tipo, destinatarios: destinatarios.length, enviados, fallidos, detalle })
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

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

/**
 * Notificaciones push (Web Push + VAPID).
 *
 * Importante:
 * - En Android/Chrome funcionan sin más.
 * - En iPhone SOLO funcionan si la app está instalada en la pantalla de inicio
 *   y el sistema es iOS 16.4 o superior (ver  /src/views/InstalarView.vue ).
 */

const LLAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY

/** Estado del permiso: 'permitido' | 'denegado' | 'sin-pedir' | 'no-soportado' */
export function estadoPermiso() {
  if (typeof Notification === 'undefined') return 'no-soportado'
  if (Notification.permission === 'granted') return 'permitido'
  if (Notification.permission === 'denied') return 'denegado'
  return 'sin-pedir'
}

/** true si el navegador y el sistema permiten push en este dispositivo. */
export function soportaPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined'
}

/**
 * Pide el permiso y guarda la suscripción en Supabase.
 * Devuelve: 'ok' | 'sin-llave' | 'denegado' | 'no-soportado' | 'error'
 */
export async function activarNotificaciones() {
  const auth = useAuthStore()
  if (!auth.usuario) return 'sin-sesion'
  if (!soportaPush()) return 'no-soportado'
  if (!LLAVE_PUBLICA) return 'sin-llave'

  try {
    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') return 'denegado'

    const registro = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const suscripcion =
      (await registro.pushManager.getSubscription()) ??
      (await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64AUint8Array(LLAVE_PUBLICA)
      }))

    const json = suscripcion.toJSON()
    await supabase.from('push_suscripciones').upsert(
      {
        usuario_id: auth.usuario.id,
        endpoint: json.endpoint,
        claves: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        agente: navigator.userAgent
      },
      { onConflict: 'usuario_id,endpoint' }
    )
    return 'ok'
  } catch (e) {
    console.error('No se pudo activar push:', e)
    return 'error'
  }
}

/** Quita la suscripción de este dispositivo. */
export async function desactivarNotificaciones() {
  try {
    const registro = await navigator.serviceWorker.getRegistration()
    const sub = await registro?.pushManager?.getSubscription()
    if (!sub) return
    await supabase.from('push_suscripciones').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  } catch (e) {
    console.error('No se pudo desactivar push:', e)
  }
}

/** Convierte la llave VAPID (base64url) al formato que entiende el navegador. */
function urlBase64AUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const salida = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) salida[i] = rawData.charCodeAt(i)
  return salida
}

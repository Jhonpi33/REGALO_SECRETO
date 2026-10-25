/* =========================================================
   Handler de notificaciones push para "Regalo Secreto"
   Este archivo se importa desde el service worker generado por
   vite-plugin-pwa (workbox) mediante  workbox.importScripts.
   ========================================================= */

// Muestra la notificación cuando llega un push desde Supabase.
self.addEventListener('push', (evento) => {
  let datos = {}
  try {
    datos = evento.data ? evento.data.json() : {}
  } catch (_) {
    datos = { titulo: 'Regalo Secreto 🎁', cuerpo: evento.data ? evento.data.text() : '' }
  }

  const opciones = {
    body: datos.cuerpo ?? 'Tienes un mensaje en Regalo Secreto',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    image: datos.imagen,
    vibrate: [80, 40, 80, 40, 120],
    tag: datos.tag ?? 'regalo-secreto',
    renotify: true,
    data: { ruta: datos.ruta ?? '/app/pistas' }
  }

  evento.waitUntil(self.registration.showNotification(datos.titulo ?? 'Regalo Secreto 🎁', opciones))
})

// Al tocar la notificación, abre la app en la pantalla indicada.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const ruta = evento.notification.data?.ruta ?? '/'
  const url = new URL(ruta, self.location.origin).href

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      // Si la app ya está abierta, la enfoca; si no, abre una pestaña nueva.
      for (const ventana of ventanas) {
        if ('focus' in ventana) {
          ventana.postMessage({ tipo: 'abrir-ruta', ruta })
          return ventana.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

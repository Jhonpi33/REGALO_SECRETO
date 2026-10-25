import { defineStore } from 'pinia'
import { usePistasStore } from './pistas'
import { useAuthStore } from './auth'

/**
 * Avisos que se muestran como banners DENTRO de la app
 * (el respaldo de las notificaciones push, por si estas no llegan).
 *
 * Horarios en hora de Bogotá (UTC-5).
 */
export const useAvisosStore = defineStore('avisos', {
  state: () => ({
    descartados: JSON.parse(localStorage.getItem('regalo-secreto:avisos-descartados') || '[]')
  }),

  getters: {
    /** Lista de banners que corresponden mostrar hoy. */
    visibles: (s) => {
      const avisos = []
      const auth = useAuthStore()
      if (!auth.usuario) return []

      const ahora = new Date()
      const dia = diaBogota(ahora)
      const hora = horaBogota(ahora)

      // 1. Recordatorio diario de pista (hasta el 19/11, solo si aún no hay pista hoy)
      const pistas = usePistasStore()
      const yaDejeHoy = pistas.yaDejeHoy
      if (dia < '2026-11-20' && !yaDejeHoy) {
        avisos.push({
          id: 'recordatorio-diario',
          emoji: '🎁',
          texto: '¿Ya dejaste tu pista de hoy? Tu pareja está mirando 👀',
          accion: { nombre: 'Agregar pista', ruta: '/app/pistas?nueva=1' }
        })
      }

      // 2. Una semana antes: viernes 13 de noviembre de 2026, 9:00 a. m.
      if (dia === '2026-11-13' && hora >= 9) {
        avisos.push({
          id: 'una-semana',
          emoji: '💌',
          texto: 'Falta 1 semana para descubrirnos 💌 ¿Quieres agregar otra pista? Es hora de cuadrar el regalo.',
          accion: { nombre: 'Agregar pista', ruta: '/app/pistas?nueva=1' }
        })
      }

      // 3. Víspera: 19 de noviembre de 2026, 9:00 a. m.
      if (dia === '2026-11-19' && hora >= 9) {
        avisos.push({
          id: 'vispera',
          emoji: '⏳',
          texto: '¡Mañana es el gran día! Revisa tus pistas y deja una última pista.',
          accion: { nombre: 'Ver pistas', ruta: '/app/pistas' }
        })
      }

      // 4. Día de la revelación: 20 de noviembre de 2026, 8:00 a. m.
      if (dia === '2026-11-20' && hora >= 8) {
        avisos.push({
          id: 'dia-grande',
          emoji: '🎉',
          texto: '¡Hoy se descubre el regalo secreto! 🎉',
          accion: { nombre: 'Ir a la revelación', ruta: '/app/revelacion' }
        })
      }

      return avisos.filter((a) => !s.descartados.includes(a.id))
    }
  },

  actions: {
    descartar(id) {
      if (!this.descartados.includes(id)) this.descartados.push(id)
      localStorage.setItem('regalo-secreto:avisos-descartados', JSON.stringify(this.descartados))
    },
    /** Limpia los avisos para que vuelvan a aparecer en una fecha nueva. */
    reiniciar() {
      this.descartados = []
      localStorage.removeItem('regalo-secreto:avisos-descartados')
    }
  }
})

/** Día calendario (YYYY-MM-DD) en hora de Bogotá. */
function diaBogota(d) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Bogota'
  }).format(d)
}

/** Hora 0-23 en hora de Bogotá. */
function horaBogota(d) {
  return Number(
    new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'America/Bogota'
    }).format(d)
  )
}

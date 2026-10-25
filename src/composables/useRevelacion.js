import { computed, ref, onUnmounted } from 'vue'
import { FECHA_REVELACION, ZONA_HORARIA } from '../data/constantes'

/**
 * Cuenta regresiva viva hasta la revelación:
 * 20 de noviembre de 2026 a las 00:00 hora Bogotá.
 */
const ahora = ref(Date.now())
let intervalo = null

function asegurarReloj() {
  if (intervalo) return
  intervalo = setInterval(() => {
    ahora.value = Date.now()
  }, 1000)
}
asegurarReloj()

export function useRevelacion() {
  const revelado = computed(() => ahora.value >= FECHA_REVELACION.getTime())

  const restanteMs = computed(() => Math.max(0, FECHA_REVELACION.getTime() - ahora.value))

  const dias = computed(() => Math.floor(restanteMs.value / 86400000))
  const horas = computed(() => Math.floor((restanteMs.value % 86400000) / 3600000))
  const minutos = computed(() => Math.floor((restanteMs.value % 3600000) / 60000))
  const segundos = computed(() => Math.floor((restanteMs.value % 60000) / 1000))

  /** Fecha legible "20 de noviembre de 2026" en hora de Bogotá. */
  const fechaLarga = computed(() =>
    new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: ZONA_HORARIA
    }).format(FECHA_REVELACION)
  )

  return { revelado, restanteMs, dias, horas, minutos, segundos, fechaLarga, ahora }
}

/** Comprueba si la revelación ya pasó en este instante (sin reloj). */
export function yaRevelado() {
  return Date.now() >= FECHA_REVELACION.getTime()
}

/** Detiene el reloj global (solo si ya nadie lo usa). */
export function detenerReloj() {
  if (intervalo) clearInterval(intervalo)
  intervalo = null
}

onUnmounted(() => {})

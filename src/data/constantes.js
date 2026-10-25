// Constantes globales de la app.
// Zona horaria de referencia: America/Bogota (UTC-5). Moneda: COP.

/** Momento exacto de la revelación: 20 de noviembre de 2026, 00:00 hora Bogotá. */
export const FECHA_REVELACION_ISO = '2026-11-20T00:00:00-05:00'
export const FECHA_REVELACION = new Date(FECHA_REVELACION_ISO)

export const ZONA_HORARIA = 'America/Bogota'
export const DESPLAZAMIENTO_UTC = '-05:00' // Bogotá no tiene horario de verano

export const NOMBRE_PAREJA_A = 'Jhon'
export const NOMBRE_PAREJA_B = 'Majo'

/** Categorías sugeridas para las pistas. */
export const CATEGORIAS = [
  'Algo que uso',
  'Algo que me gustaría tener',
  'Un lugar',
  'Un color',
  'Un hobby',
  'Una experiencia',
  'Otra'
]

/** Niveles de obviedad de una pista. */
export const NIVELES = [
  { id: 'fria', emoji: '🧊', nombre: 'Fría', descripcion: 'Difícil de adivinar' },
  { id: 'tibia', emoji: '🌤️', nombre: 'Tibia', descripcion: 'Va por buen camino' },
  { id: 'caliente', emoji: '🔥', nombre: 'Caliente', descripcion: 'Muy obvia' }
]

/** Devuelve el emoji de un nivel. */
export function emojiNivel(nivel) {
  return NIVELES.find((n) => n.id === nivel)?.emoji ?? '🌡️'
}

/** Devuelve el nombre de un nivel. */
export function nombreNivel(nivel) {
  return NIVELES.find((n) => n.id === nivel)?.nombre ?? 'Sin nivel'
}

/** Límite de consultas a la IA por usuario y por día (hora Bogotá). */
export const LIMITE_CONSULTAS_IA_DIA = 5

/** Mínimo de pistas de la pareja para que la IA pueda responder. */
export const MINIMO_PISTAS_PARA_IA = 3

/** Estados posibles del regalo elegido. */
export const ESTADOS_REGALO = [
  { id: 'pensando', nombre: 'Pensando', emoji: '💭' },
  { id: 'comprado', nombre: 'Comprado', emoji: '🛍️' },
  { id: 'envuelto', nombre: 'Envuelto', emoji: '🎁' }
]

/** Formatea una fecha (Date o ISO) como "20 de noviembre de 2026". */
export function fechaLarga(d) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONA_HORARIA
  }).format(new Date(d))
}

/** Clave de agrupación por día (YYYY-MM-DD) usando la zona horaria de Bogotá. */
export function claveDia(d) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: ZONA_HORARIA
  }).format(new Date(d))
}

/** Etiqueta amable para un día: "Hoy", "Ayer" o la fecha larga. */
export function etiquetaDia(clave) {
  const hoy = claveDia(new Date())
  const ayer = claveDia(new Date(Date.now() - 86400000))
  if (clave === hoy) return 'Hoy'
  if (clave === ayer) return 'Ayer'
  const [a, m, d] = clave.split('-').map(Number)
  return fechaLarga(new Date(Date.UTC(a, m - 1, d, 12)))
}

/** Formatea pesos colombianos: 150000 → "$150.000". */
export function formatoCOP(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(valor))
}

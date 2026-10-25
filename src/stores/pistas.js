import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { claveDia } from '../data/constantes'

/**
 * Store de pistas: las mías (las escribo) y las de mi pareja (las descifro).
 * La privacidad real está en las políticas RLS de la base de datos;
 * aquí solo organizamos lo que el servidor nos devuelve.
 */
export const usePistasStore = defineStore('pistas', {
  state: () => ({
    mias: [],
    dePareja: [],
    cargando: false,
    error: null
  }),

  getters: {
    /** Mis pistas agrupadas por día (más reciente arriba). */
    miasPorDia: (s) => agruparPorDia(s.mias),

    /** Pistas de la pareja agrupadas por día (más reciente arriba). */
    deParejaPorDia: (s) => agruparPorDia(s.dePareja),

    /** Total de pistas que he escrito. */
    totalMias: (s) => s.mias.length,

    /** Días seguidos con al menos una pista (racha). */
    racha: (s) => calcularRacha(s.mias),

    /** true si ya dejé pista hoy (hora Bogotá). */
    yaDejeHoy: (s) => s.mias.some((p) => claveDia(p.creada_en) === claveDia(new Date())),

    /** Ids de pistas de la pareja que todavía no he visto. */
    nuevasPareja: (s) => new Set(s.dePareja.filter((p) => !p.vista).map((p) => p.id)),

    /** ¿Hay pistas de la pareja suficientes para pedirle ayuda a la IA? */
    pistasParejaSuficientes: (s) => s.dePareja.length >= 3
  },

  actions: {
    /** Carga las pistas propias y las de la pareja. */
    async cargar() {
      const auth = useAuthStore()
      if (!auth.usuario) return
      this.cargando = true
      this.error = null
      try {
        const [mias, dePareja] = await Promise.all([
          supabase
            .from('pistas')
            .select('*')
            .order('creada_en', { ascending: false })
            .limit(500),
          supabase
            .from('pistas')
            .select('*')
            .eq('autor_id', auth.pareja?.id ?? '__sin_pareja__')
            .order('creada_en', { ascending: false })
            .limit(500)
        ])
        if (mias.error) throw mias.error
        if (dePareja.error) throw dePareja.error
        this.mias = mias.data ?? []
        this.dePareja = dePareja.data ?? []
      } catch (e) {
        this.error = e.message
        console.error('Error cargando pistas:', e.message)
      } finally {
        this.cargando = false
      }
    },

    /** Agrega una pista mía. */
    async agregar({ texto, categoria, nivel }) {
      const auth = useAuthStore()
      const { data, error } = await supabase
        .from('pistas')
        .insert({ autor_id: auth.usuario.id, texto: texto.trim(), categoria, nivel })
        .select()
        .single()
      if (error) throw error
      this.mias.unshift(data)
      return data
    },

    /** Edita una pista mía (solo hasta el día de la revelación). */
    async editar(id, cambios) {
      const { data, error } = await supabase
        .from('pistas')
        .update({ texto: cambios.texto.trim(), categoria: cambios.categoria, nivel: cambios.nivel })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const i = this.mias.findIndex((p) => p.id === id)
      if (i >= 0) this.mias[i] = data
      return data
    },

    /** Borra una pista mía. */
    async borrar(id) {
      const { error } = await supabase.from('pistas').delete().eq('id', id)
      if (error) throw error
      this.mias = this.mias.filter((p) => p.id !== id)
    },

    /** Marca las pistas de la pareja como vistas (quita el sello "Nueva"). */
    async marcarVistas() {
      const sinVer = this.dePareja.filter((p) => !p.vista)
      if (!sinVer.length) return
      const ids = sinVer.map((p) => p.id)
      this.dePareja = this.dePareja.map((p) => ({ ...p, vista: true }))
      // No existe columna "vista" en la tabla (es privada de cada dispositivo):
      // la guardamos en localStorage por usuario.
      guardarVistas(ids)
    },

    /** Carga desde localStorage cuáles pistas ya vi. */
    sincronizarVistas() {
      const vistas = leerVistas()
      this.dePareja = this.dePareja.map((p) => ({ ...p, vista: vistas.has(p.id) }))
    }
  }
})

/* ---------- Helpers ---------- */

/** Agrupa un array de pistas por día (Bogotá) y devuelve [{clave, pistas}]. */
function agruparPorDia(pistas) {
  const mapa = new Map()
  for (const p of pistas) {
    const clave = claveDia(p.creada_en)
    if (!mapa.has(clave)) mapa.set(clave, [])
    mapa.get(clave).push(p)
  }
  return [...mapa.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([clave, items]) => ({ clave, pistas: items }))
}

/** Calcula la racha de días consecutivos con pista (incluye hoy o arranca ayer). */
function calcularRacha(pistas) {
  if (!pistas.length) return 0
  const dias = new Set(pistas.map((p) => claveDia(p.creada_en)))
  const hoy = claveDia(new Date())

  // Si hoy aún no hay pista, la racha sigue viva si la hubo ayer.
  let actual = dias.has(hoy) ? hoy : claveDia(new Date(Date.now() - 86400000))
  if (!dias.has(actual)) return 0

  let racha = 0
  let cursor = new Date(`${actual}T12:00:00Z`).getTime()
  while (dias.has(new Date(cursor).toISOString().slice(0, 10))) {
    racha++
    cursor -= 86400000
  }
  return racha
}

const LLAVE_VISTAS = 'regalo-secreto:pistas-vistas'

function guardarVistas(ids) {
  const actuales = leerVistas()
  ids.forEach((id) => actuales.add(id))
  try {
    localStorage.setItem(LLAVE_VISTAS, JSON.stringify([...actuales]))
  } catch (_) {
    /* almacenamiento no disponible */
  }
}

function leerVistas() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LLAVE_VISTAS) || '[]'))
  } catch (_) {
    return new Set()
  }
}

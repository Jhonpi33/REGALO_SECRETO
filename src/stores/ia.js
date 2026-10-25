import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { LIMITE_CONSULTAS_IA_DIA, MINIMO_PISTAS_PARA_IA } from '../data/constantes'
import { usePistasStore } from './pistas'

/**
 * Store de la IA: "¿Qué querrá mi pareja?"
 * La llamada a Claude ocurre SOLO en la Edge Function `ia-regalo`.
 * Aquí guardamos el historial de consultas (privado para quien consulta).
 */
export const useIAStore = defineStore('ia', {
  state: () => ({
    historial: [],
    pensando: false,
    error: null,
    consultasHoy: 0
  }),

  getters: {
    /** true si ya usé el cupo de hoy. */
    cupoAgotado: (s) => s.consultasHoy >= LIMITE_CONSULTAS_IA_DIA,

    /** true si hay suficientes pistas de la pareja como para preguntarle a la IA. */
    hayPistasSuficientes: () => usePistasStore().dePareja.length >= MINIMO_PISTAS_PARA_IA,

    /** Última respuesta recibida. */
    ultima: (s) => s.historial[0] ?? null
  },

  actions: {
    /** Carga mi historial de consultas y cuenta las de hoy. */
    async cargar() {
      const { data, error } = await supabase
        .from('consultas_ia')
        .select('*')
        .order('creada_en', { ascending: false })
        .limit(50)
      if (error) {
        console.error('Error cargando consultas de IA:', error.message)
        return
      }
      this.historial = data ?? []
      this.consultasHoy = this.historial.filter((c) => esHoy(c.creada_en)).length
    },

    /**
     * Pide ideas de regalo a la IA.
     * @param {number|null} presupuestoCOP presupuesto sugerido en pesos colombianos
     * @param {string} pregunta pregunta opcional del usuario
     */
    async pedirAyuda(presupuestoCOP = null, pregunta = '') {
      this.pensando = true
      this.error = null
      try {
        const { data, error } = await supabase.functions.invoke('ia-regalo', {
          body: { presupuesto_cop: presupuestoCOP, pregunta }
        })
        if (error) throw new Error(error.message ?? 'No se pudo contactar a la IA')

        const respuesta = data?.ideas ?? []
        if (!respuesta.length && data?.aviso) throw new Error(data.aviso)

        const consulta = {
          id: data?.id ?? crypto.randomUUID(),
          presupuesto_cop: presupuestoCOP,
          pregunta,
          respuesta_json: { ideas: respuesta, nota: data?.nota ?? null },
          creada_en: new Date().toISOString()
        }
        this.historial.unshift(consulta)
        this.consultasHoy++
        return consulta
      } catch (e) {
        this.error = e.message
        throw e
      } finally {
        this.pensando = false
      }
    }
  }
})

/** ¿Esta fecha cayó hoy (hora Bogotá)? */
function esHoy(iso) {
  const d = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Bogota'
  }).format(new Date(iso))
  const hoy = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Bogota'
  }).format(new Date())
  return d === hoy
}

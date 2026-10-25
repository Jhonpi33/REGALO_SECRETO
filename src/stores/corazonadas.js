import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { yaRevelado } from '../composables/useRevelacion'

/**
 * Store de corazonadas: mis teorías y el regalo que elegí.
 * Es información PRIVADA: antes del 20/11/2026 solo su dueño la ve.
 * La pareja solo puede leerla cuando la RLS lo permite (fecha de revelación).
 */
export const useCorazonadasStore = defineStore('corazonadas', {
  state: () => ({
    mias: [],
    dePareja: [], // llega vacío hasta la revelación (lo decide la base de datos)
    cargando: false,
    error: null
  }),

  getters: {
    /** Mi corazonada actual (la más reciente). */
    mia: (s) => s.mias[0] ?? null,

    /** La corazonada de mi pareja (solo visible después de la revelación). */
    deLaPareja: (s) => s.dePareja[0] ?? null,

    /** true si puedo ver lo privado de mi pareja (lo confirma también la RLS). */
    puedeVerPareja: () => yaRevelado()
  },

  actions: {
    async cargar() {
      const auth = useAuthStore()
      if (!auth.usuario) return
      this.cargando = true
      this.error = null
      try {
        // Mis corazonadas (siempre) + las de mi pareja (la RLS devuelve []
        // antes de la fecha de revelación).
        const [mias, dePareja] = await Promise.all([
          supabase.from('corazonadas').select('*').order('actualizada_en', { ascending: false }),
          supabase
            .from('corazonadas')
            .select('*')
            .eq('autor_id', auth.pareja?.id ?? '__sin_pareja__')
            .order('actualizada_en', { ascending: false })
        ])
        if (mias.error) throw mias.error
        if (dePareja.error) throw dePareja.error
        this.mias = mias.data ?? []
        this.dePareja = dePareja.data ?? []
      } catch (e) {
        this.error = e.message
        console.error('Error cargando corazonadas:', e.message)
      } finally {
        this.cargando = false
      }
    },

    /** Crea o actualiza mi corazonada. */
    async guardar(campos) {
      const auth = useAuthStore()
      const existente = this.mia
      const payload = {
        autor_id: auth.usuario.id,
        teoria: campos.teoria?.trim() || null,
        regalo_elegido: campos.regalo_elegido?.trim() || null,
        enlace: campos.enlace?.trim() || null,
        presupuesto_cop: campos.presupuesto_cop ? Number(campos.presupuesto_cop) : null,
        estado: campos.estado ?? 'pensando'
      }

      if (existente) {
        const { data, error } = await supabase
          .from('corazonadas')
          .update(payload)
          .eq('id', existente.id)
          .select()
          .single()
        if (error) throw error
        this.mias[0] = data
        return data
      }

      const { data, error } = await supabase.from('corazonadas').insert(payload).select().single()
      if (error) throw error
      this.mias.unshift(data)
      return data
    },

    /** Borra mi corazonada. */
    async borrar() {
      if (!this.mia) return
      const { error } = await supabase.from('corazonadas').delete().eq('id', this.mia.id)
      if (error) throw error
      this.mias = []
    }
  }
})

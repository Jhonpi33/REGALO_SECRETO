import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

/**
 * Store de autenticación y perfil.
 * Solo existen 2 usuarios (Jhon y Majo): no hay registro público.
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: null,
    perfil: null,
    pareja: null,
    listo: false, // ya se resolvió la sesión inicial
    cargando: false,
    error: null
  }),

  getters: {
    autenticado: (s) => Boolean(s.usuario),
    nombre: (s) => s.perfil?.nombre ?? s.usuario?.email ?? '',
    esMajo: (s) => s.perfil?.nombre?.toLowerCase() === 'majo' || s.perfil?.tema === 'rosa'
  },

  actions: {
    /** Carga la sesión guardada y la mantiene viva. Se llama una sola vez. */
    async inicializar() {
      if (this.listo) return
      try {
        const { data } = await supabase.auth.getSession()
        this.usuario = data.session?.user ?? null
        if (this.usuario) await this.cargarPerfil()
      } finally {
        this.listo = true
      }

      // Reacciona a login / logout / expiración del token
      supabase.auth.onAuthStateChange((_evento, sesion) => {
        this.usuario = sesion?.user ?? null
        if (this.usuario) this.cargarPerfil()
        else {
          this.perfil = null
          this.pareja = null
        }
      })
    },

    /** Trae el perfil propio y el de la pareja desde Supabase. */
    async cargarPerfil() {
      if (!this.usuario) return
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre, tema, pareja_id, pareja:pareja_id(id, nombre, tema)')
        .eq('id', this.usuario.id)
        .maybeSingle()

      if (error) {
        console.error('No se pudo cargar el perfil:', error.message)
        return
      }
      this.perfil = data
      this.pareja = data?.pareja ?? null
    },

    /** Inicia sesión con correo y contraseña. */
    async entrar(correo, clave) {
      this.cargando = true
      this.error = null
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password: clave })
        if (error) throw error
        this.usuario = data.user
        await this.cargarPerfil()
        return true
      } catch (e) {
        this.error = traducirError(e)
        return false
      } finally {
        this.cargando = false
      }
    },

    /** Cierra la sesión. */
    async salir() {
      await supabase.auth.signOut()
      this.usuario = null
      this.perfil = null
      this.pareja = null
    }
  }
})

/** Mensajes de error más amables para el usuario. */
function traducirError(e) {
  const m = String(e?.message ?? '')
  if (m.includes('Invalid login credentials')) return 'El correo o la contraseña no coinciden 🤔'
  if (m.includes('Email not confirmed')) return 'Ese correo aún no está confirmado.'
  if (m.includes('Failed to fetch')) return 'No hay conexión con el servidor. Revisa tu internet.'
  return m || 'Algo salió mal. Intenta de nuevo.'
}

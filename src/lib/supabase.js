import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase.
// Las llaves salen de las variables de entorno (.env) — NUNCA van en el código.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Aviso amable en desarrollo: la app corre, pero sin backend.
  console.warn(
    '[Regalo Secreto] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env. ' +
      'Copia .env.example a .env y completa tus llaves de Supabase.'
  )
}

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', anonKey ?? 'anon-placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'regalo-secreto-auth'
  }
})

/** true si el backend está configurado. */
export const backendListo = Boolean(url && anonKey)

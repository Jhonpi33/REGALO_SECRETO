<script setup>
/**
 * Mi perfil: tema visual, notificaciones, datos de la cuenta y salida.
 */
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { usePistasStore } from '../stores/pistas'
import { useToastStore } from '../stores/toast'
import { supabase } from '../lib/supabase'
import {
  activarNotificaciones,
  desactivarNotificaciones,
  estadoPermiso,
  soportaPush
} from '../composables/useNotificaciones'

const auth = useAuthStore()
const pistas = usePistasStore()
const toast = useToastStore()

const tema = ref(auth.perfil?.tema ?? 'rosa')
const permiso = ref(estadoPermiso())
const cargandoTema = ref(false)

watch(
  () => auth.perfil?.tema,
  (v) => {
    if (v) tema.value = v
  },
  { immediate: true }
)

const nombrePareja = computed(() => auth.pareja?.nombre ?? '—')

/** Cambia el tema visual (rosa / azul) y lo guarda en el perfil. */
async function cambiarTema(nuevo) {
  if (nuevo === tema.value) return
  tema.value = nuevo
  cargandoTema.value = true
  const { error } = await supabase.from('perfiles').update({ tema: nuevo }).eq('id', auth.usuario.id)
  cargandoTema.value = false
  if (error) {
    toast.error('No se pudo cambiar el tema: ' + error.message)
    return
  }
  await auth.cargarPerfil()
  toast.ok(nuevo === 'rosa' ? 'Tema rosado aplicado 💗' : 'Tema azul aplicado 💙')
}

/** Activa o desactiva las notificaciones push de este dispositivo. */
async function alternarNotificaciones() {
  if (permiso.value === 'permitido') {
    await desactivarNotificaciones()
    permiso.value = estadoPermiso()
    toast.mostrar('Notificaciones desactivadas en este dispositivo 🔕')
    return
  }
  const r = await activarNotificaciones()
  permiso.value = estadoPermiso()
  if (r === 'ok') toast.ok('¡Notificaciones activadas! 🔔')
  else if (r === 'denegado') toast.mostrar('El permiso fue rechazado. Actívalo desde los ajustes del navegador.')
  else if (r === 'sin-llave') toast.mostrar('Falta la llave VAPID pública en el archivo .env (SETUP.md).')
  else if (r === 'no-soportado') toast.mostrar('Este navegador no soporta notificaciones push.')
  else toast.error('No se pudieron activar las notificaciones.')
}

const empujeActivo = computed(() => permiso.value === 'permitido')
</script>

<template>
  <div class="perfil">
    <header class="perfil__cabecera">
      <div class="perfil__avatar" :class="tema === 'rosa' ? 'perfil__avatar--rosa' : 'perfil__avatar--azul'">
        {{ (auth.nombre || '?').charAt(0).toUpperCase() }}
      </div>
      <div>
        <h1>{{ auth.nombre }}</h1>
        <p class="texto-tenue">Pareja: <strong>{{ nombrePareja }}</strong></p>
      </div>
    </header>

    <!-- Tema visual -->
    <section class="tarjeta bloque">
      <h2>Mi tema 💅</h2>
      <div class="temas">
        <button
          class="tema"
          :class="{ 'tema--activo': tema === 'rosa' }"
          :aria-pressed="tema === 'rosa'"
          @click="cambiarTema('rosa')"
        >
          <span class="tema__muestra tema__muestra--rosa">💗</span>
          Rosado
        </button>
        <button
          class="tema"
          :class="{ 'tema--activo': tema === 'azul' }"
          :aria-pressed="tema === 'azul'"
          @click="cambiarTema('azul')"
        >
          <span class="tema__muestra tema__muestra--azul">💙</span>
          Azul
        </button>
      </div>
      <p v-if="cargandoTema" class="texto-tenue">Guardando…</p>
    </section>

    <!-- Notificaciones -->
    <section class="tarjeta bloque">
      <h2>Notificaciones 🔔</h2>
      <p class="texto-tenue">
        Recordatorio diario a las 7:00 p. m., aviso de una semana, víspera y el gran día.
        <template v-if="permiso === 'denegado'">
          <br />⚠️ Están bloqueadas: actívalas en los ajustes de tu navegador.
        </template>
      </p>

      <div class="perfil__acciones">
        <button v-if="!empujeActivo" class="btn" :disabled="!soportaPush()" @click="alternarNotificaciones">
          Activar notificaciones 🔔
        </button>
        <button v-else class="btn btn--secundario" @click="alternarNotificaciones">Desactivar 🔕</button>
        <router-link class="btn btn--secundario" to="/instalar">Cómo instalar la app</router-link>
      </div>

      <p v-if="!soportaPush()" class="nota">
        🍎 En iPhone: las notificaciones solo funcionan si instalas la app en la pantalla de inicio (iOS 16.4 o
        superior).
      </p>
    </section>

    <!-- Datos -->
    <section class="tarjeta bloque">
      <h2>Datos 📊</h2>
      <ul class="datos">
        <li><span>Pistas escritas</span><strong>{{ pistas.totalMias }}</strong></li>
        <li><span>Racha actual</span><strong>🔥 {{ pistas.racha }} días</strong></li>
        <li><span>Pistas de tu pareja</span><strong>{{ pistas.dePareja.length }}</strong></li>
        <li><span>Zona horaria</span><strong>Bogotá (UTC-5)</strong></li>
      </ul>
    </section>

    <!-- Salir -->
    <button class="btn btn--peligro btn--ancho" @click="auth.salir()">Cerrar sesión ⏻</button>

    <p class="perfil__pie texto-tenue">Regalo Secreto · Jhon &amp; Majo · 20 · 11 · 2026 🎁</p>
  </div>
</template>

<style scoped>
.perfil__cabecera {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-bottom: 1.3rem;
}

.perfil__avatar {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: var(--fuente-titulos);
  font-size: 1.6rem;
  font-weight: 800;
  color: #fff;
}

.perfil__avatar--rosa {
  background: linear-gradient(135deg, #ff8bbd, #e0559b);
}
.perfil__avatar--azul {
  background: linear-gradient(135deg, #7fc3ff, #3d8bfd);
}

.perfil__cabecera h1 {
  font-size: 1.6rem;
  margin-bottom: 0.15rem;
}

.perfil__cabecera p {
  margin: 0;
  font-size: 0.9rem;
}

.bloque {
  margin-bottom: 1rem;
}

.bloque h2 {
  font-size: 1.1rem;
  margin-bottom: 0.7rem;
}

.temas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.tema {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 54px;
  border-radius: 14px;
  border: 1px solid var(--borde);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.tema--activo {
  border-color: var(--color-primario);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primario) 45%, transparent);
}

.tema__muestra {
  font-size: 1.2rem;
}

.perfil__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.6rem;
}

.perfil__acciones .btn {
  flex: 1;
  min-width: 180px;
}

.nota {
  margin-top: 0.9rem;
  font-size: 0.82rem;
  color: var(--color-acento);
  background: rgba(255, 217, 138, 0.1);
  border-radius: 12px;
  padding: 0.55rem 0.7rem;
}

.datos {
  list-style: none;
  padding: 0;
  margin: 0;
}

.datos li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px dashed var(--borde);
  font-size: 0.92rem;
}

.datos li:last-child {
  border-bottom: none;
}

.datos span {
  color: var(--texto-tenue);
}

.perfil__pie {
  text-align: center;
  font-size: 0.8rem;
  margin-top: 1.6rem;
}
</style>

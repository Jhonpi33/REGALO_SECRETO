<script setup>
/**
 * Estructura de la app autenticada: cabecera, menú inferior (móvil)
 * y área de contenido. También carga los datos y pide el permiso de
 * notificaciones de forma amable la primera vez.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePistasStore } from '../stores/pistas'
import { useCorazonadasStore } from '../stores/corazonadas'
import { useIAStore } from '../stores/ia'
import { useToastStore } from '../stores/toast'
import { useRevelacion } from '../composables/useRevelacion'
import { activarNotificaciones, estadoPermiso, soportaPush } from '../composables/useNotificaciones'
import ModalBase from '../components/ModalBase.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const pistas = usePistasStore()
const corazonadas = useCorazonadasStore()
const ia = useIAStore()
const toast = useToastStore()
const { revelado, dias } = useRevelacion()

/** Pantalla de explicación antes de pedir el permiso de notificaciones. */
const mostrarExplicacionPush = ref(false)

const pestanas = [
  { ruta: '/app/pistas', icono: '🗝️', texto: 'Pistas' },
  { ruta: '/app/corazonadas', icono: '💭', texto: 'Corazonadas' },
  { ruta: '/app/ia', icono: '✨', texto: 'IA' },
  { ruta: '/app/revelacion', icono: '🎁', texto: 'Revelación' },
  { ruta: '/app/perfil', icono: '👤', texto: 'Yo' }
]

onMounted(async () => {
  // Carga inicial de datos (la RLS filtra lo que no me corresponde)
  await Promise.all([pistas.cargar(), corazonadas.cargar(), ia.cargar()])
  pistas.sincronizarVistas()

  // Permiso de notificaciones: primero explicamos, luego preguntamos
  const yaPregunto = localStorage.getItem('regalo-secreto:push-preguntado')
  if (!yaPregunto && soportaPush() && estadoPermiso() === 'sin-pedir') {
    mostrarExplicacionPush.value = true
  }

  // El service worker puede pedirnos abrir una ruta (click en notificación)
  navigator.serviceWorker?.addEventListener?.('message', alRecibirMensaje)
})

onBeforeUnmount(() => {
  navigator.serviceWorker?.removeEventListener?.('message', alRecibirMensaje)
})

function alRecibirMensaje(evento) {
  if (evento.data?.tipo === 'abrir-ruta' && evento.data.ruta) router.push(evento.data.ruta)
}

/** Usuario acepta recibir notificaciones. */
async function aceptarPush() {
  localStorage.setItem('regalo-secreto:push-preguntado', '1')
  mostrarExplicacionPush.value = false
  const resultado = await activarNotificaciones()
  if (resultado === 'ok') toast.ok('¡Listo! Te avisaremos cuando toque 🎁')
  else if (resultado === 'denegado') toast.mostrar('Puedes activar las notificaciones desde la configuración de tu navegador.')
  else if (resultado === 'sin-llave') toast.mostrar('Falta la llave VAPID pública en el .env (mira el SETUP.md).')
  else if (resultado === 'no-soportado') toast.mostrar('Este navegador no soporta notificaciones push.')
  else if (resultado === 'error') toast.error('No se pudieron activar las notificaciones.')
}

/** Usuario prefiere no activarlas ahora. */
function posponerPush() {
  localStorage.setItem('regalo-secreto:push-preguntado', '1')
  mostrarExplicacionPush.value = false
}
</script>

<template>
  <div class="layout">
    <header class="cabecera">
      <div class="cabecera__marca">
        <span class="cabecera__logo">🎁</span>
        <div>
          <strong>Regalo Secreto</strong>
          <small v-if="auth.pareja">{{ auth.nombre }} &amp; {{ auth.pareja.nombre }}</small>
        </div>
      </div>

      <div class="cabecera__derecha">
        <span v-if="!revelado" class="cabecera__cuenta" title="Falta para la revelación">
          {{ dias }} d
        </span>
        <span v-else class="cabecera__cuenta cabecera__cuenta--vivo">¡Hoy! 🎉</span>
        <button class="cabecera__salir" aria-label="Cerrar sesión" @click="auth.salir(); $router.push('/')">⏻</button>
      </div>
    </header>

    <main class="layout__cuerpo">
      <router-view />
    </main>

    <!-- Menú inferior en celular -->
    <nav class="menu" aria-label="Navegación principal">
      <router-link
        v-for="p in pestanas"
        :key="p.ruta"
        :to="p.ruta"
        class="menu__item"
        :class="{ 'menu__item--activo': route.meta.pestana === p.ruta.split('/').pop() }"
      >
        <span class="menu__icono">{{ p.icono }}</span>
        <span class="menu__texto">{{ p.texto }}</span>
      </router-link>
    </nav>

    <!-- Explicación amable antes de pedir permiso de notificaciones -->
    <ModalBase :abierto="mostrarExplicacionPush" titulo="¿Te avisamos?" @cerrar="posponerPush">
      <div class="push text-center">
        <div class="push__icono">🔔</div>
        <p>
          ¿Quieres que te recordemos tus pistas? Te enviaremos un mensaje amable
          <strong>todos los días a las 7:00 p. m.</strong> si aún no has dejado la tuya, y los avisos importantes
          (una semana antes, víspera y el gran día 🎉).
        </p>
        <p class="texto-tenue">
          En iPhone solo funciona si instalas la app en la pantalla de inicio (iOS 16.4 o superior). Puedes ver la guía
          en <router-link to="/instalar">Cómo instalar la app</router-link>.
        </p>
        <div class="push__acciones">
          <button class="btn btn--ancho" @click="aceptarPush">Sí, avisarme 🔔</button>
          <button class="btn btn--secundario btn--ancho" @click="posponerPush">Ahora no, gracias</button>
        </div>
      </div>
    </ModalBase>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(74px + env(safe-area-inset-bottom));
}

.cabecera {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 1rem;
  padding-top: calc(0.7rem + env(safe-area-inset-top));
  background: rgba(20, 12, 34, 0.9);
  border-bottom: 1px solid var(--borde);
  backdrop-filter: blur(12px);
}

.cabecera__marca {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.cabecera__logo {
  font-size: 1.5rem;
  animation: latido 3s ease-in-out infinite;
}

.cabecera__marca strong {
  display: block;
  font-family: var(--fuente-titulos);
  font-size: 1.02rem;
  line-height: 1.1;
}

.cabecera__marca small {
  color: var(--texto-tenue);
  font-size: 0.75rem;
}

.cabecera__derecha {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cabecera__cuenta {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--borde);
}

.cabecera__cuenta--vivo {
  background: var(--degradado-marca);
  border: none;
}

.cabecera__salir {
  min-width: 38px;
  min-height: 38px;
  border-radius: 50%;
  border: 1px solid var(--borde);
  background: rgba(255, 255, 255, 0.07);
  cursor: pointer;
  font-size: 1rem;
}

.layout__cuerpo {
  flex: 1;
  width: min(900px, 100% - 1.6rem);
  margin: 1.2rem auto 2rem;
}

/* ---------- Menú inferior ---------- */
.menu {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 55;
  display: flex;
  justify-content: space-around;
  gap: 2px;
  padding: 6px 6px calc(6px + env(safe-area-inset-bottom));
  background: rgba(18, 10, 31, 0.96);
  border-top: 1px solid var(--borde);
  backdrop-filter: blur(14px);
}

.menu__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 2px;
  border-radius: 14px;
  text-decoration: none;
  color: var(--texto-tenue);
  font-size: 0.66rem;
  transition: all 0.2s ease;
  min-height: 54px;
  justify-content: center;
}

.menu__icono {
  font-size: 1.15rem;
  filter: grayscale(0.5) opacity(0.75);
  transition: all 0.2s ease;
}

.menu__item--activo {
  color: #fff;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04));
}

.menu__item--activo .menu__icono {
  filter: none;
  transform: translateY(-2px) scale(1.12);
}

/* ---------- Pantalla de notificaciones ---------- */
.push__icono {
  font-size: 3rem;
  animation: latido 2s ease-in-out infinite;
}

.push__acciones {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 1.2rem;
}

.text-center {
  text-align: center;
}

@media (min-width: 860px) {
  .layout {
    padding-bottom: 0;
    padding-left: 92px;
  }
  .menu {
    top: 0;
    left: 0;
    right: auto;
    bottom: 0;
    width: 92px;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    padding: 1rem 8px;
    border-top: none;
    border-right: 1px solid var(--borde);
  }
  .menu__item {
    min-height: 66px;
  }
}
</style>

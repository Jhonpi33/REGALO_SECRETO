<script setup>
/**
 * Fondo de video con los recuerdos de la pareja.
 *  · Dos clips que se alternan con un fundido suave.
 *  · Encima va un velo de degradado rosa ↔ azul para que los colores
 *    de la app se integren con el video y el texto se lea bien.
 *  · Si la persona prefiere menos movimiento o ahorra datos,
 *    se queda en el póster estático (sin reproducir).
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { VIDEOS_FONDO } from '../data/videos'

defineProps({
  /** Más velo oscuro → el texto de encima se lee mejor. */
  denso: { type: Boolean, default: false }
})

const activo = ref(0)
const reproduciendo = ref(false)
const caido = ref(false)
const elementos = []
let temporizador = null

function guardarVideo(el, i) {
  if (el) elementos[i] = el
}

/** Cambia al siguiente clip: lo reproduce y pausa el anterior tras el fundido. */
function cambiarClip() {
  const saliendo = elementos[activo.value]
  activo.value = (activo.value + 1) % VIDEOS_FONDO.length
  elementos[activo.value]?.play?.().catch(() => {})
  setTimeout(() => saliendo?.pause?.(), 2600)
}

onMounted(() => {
  const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const ahorroDatos = Boolean(navigator.connection?.saveData)

  if (!menosMovimiento && !ahorroDatos && !caido.value) {
    reproduciendo.value = true
    elementos[0]?.play?.().catch(() => {})

    if (VIDEOS_FONDO.length > 1) {
      temporizador = setInterval(cambiarClip, 9000)
    }
  }
})

onBeforeUnmount(() => {
  if (temporizador) clearInterval(temporizador)
})
</script>

<template>
  <div class="fondo-video" :class="{ 'fondo-video--denso': denso }" aria-hidden="true">
    <video
      v-for="(clip, i) in VIDEOS_FONDO"
      :key="clip.src"
      :ref="(el) => guardarVideo(el, i)"
      class="fondo-video__clip"
      :class="{ 'fondo-video__clip--activo': i === activo && reproduciendo && !caido }"
      :poster="clip.poster"
      :src="clip.src"
      muted
      playsinline
      loop
      preload="metadata"
      disablepictureinpicture
      @error="caido = true"
    />

    <!-- Velo de colores: rosa (Majo) arriba a la izquierda, azul (Jhon) arriba a la derecha -->
    <div class="fondo-video__tinte" />
  </div>
</template>

<style scoped>
.fondo-video {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background-color: #160d26;
  /* Si el video no carga, se ve el póster del primer clip */
  background-image: url('/videos/poster-01.jpg');
  background-size: cover;
  background-position: center;
}

.fondo-video__clip {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Suaviza el reescalado y mezcla los tonos con la app */
  filter: saturate(1.05) contrast(1.02) blur(2px);
  transform: scale(1.05);
  opacity: 0;
  transition: opacity 2.4s ease;
}

.fondo-video__clip--activo {
  opacity: 0.62;
}

.fondo-video--denso .fondo-video__clip--activo {
  opacity: 0.5;
}

/* En pantallas pequeñas se difumina un poco más (legibilidad + rendimiento) */
@media (max-width: 700px) {
  .fondo-video__clip {
    filter: saturate(1.05) blur(5px);
  }
}

.fondo-video__tinte {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1100px 620px at 12% -8%, rgba(255, 139, 189, 0.55), transparent 62%),
    radial-gradient(950px 640px at 88% 4%, rgba(61, 139, 253, 0.5), transparent 62%),
    radial-gradient(700px 520px at 50% 108%, rgba(176, 71, 156, 0.45), transparent 66%),
    linear-gradient(180deg, rgba(24, 14, 40, 0.55) 0%, rgba(22, 13, 38, 0.74) 45%, rgba(14, 22, 45, 0.92) 100%);
}

/* Más velo cuando encima hay mucho texto (login, modales) */
.fondo-video--denso .fondo-video__tinte {
  background:
    radial-gradient(700px 700px at 8% 12%, rgba(255, 139, 189, 0.62), transparent 66%),
    radial-gradient(700px 700px at 92% 12%, rgba(61, 139, 253, 0.58), transparent 66%),
    linear-gradient(180deg, rgba(20, 12, 34, 0.72) 0%, rgba(20, 12, 34, 0.86) 55%, rgba(14, 20, 42, 0.95) 100%);
}

/* Si la persona no quiere movimiento: se queda en el póster */
@media (prefers-reduced-motion: reduce) {
  .fondo-video__clip {
    display: none;
  }
}
</style>

<script setup>
/**
 * Fondo con partículas, destellos y confeti sutil.
 * Se genera en el cliente para no pesar en el bundle.
 */
import { ref } from 'vue'

const cantidad = 26

/** Posiciones y tiempos aleatorios (se generan una sola vez). */
const particulas = Array.from({ length: cantidad }, (_, i) => ({
  id: i,
  izquierda: Math.random() * 100,
  arriba: Math.random() * 100,
  tamano: 6 + Math.random() * 14,
  duracion: 4 + Math.random() * 6,
  retraso: Math.random() * 6,
  opacidad: 0.25 + Math.random() * 0.5,
  esCorazon: i % 5 === 0
}))

const confeti = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  izquierda: Math.random() * 100,
  duracion: 9 + Math.random() * 8,
  retraso: Math.random() * 10,
  color: ['#ff8bbd', '#ffd98a', '#7fc3ff', '#ffffff', '#c084fc'][i % 5],
  giro: Math.random() * 720 - 360
}))

const activo = ref(true)
</script>

<template>
  <div class="fondo" aria-hidden="true">
    <span
      v-for="p in particulas"
      :key="'p' + p.id"
      class="particula"
      :class="{ 'particula--corazon': p.esCorazon }"
      :style="{
        left: p.izquierda + '%',
        top: p.arriba + '%',
        width: p.tamano + 'px',
        height: p.tamano + 'px',
        animationDuration: p.duracion + 's',
        animationDelay: p.retraso + 's',
        opacity: p.opacidad
      }"
    />

    <span
      v-for="c in confeti"
      :key="'c' + c.id"
      class="confeti"
      :style="{
        left: c.izquierda + '%',
        backgroundColor: c.color,
        animationDuration: c.duracion + 's',
        animationDelay: c.retraso + 's',
        '--giro': c.giro + 'deg'
      }"
    />
  </div>
</template>

<style scoped>
.fondo {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.particula {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff, rgba(255, 255, 255, 0));
  animation-name: parpadear;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
}

.particula--corazon {
  background: none;
  font-size: 14px;
  line-height: 1;
}

.particula--corazon::after {
  content: '💕';
}

.confeti {
  position: absolute;
  top: -20px;
  width: 8px;
  height: 14px;
  border-radius: 2px;
  opacity: 0.5;
  animation-name: caer;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
}

@keyframes parpadear {
  0%,
  100% {
    transform: translateY(0) scale(0.85);
  }
  50% {
    transform: translateY(-18px) scale(1.15);
  }
}

@keyframes caer {
  0% {
    transform: translateY(-20px) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(105vh) rotate(var(--giro));
    opacity: 0;
  }
}
</style>

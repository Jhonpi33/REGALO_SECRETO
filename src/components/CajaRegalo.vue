<script setup>
/**
 * Caja de regalo animada (SVG).
 * Se mueve suavemente y "se abre" al pasar el mouse o al tocarla.
 * Con  abierta  se queda abierta (usada en la revelación).
 */
import { ref, computed } from 'vue'

const props = defineProps({
  abierta: { type: Boolean, default: false },
  animar: { type: Boolean, default: true }
})

const tocada = ref(false)
const abierta = computed(() => props.abierta || tocada.value)

function alternar() {
  if (props.abierta) return
  tocada.value = !tocada.value
}
</script>

<template>
  <div
    class="caja"
    :class="{ 'caja--flota': animar, 'caja--abierta': abierta }"
    role="button"
    tabindex="0"
    :aria-label="abierta ? 'Caja de regalo abierta' : 'Toca la caja de regalo'"
    @click="alternar"
    @keydown.enter="alternar"
    @keydown.space.prevent="alternar"
    @mouseenter="tocada = true"
    @mouseleave="tocada = false"
  >
    <!-- Destellos que salen cuando se abre -->
    <div class="caja__destellos" aria-hidden="true">
      <span v-for="n in 8" :key="n" class="destello" :style="{ '--i': n }">
        {{ n % 3 === 0 ? '💕' : n % 3 === 1 ? '✨' : '⭐' }}
      </span>
    </div>

    <svg viewBox="0 0 220 210" class="caja__svg" aria-hidden="true">
      <defs>
        <linearGradient id="regaloCuerpo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff8bbd" />
          <stop offset="55%" stop-color="#e0559b" />
          <stop offset="100%" stop-color="#3d8bfd" />
        </linearGradient>
        <linearGradient id="regaloCinta" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffe9b8" />
          <stop offset="100%" stop-color="#ffd98a" />
        </linearGradient>
        <linearGradient id="regaloTapa" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffa6cc" />
          <stop offset="50%" stop-color="#e0559b" />
          <stop offset="100%" stop-color="#4a90ff" />
        </linearGradient>
        <radialGradient id="brilloInterno" cx="50%" cy="50%">
          <stop offset="0%" stop-color="#fff6d8" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#ffd98a" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Sombra -->
      <ellipse cx="110" cy="192" rx="74" ry="12" fill="rgba(0,0,0,.35)" />

      <!-- Resplandor interior (solo cuando se abre) -->
      <ellipse class="caja__luz" cx="110" cy="112" rx="72" ry="46" fill="url(#brilloInterno)" />

      <!-- Cuerpo de la caja -->
      <g class="caja__cuerpo">
        <rect x="42" y="104" width="136" height="84" rx="10" fill="url(#regaloCuerpo)" />
        <rect x="42" y="104" width="136" height="84" rx="10" fill="rgba(255,255,255,.14)" />
        <!-- Cinta vertical -->
        <rect x="98" y="104" width="24" height="84" fill="url(#regaloCinta)" />
        <rect x="98" y="104" width="8" height="84" fill="rgba(255,255,255,.45)" />
      </g>

      <!-- Tapa (se levanta al abrir) -->
      <g class="caja__tapa">
        <rect x="32" y="76" width="156" height="34" rx="9" fill="url(#regaloTapa)" />
        <rect x="32" y="76" width="156" height="12" rx="6" fill="rgba(255,255,255,.35)" />
        <rect x="98" y="76" width="24" height="34" fill="url(#regaloCinta)" />
        <!-- Lazos -->
        <path
          d="M110 78 C 84 78, 74 56, 92 50 C 106 46, 110 66, 110 78 Z"
          fill="url(#regaloCinta)"
          stroke="rgba(255,255,255,.5)"
          stroke-width="2"
        />
        <path
          d="M110 78 C 136 78, 146 56, 128 50 C 114 46, 110 66, 110 78 Z"
          fill="url(#regaloCinta)"
          stroke="rgba(255,255,255,.5)"
          stroke-width="2"
        />
        <circle cx="110" cy="76" r="7" fill="#ffe9b8" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.caja {
  position: relative;
  width: min(300px, 72vw);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.caja--flota {
  animation: flotar 4.5s ease-in-out infinite;
}

.caja__svg {
  width: 100%;
  height: auto;
  overflow: visible;
  filter: drop-shadow(0 18px 30px rgba(224, 85, 155, 0.35));
}

/* La tapa se levanta con un rebote suave */
.caja__tapa {
  transform-origin: 110px 100px;
  transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.caja--abierta .caja__tapa {
  transform: translateY(-34px) rotate(-7deg);
}

.caja__luz {
  opacity: 0;
  transition: opacity 0.5s ease;
}

.caja--abierta .caja__luz {
  opacity: 1;
}

/* Destellos que brotan al abrir */
.caja__destellos {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.destello {
  position: absolute;
  left: 50%;
  top: 42%;
  font-size: 1.1rem;
  opacity: 0;
  transform: translate(-50%, -50%);
}

.caja--abierta .destello {
  animation: brotar 1.1s ease-out infinite;
  animation-delay: calc(var(--i) * 0.12s);
}

.destello:nth-child(1) { --x: -90px; --y: -70px; }
.destello:nth-child(2) { --x: 80px; --y: -80px; }
.destello:nth-child(3) { --x: -120px; --y: -20px; }
.destello:nth-child(4) { --x: 130px; --y: -10px; }
.destello:nth-child(5) { --x: -50px; --y: -120px; }
.destello:nth-child(6) { --x: 45px; --y: -130px; }
.destello:nth-child(7) { --x: -150px; --y: 30px; }
.destello:nth-child(8) { --x: 150px; --y: 40px; }

@keyframes brotar {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.4);
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.35) rotate(25deg);
  }
}
</style>

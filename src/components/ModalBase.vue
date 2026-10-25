<script setup>
/**
 * Modal sencillo accesible: cierra con la tecla Escape, con el botón
 * o tocando fuera. Pensado para celular (ocupa casi toda la pantalla).
 */
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  abierto: { type: Boolean, default: false },
  titulo: { type: String, default: '' }
})
const emit = defineEmits(['cerrar'])

function alPulsar(e) {
  if (e.key === 'Escape' && props.abierto) emit('cerrar')
}

watch(
  () => props.abierto,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
  }
)

window.addEventListener('keydown', alPulsar)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', alPulsar)
  document.body.style.overflow = ''
})
</script>

<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="abierto" class="modal" role="dialog" aria-modal="true" :aria-label="titulo" @click.self="emit('cerrar')">
        <div class="modal__hoja">
          <header class="modal__cabecera">
            <h2>{{ titulo }}</h2>
            <button class="modal__cerrar" aria-label="Cerrar" @click="emit('cerrar')">✕</button>
          </header>
          <div class="modal__cuerpo">
            <slot />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(8, 4, 16, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal__hoja {
  width: min(560px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  background: linear-gradient(180deg, #241539, #1a0f2c);
  border: 1px solid var(--borde);
  border-radius: 26px 26px 0 0;
  padding: 1.1rem 1.15rem calc(1.4rem + env(safe-area-inset-bottom));
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.5);
}

.modal__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
}

.modal__cabecera h2 {
  font-size: 1.2rem;
  margin: 0;
}

.modal__cerrar {
  min-width: 40px;
  min-height: 40px;
  border-radius: 50%;
  border: 1px solid var(--borde);
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
}

@media (min-width: 640px) {
  .modal {
    align-items: center;
    padding: 2rem;
  }
  .modal__hoja {
    border-radius: 26px;
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>

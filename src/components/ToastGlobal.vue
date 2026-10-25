<script setup>
// Mensajes flotantes globales (toasts).
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <transition-group name="toast">
      <div v-for="m in toast.mensajes" :key="m.id" class="toast" :class="'toast--' + m.tipo" @click="toast.quitar(m.id)">
        <span>{{ m.tipo === 'ok' ? '✅' : m.tipo === 'error' ? '⚠️' : '💡' }}</span>
        {{ m.texto }}
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: calc(84px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(420px, calc(100vw - 2rem));
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.8rem 1rem;
  border-radius: 14px;
  background: rgba(24, 14, 40, 0.95);
  border: 1px solid var(--borde);
  box-shadow: var(--sombra);
  font-size: 0.92rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.toast--ok {
  border-color: rgba(74, 222, 128, 0.5);
}
.toast--error {
  border-color: rgba(251, 113, 133, 0.55);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}
</style>

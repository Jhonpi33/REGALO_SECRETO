<script setup>
// App.vue — raíz de la aplicación.
// Aplica el tema visual según el perfil del usuario que inició sesión
// y deja en el body la clase base del tema (rosa / azul).
import { computed, onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import AvisosBanners from './components/AvisosBanners.vue'
import ToastGlobal from './components/ToastGlobal.vue'

const auth = useAuthStore()

const claseTema = computed(() => {
  if (!auth.perfil) return ''
  return auth.perfil.tema === 'azul' ? 'tema-azul' : 'tema-rosa'
})

onMounted(async () => {
  await auth.inicializar()
})
</script>

<template>
  <div class="app-raiz" :class="claseTema">
    <AvisosBanners />
    <router-view v-slot="{ Component }">
      <transition name="vista" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <ToastGlobal />
  </div>
</template>

<style scoped>
.app-raiz {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* Transición suave entre pantallas */
.vista-enter-active,
.vista-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.vista-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.vista-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

<script setup>
/**
 * Banners dentro de la app con los mismos avisos de las notificaciones
 * (respaldo por si push no llega).
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useAvisosStore } from '../stores/avisos'

const avisos = useAvisosStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

/** Carta de perdón sin responder (respaldo si no llegó el push). */
const cartaPendiente = ref(null)

watch(
  () => [auth.listo, auth.usuario?.id],
  async ([listo, id]) => {
    if (!listo || !id) return
    const { data } = await supabase
      .from('perdones')
      .select('id, estado, para_id, de_id, creada_en')
      .eq('estado', 'pendiente')
      .order('creada_en', { ascending: false })
      .limit(1)
      .maybeSingle()
    cartaPendiente.value = data && data.para_id === id ? data : null
  },
  { immediate: true }
)

/** No mostrar el banner cuando la carta ya está abierta. */
const noEstoyEnLaCarta = computed(() => route.name !== 'perdon')

function ir(ruta) {
  router.push(ruta)
}
</script>

<template>
  <div class="banners" role="status">
    <transition-group name="banner">
      <div v-for="a in avisos.visibles" :key="a.id" class="banner">
        <span class="banner__emoji">{{ a.emoji }}</span>
        <p class="banner__texto">{{ a.texto }}</p>
        <button class="btn btn--peq" @click="ir(a.accion.ruta)">{{ a.accion.nombre }}</button>
        <button class="banner__cerrar" aria-label="Cerrar aviso" @click="avisos.descartar(a.id)">✕</button>
      </div>
      <!-- Respaldo de la carta de perdón (si no llegó el push) -->
      <div v-if="cartaPendiente && noEstoyEnLaCarta" key="carta-perdon" class="banner banner--carta">
        <span class="banner__emoji">💌</span>
        <p class="banner__texto">Alguien te escribió una carta y quiere que le respondas 💕</p>
        <button class="btn btn--peq" @click="ir('/app/perdon')">Abrirla</button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.banners {
  position: fixed;
  top: calc(8px + env(safe-area-inset-top));
  left: 0;
  right: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px;
  pointer-events: none;
}

.banner {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.75rem;
  background: linear-gradient(100deg, rgba(35, 18, 56, 0.97), rgba(52, 25, 74, 0.97));
  border: 1px solid var(--color-primario);
  border-radius: 16px;
  box-shadow: var(--sombra);
  backdrop-filter: blur(12px);
}

.banner--carta {
  border-color: var(--color-primario);
  background: linear-gradient(100deg, rgba(66, 24, 52, 0.97), rgba(45, 27, 74, 0.97));
}

.banner__emoji {
  font-size: 1.3rem;
  animation: latido 2s ease-in-out infinite;
}

.banner__texto {
  flex: 1;
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.35;
}

.banner__cerrar {
  background: transparent;
  border: none;
  color: var(--texto-tenue);
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0.3rem;
  min-width: 32px;
  min-height: 32px;
}

.banner-enter-active,
.banner-leave-active {
  transition: all 0.35s ease;
}
.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}
</style>

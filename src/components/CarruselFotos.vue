<script setup>
/**
 * Galería / carrusel de fotos de la pareja.
 * Lee  src/data/fotos.js — ahí solo agregas los nombres de tus archivos.
 * Funciona bien con entre 3 y 12 fotos.
 */
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { FOTOS, urlFoto } from '../data/fotos'

const pista = ref(null)
const indice = ref(0)
const pausado = ref(false)
let temporizador = null

const hayFotos = computed(() => FOTOS.length > 0)

/** Avanza al siguiente foto (cíclico). */
async function siguiente(paso = 1) {
  if (!pista.value || !FOTOS.length) return
  indice.value = (indice.value + paso + FOTOS.length) % FOTOS.length
  await nextTick()
  const hijo = pista.value.children[indice.value]
  hijo?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
}

function arrancarAuto() {
  detener()
  if (FOTOS.length < 2) return
  temporizador = setInterval(() => {
    if (!pausado.value) siguiente(1)
  }, 4200)
}

function detener() {
  if (temporizador) clearInterval(temporizador)
  temporizador = null
}

/** Mantén el índice sincronizado si la persona desliza a mano. */
function alHacerScroll() {
  if (!pista.value) return
  const ancho = pista.value.children[0]?.offsetWidth ?? 1
  const margen = pista.value.scrollLeft + pista.value.clientWidth / 2
  indice.value = Math.min(FOTOS.length - 1, Math.max(0, Math.round(margen / ancho - 0.5)))
}

onMounted(async () => {
  await nextTick()
  arrancarAuto()
})
onBeforeUnmount(detener)
</script>

<template>
  <section class="galeria" aria-label="Fotos de Jhon y Majo">
    <div
      ref="pista"
      class="galeria__pista"
      @scroll="alHacerScroll"
      @mouseenter="pausado = true"
      @mouseleave="pausado = false"
      @touchstart="pausado = true"
      @touchend="pausado = false"
    >
      <!-- Sin fotos: placeholder bonito -->
      <figure v-if="!hayFotos" class="foto foto--placeholder">
        <div class="foto__marco">
          <span>📷</span>
          <p>Aquí van vuestras fotos</p>
        </div>
      </figure>

      <figure v-for="(foto, i) in FOTOS" :key="foto.archivo" class="foto" :class="{ 'foto--activa': i === indice }">
        <div class="foto__marco">
          <img
            :src="urlFoto(foto)"
            :alt="foto.pie || 'Foto de la pareja'"
            loading="lazy"
            decoding="async"
            @error="($event.target.style.display = 'none')"
          />
          <span class="foto__corazon">💖</span>
        </div>
        <figcaption v-if="foto.pie" class="foto__pie">{{ foto.pie }}</figcaption>
      </figure>
    </div>

    <!-- Puntos indicadores -->
    <div v-if="FOTOS.length > 1" class="galeria__puntos">
      <button
        v-for="(f, i) in FOTOS"
        :key="f.archivo"
        class="punto"
        :class="{ 'punto--activo': i === indice }"
        :aria-label="`Ver foto ${i + 1}`"
        @click="siguiente(i - indice)"
      />
    </div>
  </section>
</template>

<style scoped>
.galeria {
  width: 100%;
}

.galeria__pista {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 6px calc(50% - 130px) 10px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.galeria__pista::-webkit-scrollbar {
  display: none;
}

.foto {
  flex: 0 0 auto;
  width: min(74vw, 260px);
  scroll-snap-align: center;
  margin: 0;
  transition: transform 0.4s ease, opacity 0.4s ease;
  opacity: 0.6;
  transform: scale(0.92);
}

.foto--activa {
  opacity: 1;
  transform: scale(1);
}

.foto__marco {
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: 22px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
  border: 3px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.4);
  display: grid;
  place-items: center;
}

.foto__marco img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.foto__corazon {
  position: absolute;
  right: 10px;
  bottom: 10px;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5));
  animation: latido 2.4s ease-in-out infinite;
}

.foto__pie {
  margin-top: 0.55rem;
  text-align: center;
  font-size: 0.86rem;
  color: var(--texto-tenue);
}

.foto--placeholder .foto__marco {
  aspect-ratio: 4 / 5;
  flex-direction: column;
  gap: 0.5rem;
  color: var(--texto-tenue);
  text-align: center;
}

.foto--placeholder span {
  font-size: 2.4rem;
}

.galeria__puntos {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}

.punto {
  width: 9px;
  height: 9px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.25s ease;
}

.punto--activo {
  width: 26px;
  border-radius: 999px;
  background: var(--degradado-marca);
}
</style>

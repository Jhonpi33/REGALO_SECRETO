<script setup>
/**
 * Pantalla de la revelación.
 *  · Hasta el 20/11/2026 00:00 (Bogotá): bloqueada, caja cerrada + cuenta regresiva.
 *  · Desde esa fecha: animación de apertura con confeti y todo lo privado a la vista.
 * La visibilidad por fecha también está forzada en la base de datos (RLS).
 */
import { ref, computed, watch, onMounted } from 'vue'
import { usePistasStore } from '../stores/pistas'
import { useCorazonadasStore } from '../stores/corazonadas'
import { useIAStore } from '../stores/ia'
import { useAuthStore } from '../stores/auth'
import { useRevelacion } from '../composables/useRevelacion'
import { etiquetaDia, emojiNivel, ESTADOS_REGALO, formatoCOP, MINIMO_PISTAS_PARA_IA } from '../data/constantes'
import CajaRegalo from '../components/CajaRegalo.vue'
import CuentaRegresiva from '../components/CuentaRegresiva.vue'
import ParticulasFondo from '../components/ParticulasFondo.vue'
import PistaCard from '../components/PistaCard.vue'

const pistas = usePistasStore()
const corazonadas = useCorazonadasStore()
const ia = useIAStore()
const auth = useAuthStore()
const { revelado, fechaLarga } = useRevelacion()

const abriendo = ref(false)
const yaMostreApertura = ref(sessionStorage.getItem('regalo-secreto:apertura-vista') === '1')

onMounted(async () => {
  await Promise.all([pistas.cargar(), corazonadas.cargar(), ia.cargar()])
})

// Cuando llega la fecha, disparamos la animación de apertura una sola vez
watch(
  revelado,
  (v) => {
    if (v && !yaMostreApertura.value) reproducirApertura()
  },
  { immediate: true }
)

function reproducirApertura() {
  abriendo.value = true
  sessionStorage.setItem('regalo-secreto:apertura-vista', '1')
  yaMostreApertura.value = true
  setTimeout(() => (abriendo.value = false), 3200)
}

const misPistas = computed(() => pistas.mias)
const pistasPareja = computed(() => pistas.dePareja)

const miCorazonada = computed(() => corazonadas.mia)
const corazonadaPareja = computed(() => corazonadas.deLaPareja)

/** Regalo real de mi pareja (lo que escribió en su corazonada). */
const regaloPareja = computed(() => corazonadaPareja.value?.regalo_elegido ?? null)

/** Última respuesta de la IA sobre las pistas de mi pareja (para comparar). */
const ultimaIA = computed(() => ia.historial[0]?.respuesta_json?.ideas?.[0] ?? null)

/** Frase divertida de "¿Cuánto nos conocemos?". */
const veredicto = computed(() => {
  if (!ultimaIA.value || !regaloPareja.value) return null
  const idea = ultimaIA.value.idea.toLowerCase()
  const real = regaloPareja.value.toLowerCase()
  const coincide = idea.split(/\s+/).some((p) => p.length > 4 && real.includes(p))
  return coincide
    ? { emoji: '🎯', texto: '¡La IA casi le atina! Estamos muy conectados.' }
    : { emoji: '😅', texto: 'La IA se equivocó… pero la sorpresa es parte del encanto.' }
})

/** Agrupa las pistas por día (hora Bogotá) para mostrarlas en la pantalla final. */
function agrupar(lista) {
  const mapa = new Map()
  for (const p of lista) {
    const clave = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Bogota'
    }).format(new Date(p.creada_en))
    if (!mapa.has(clave)) mapa.set(clave, [])
    mapa.get(clave).push(p)
  }
  return [...mapa.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([clave, items]) => ({ clave, pistas: items }))
}

</script>

<template>
  <div class="revelacion">
    <ParticulasFondo v-if="revelado" />

    <!-- ============ BLOQUEADA ============ -->
    <section v-if="!revelado" class="bloqueada">
      <span class="etiqueta">🔒 Secreto a resguardo</span>
      <h1>La revelación</h1>
      <p class="texto-tenue">
        Todavía no podemos abrir los regalos. Guardamos todo en secreto — las pistas, las corazonadas y lo que cada
        uno decidió regalar.
      </p>

      <div class="bloqueada__caja">
        <CajaRegalo />
      </div>

      <CuentaRegresiva />

      <p class="bloqueada__nota">
        Se abre el <strong>{{ fechaLarga }}</strong> a las 00:00, hora de Bogotá 🕛
      </p>

      <router-link class="btn btn--secundario" to="/app/pistas">Seguir dejando pistas</router-link>
    </section>

    <!-- ============ ABIERTA ============ -->
    <section v-else class="abierta">
      <!-- Animación de apertura -->
      <transition name="apertura">
        <div v-if="abriendo" class="apertura">
          <CajaRegalo :abierta="true" />
          <p class="apertura__texto">¡Se abrió!</p>
          <div class="confeti" aria-hidden="true">
            <span v-for="n in 60" :key="n" class="confeti__pedazo" :style="{ '--n': n }" />
          </div>
        </div>
      </transition>

      <header class="abierta__cabecera">
        <span class="abierta__emoji">🎉</span>
        <h1>¡Nos descubrimos!</h1>
        <p class="texto-tenue">Todo lo que estuvo en secreto ahora está a la vista 💖</p>
      </header>

      <!-- ---------- ¿Cuánto nos conocemos? ---------- -->
      <section class="tarjeta veredicto">
        <h2>¿Cuánto nos conocemos? 🎯</h2>

        <div class="veredicto__columnas">
          <div>
            <span class="etiqueta">Lo que decía la IA</span>
            <p v-if="ultimaIA">{{ ultimaIA.idea }}</p>
            <p v-else class="texto-tenue">
              {{ pistasPareja.length >= MINIMO_PISTAS_PARA_IA ? 'No se pidieron consultas a la IA.' : 'No había pistas suficientes para la IA.' }}
            </p>
          </div>
          <div class="veredicto__flecha">➡️</div>
          <div>
            <span class="etiqueta">El regalo real</span>
            <p v-if="regaloPareja">{{ regaloPareja }}</p>
            <p v-else class="texto-tenue">{{ auth.pareja?.nombre ?? 'Tu pareja' }} no escribió su regalo.</p>
          </div>
        </div>

        <p v-if="veredicto" class="veredicto__frase">
          <span>{{ veredicto.emoji }}</span> {{ veredicto.texto }}
        </p>
      </section>

      <!-- ---------- Lo que cada uno guardaba ---------- -->
      <section class="tarjeta corazones">
        <h2>Lo que cada uno guardaba 💭</h2>

        <div class="corazones__columnas">
          <article class="corazon">
            <h3>{{ auth.nombre }} 💖</h3>
            <span class="etiqueta">Teoría</span>
            <p>{{ miCorazonada?.teoria || 'Sin teoría escrita.' }}</p>
            <span class="etiqueta">Regalo elegido</span>
            <p>
              {{ miCorazonada?.regalo_elegido || 'Sin definir.' }}
              <template v-if="miCorazonada?.presupuesto_cop"> · {{ formatoCOP(miCorazonada.presupuesto_cop) }}</template>
            </p>
            <p v-if="miCorazonada?.estado" class="corazon__estado">
              {{
                ESTADOS_REGALO.find((e) => e.id === miCorazonada.estado)?.emoji
              }}
              {{ ESTADOS_REGALO.find((e) => e.id === miCorazonada.estado)?.nombre }}
            </p>
          </article>

          <article class="corazon">
            <h3>{{ auth.pareja?.nombre ?? 'Tu pareja' }} 💙</h3>
            <span class="etiqueta">Teoría</span>
            <p>{{ corazonadaPareja?.teoria || 'Sin teoría escrita.' }}</p>
            <span class="etiqueta">Regalo elegido</span>
            <p>
              {{ corazonadaPareja?.regalo_elegido || 'Sin definir.' }}
              <template v-if="corazonadaPareja?.presupuesto_cop"> · {{ formatoCOP(corazonadaPareja.presupuesto_cop) }}</template>
            </p>
            <p v-if="corazonadaPareja?.estado" class="corazon__estado">
              {{
                ESTADOS_REGALO.find((e) => e.id === corazonadaPareja.estado)?.emoji
              }}
              {{ ESTADOS_REGALO.find((e) => e.id === corazonadaPareja.estado)?.nombre }}
            </p>
          </article>
        </div>
      </section>

      <!-- ---------- Todas las pistas ---------- -->
      <section class="tarjeta pistas-finales">
        <h2>Todas las pistas 🗝️</h2>

        <div class="pistas-finales__columnas">
          <div>
            <h3 class="pistas-finales__titulo">Las de {{ auth.nombre }}</h3>
            <p v-if="!misPistas.length" class="texto-tenue">No quedaron pistas.</p>
            <div v-for="grupo in agrupar(misPistas)" :key="grupo.clave">
              <h4 class="pistas-finales__dia">{{ etiquetaDia(grupo.clave) }}</h4>
              <PistaCard v-for="p in grupo.pistas" :key="p.id" :pista="p" modo="solo-lectura" />
            </div>
          </div>

          <div>
            <h3 class="pistas-finales__titulo">Las de {{ auth.pareja?.nombre ?? 'tu pareja' }}</h3>
            <p v-if="!pistasPareja.length" class="texto-tenue">No quedaron pistas.</p>
            <div v-for="grupo in agrupar(pistasPareja)" :key="grupo.clave">
              <h4 class="pistas-finales__dia">{{ etiquetaDia(grupo.clave) }}</h4>
              <PistaCard v-for="p in grupo.pistas" :key="p.id" :pista="p" modo="solo-lectura" />
            </div>
          </div>
        </div>
      </section>

      <p class="abierta__final">💖 Gracias por jugar conmigo. Ya puedo descansar de adivinar… hasta el próximo secreto.</p>
    </section>
  </div>
</template>

<style scoped>
.revelacion {
  position: relative;
  min-height: 70vh;
}

/* ---------- Bloqueada ---------- */
.bloqueada {
  text-align: center;
  padding: 1rem 0 2rem;
}

.bloqueada h1 {
  font-size: clamp(1.8rem, 9vw, 2.6rem);
}

.bloqueada__caja {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0;
}

.bloqueada__caja :deep(.caja) {
  width: min(240px, 62vw);
}

.bloqueada__nota {
  margin: 1rem 0 1.4rem;
  font-size: 0.92rem;
  color: var(--texto-tenue);
}

.bloqueada__nota strong {
  color: var(--color-acento);
}

/* ---------- Abierta ---------- */
.abierta__cabecera {
  text-align: center;
  margin-bottom: 1.4rem;
}

.abierta__emoji {
  font-size: 3rem;
  display: block;
  animation: latido 1.6s ease-in-out infinite;
}

.abierta__cabecera h1 {
  font-size: clamp(1.9rem, 9vw, 2.8rem);
  background: linear-gradient(100deg, #ff8bbd, #ffd98a 45%, #7fc3ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.abierta section.tarjeta {
  margin-bottom: 1.1rem;
}

.tarjeta h2 {
  font-size: 1.2rem;
  margin-bottom: 0.9rem;
}

/* ---------- Veredicto ---------- */
.veredicto__columnas {
  display: grid;
  gap: 0.7rem;
}

.veredicto__columnas p {
  font-size: 0.95rem;
  margin: 0.3rem 0 0;
}

.veredicto__flecha {
  display: none;
  font-size: 1.5rem;
}

.veredicto__frase {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.7rem;
  background: rgba(255, 217, 138, 0.12);
  border: 1px dashed rgba(255, 217, 138, 0.45);
  border-radius: 12px;
  font-weight: 600;
}

.veredicto__frase span {
  font-size: 1.5rem;
}

/* ---------- Corazones ---------- */
.corazones__columnas {
  display: grid;
  gap: 0.9rem;
}

.corazon {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--borde);
  border-radius: 16px;
  padding: 0.9rem;
}

.corazon h3 {
  font-size: 1rem;
  margin-bottom: 0.6rem;
}

.corazon p {
  font-size: 0.9rem;
  margin: 0.3rem 0 0.8rem;
}

.corazon__estado {
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.82rem;
}

/* ---------- Pistas finales ---------- */
.pistas-finales__columnas {
  display: grid;
  gap: 1.2rem;
}

.pistas-finales__titulo {
  font-size: 1.05rem;
  margin-bottom: 0.5rem;
}

.pistas-finales__dia {
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-acento);
  margin: 0.9rem 0 0.5rem;
}

.abierta__final {
  text-align: center;
  color: var(--texto-tenue);
  font-size: 0.95rem;
  margin-top: 1.6rem;
}

/* ---------- Animación de apertura + confeti ---------- */
.apertura {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  background: rgba(10, 5, 20, 0.92);
  backdrop-filter: blur(8px);
}

.apertura :deep(.caja) {
  width: min(300px, 70vw);
}

.apertura__texto {
  position: absolute;
  bottom: 26%;
  font-family: var(--fuente-titulos);
  font-size: clamp(1.6rem, 8vw, 2.6rem);
  color: var(--color-acento-2);
  text-shadow: 0 6px 30px rgba(255, 217, 138, 0.6);
}

.confeti {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.confeti__pedazo {
  position: absolute;
  left: calc(50% + (var(--n) * 7px) - 210px);
  top: 45%;
  width: 9px;
  height: 15px;
  background: hsl(calc(var(--n) * 37), 90%, 65%);
  border-radius: 2px;
  animation: estallar 2.6s ease-out forwards;
  animation-delay: calc(var(--n) * 0.035s);
}

@keyframes estallar {
  0% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(calc((var(--n) - 30) * 14px), calc(60vh + var(--n) * 6px)) rotate(720deg);
    opacity: 0;
  }
}

.apertura-leave-active {
  transition: opacity 0.6s ease;
}
.apertura-leave-to {
  opacity: 0;
}

@media (min-width: 700px) {
  .veredicto__columnas {
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
  }
  .veredicto__flecha {
    display: block;
  }
  .corazones__columnas,
  .pistas-finales__columnas {
    grid-template-columns: 1fr 1fr;
  }
}
</style>

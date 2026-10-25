<script setup>
/**
 * IA — "¿Qué querrá mi pareja?"
 * Toma todas las pistas de mi pareja (categoría + nivel) y un presupuesto
 * opcional, y llama a una Edge Function que invoca a Claude.
 * El límite de consultas (5 por día) lo valida también la base de datos.
 */
import { ref, computed, onMounted } from 'vue'
import { usePistasStore } from '../stores/pistas'
import { useIAStore } from '../stores/ia'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import { LIMITE_CONSULTAS_IA_DIA, MINIMO_PISTAS_PARA_IA, formatoCOP } from '../data/constantes'

const pistas = usePistasStore()
const ia = useIAStore()
const auth = useAuthStore()
const toast = useToastStore()

const presupuesto = ref('')
const pregunta = ref('')

const suficientes = computed(() => pistas.dePareja.length >= MINIMO_PISTAS_PARA_IA)
const restantes = computed(() => Math.max(0, LIMITE_CONSULTAS_IA_DIA - ia.consultasHoy))
const ideas = computed(() => ia.ultima?.respuesta_json?.ideas ?? [])
const notaIA = computed(() => ia.ultima?.respuesta_json?.nota ?? null)

onMounted(async () => {
  await Promise.all([pistas.cargar(), ia.cargar()])
})

async function pedir() {
  try {
    await ia.pedirAyuda(presupuesto.value ? Number(presupuesto.value) : null, pregunta.value.trim())
    toast.ok('La IA ya analizó las pistas ✨')
  } catch (e) {
    toast.error(e.message)
  }
}

/** Barrita de confianza (0-100). */
function confianza(valor) {
  const v = Math.max(0, Math.min(100, Number(valor) || 0))
  return { ancho: v + '%', color: v >= 70 ? '#4ade80' : v >= 40 ? '#fbbf24' : '#fb7185' }
}
</script>

<template>
  <div class="ia">
    <header class="ia__cabecera">
      <h1>¿Qué querrá {{ auth.pareja?.nombre ?? 'mi pareja' }}? ✨</h1>
      <p class="texto-tenue">
        La IA lee <strong>todas las pistas</strong> que tu pareja fue dejando y te propone ideas de regalo — sin
        inventar nada.
      </p>
    </header>

    <!-- ============ Menos de 3 pistas: no se llama a la IA ============ -->
    <div v-if="!suficientes" class="tarjeta aviso">
      <div class="aviso__emoji">🕵️</div>
      <h2>Aún hay muy poca información</h2>
      <p class="texto-tenue">
        Para pedirle ayuda a la IA hacen falta al menos <strong>{{ MINIMO_PISTAS_PARA_IA }} pistas</strong> de
        {{ auth.pareja?.nombre ?? 'tu pareja' }}. Hoy hay
        <strong>{{ pistas.dePareja.length }}</strong>.
      </p>
      <router-link class="btn btn--secundario" to="/app/pistas?tab=pareja">Ver las pistas disponibles</router-link>
      <p class="aviso__pista">💡 Pídele a tu pareja que deje una pista nueva hoy… sin decirle para qué 😏</p>
    </div>

    <!-- ============ Formulario de consulta ============ -->
    <form v-else class="tarjeta consulta" @submit.prevent="pedir">
      <label class="campo">
        <span>¿Cuánto quieres gastar? (opcional, en COP) 💸</span>
        <input
          v-model="presupuesto"
          class="input"
          type="number"
          inputmode="numeric"
          min="0"
          step="1000"
          placeholder="150000"
        />
      </label>

      <label class="campo">
        <span>¿Algo más que quieras decirle a la IA? (opcional) 💬</span>
        <input v-model="pregunta" class="input" type="text" maxlength="240" placeholder="Ej: no quiero algo muy grande" />
      </label>

      <button class="btn btn--ancho" type="submit" :disabled="ia.pensando || restantes === 0">
        <span v-if="ia.pensando" class="girando">✨</span>
        {{ ia.pensando ? 'Pensando en las pistas…' : 'Pedir ayuda a la IA ✨' }}
      </button>

      <p class="consulta__cupos" :class="{ 'consulta__cupos--agotado': restantes === 0 }">
        {{
          restantes === 0
            ? 'Ya usaste tus 5 consultas de hoy 😅 Vuelve mañana.'
            : `Te quedan ${restantes} de ${LIMITE_CONSULTAS_IA_DIA} consultas hoy`
        }}
      </p>

      <p v-if="ia.error" class="consulta__error" role="alert">⚠️ {{ ia.error }}</p>
    </form>

    <!-- ============ Resultados ============ -->
    <section v-if="ideas.length" class="resultados">
      <h2>Ideas para regalarle 🎁</h2>
      <p v-if="notaIA" class="nota">🤖 {{ notaIA }}</p>

      <article v-for="(idea, i) in ideas" :key="i" class="idea tarjeta aparecer" :style="{ animationDelay: i * 0.08 + 's' }">
        <header class="idea__cabecera">
          <h3>{{ idea.idea }}</h3>
          <span class="idea__confianza" :style="{ background: confianza(idea.confianza).color }">
            {{ idea.confianza }}%
          </span>
        </header>

        <div class="idea__barra">
          <span :style="confianza(idea.confianza)" />
        </div>

        <p class="idea__porque">
          <span class="etiqueta">Por qué</span>
          {{ idea.por_que }}
        </p>

        <p v-if="idea.donde_conseguirlo" class="idea__donde">📍 {{ idea.donde_conseguirlo }}</p>
      </article>
    </section>

    <!-- ============ Historial (privado) ============ -->
    <section v-if="ia.historial.length" class="historial">
      <h2>Consultas anteriores 🕘 <small class="texto-tenue">(solo tú las ves)</small></h2>
      <ul>
        <li v-for="c in ia.historial" :key="c.id">
          <span class="historial__fecha">
            {{
              new Intl.DateTimeFormat('es-CO', {
                day: '2-digit',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
                timeZone: 'America/Bogota'
              }).format(new Date(c.creada_en))
            }}
          </span>
          <span class="historial__detalle">
            {{ c.respuesta_json?.ideas?.length ?? 0 }} ideas
            <template v-if="c.presupuesto_cop"> · {{ formatoCOP(c.presupuesto_cop) }}</template>
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.ia__cabecera {
  margin-bottom: 1.2rem;
}

.ia__cabecera h1 {
  font-size: clamp(1.5rem, 7vw, 2rem);
}

.aviso {
  text-align: center;
  padding: 1.6rem 1.1rem;
}

.aviso__emoji {
  font-size: 2.6rem;
  animation: flotar 3.5s ease-in-out infinite;
}

.aviso h2 {
  font-size: 1.25rem;
}

.aviso .btn {
  margin-top: 0.4rem;
}

.aviso__pista {
  margin-top: 1.1rem;
  font-size: 0.85rem;
  color: var(--color-acento);
  background: rgba(255, 217, 138, 0.1);
  border-radius: 12px;
  padding: 0.6rem;
}

.consulta {
  margin-bottom: 1.4rem;
}

.consulta__cupos {
  text-align: center;
  font-size: 0.82rem;
  color: var(--texto-tenue);
  margin-top: 0.7rem;
}

.consulta__cupos--agotado {
  color: var(--error);
}

.consulta__error {
  text-align: center;
  color: var(--error);
  font-size: 0.88rem;
}

.girando {
  display: inline-block;
  animation: girar 1.1s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

.resultados h2,
.historial h2 {
  font-size: 1.25rem;
  margin-bottom: 0.7rem;
}

.nota {
  font-size: 0.88rem;
  color: var(--color-acento);
  background: rgba(255, 217, 138, 0.1);
  border: 1px dashed rgba(255, 217, 138, 0.4);
  border-radius: 12px;
  padding: 0.6rem 0.75rem;
}

.idea {
  margin-bottom: 0.9rem;
}

.idea__cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 0.5rem;
}

.idea__cabecera h3 {
  font-size: 1.08rem;
  margin: 0;
}

.idea__confianza {
  flex-shrink: 0;
  font-size: 0.76rem;
  font-weight: 800;
  color: #12100a;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}

.idea__barra {
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
  margin-bottom: 0.7rem;
}

.idea__barra span {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s ease;
}

.idea__porque {
  font-size: 0.92rem;
  margin-bottom: 0.6rem;
}

.idea__porque .etiqueta {
  display: block;
  margin-bottom: 0.25rem;
}

.idea__donde {
  font-size: 0.86rem;
  color: var(--texto-tenue);
  margin: 0;
}

.historial {
  margin-top: 1.6rem;
}

.historial ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.historial li {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.6rem 0;
  border-bottom: 1px dashed var(--borde);
  font-size: 0.86rem;
}

.historial__fecha {
  color: var(--color-acento);
}
</style>

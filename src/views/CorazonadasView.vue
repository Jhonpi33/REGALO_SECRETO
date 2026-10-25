<script setup>
/**
 * Mis corazonadas — espacio PRIVADO.
 * Mis teorías sobre el regalo de mi pareja y el regalo que elegí.
 * Antes del 20/11/2026 nadie más puede ver esto (lo garantiza la RLS).
 */
import { ref, watch, computed, onMounted } from 'vue'
import { useCorazonadasStore } from '../stores/corazonadas'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import { ESTADOS_REGALO, formatoCOP } from '../data/constantes'
import { useRevelacion } from '../composables/useRevelacion'

const corazonadas = useCorazonadasStore()
const auth = useAuthStore()
const toast = useToastStore()
const { revelado } = useRevelacion()

const teoria = ref('')
const regalo = ref('')
const enlace = ref('')
const presupuesto = ref('')
const estado = ref('pensando')
const guardando = ref(false)

/** Cargo mi corazonada guardada (o la de la pareja si ya se reveló). */
watch(
  () => corazonadas.mia,
  (v) => {
    if (!v) return
    teoria.value = v.teoria ?? ''
    regalo.value = v.regalo_elegido ?? ''
    enlace.value = v.enlace ?? ''
    presupuesto.value = v.presupuesto_cop ?? ''
    estado.value = v.estado ?? 'pensando'
  },
  { immediate: true }
)

const regaloPareja = computed(() => corazonadas.deLaPareja)
const teoriaPareja = computed(() => corazonadas.dePareja?.[0] ?? null)

onMounted(() => corazonadas.cargar())

async function guardar() {
  guardando.value = true
  try {
    await corazonadas.guardar({
      teoria: teoria.value,
      regalo_elegido: regalo.value,
      enlace: enlace.value,
      presupuesto_cop: presupuesto.value,
      estado: estado.value
    })
    toast.ok('Guardado en secreto 🔐')
  } catch (e) {
    toast.error('No se pudo guardar: ' + e.message)
  } finally {
    guardando.value = false
  }
}

async function borrarTodo() {
  if (!confirm('¿Seguro que quieres borrar tu corazonada?')) return
  try {
    await corazonadas.borrar()
    teoria.value = ''
    regalo.value = ''
    enlace.value = ''
    presupuesto.value = ''
    estado.value = 'pensando'
    toast.ok('Borrado 🧹')
  } catch (e) {
    toast.error('No se pudo borrar: ' + e.message)
  }
}
</script>

<template>
  <div class="corazonadas">
    <header class="cabecera-seccion">
      <h1>Mis corazonadas 💭</h1>
      <p class="texto-tenue">
        Tus teorías y tu regalo elegido. <strong>Solo tú los ves</strong> hasta el 20 de noviembre.
      </p>
      <span class="candado">🔒 Privado</span>
    </header>

    <form class="tarjeta formulario" @submit.prevent="guardar">
      <label class="campo">
        <span>Mi teoría: ¿qué quiere {{ auth.pareja?.nombre ?? 'mi pareja' }}? 🕵️</span>
        <textarea
          v-model="teoria"
          class="textarea"
          placeholder="Creo que quiere… porque en la pista número 3 mencionó…"
          maxlength="800"
        />
      </label>

      <label class="campo">
        <span>Lo que decidí regalarle 🎁</span>
        <input v-model="regalo" class="input" type="text" placeholder="Ej: Una cafetera italiana + su taza favorita" maxlength="200" />
      </label>

      <div class="dos-columnas">
        <label class="campo">
          <span>Enlace (opcional) 🔗</span>
          <input v-model="enlace" class="input" type="url" placeholder="https://…" />
        </label>

        <label class="campo">
          <span>Presupuesto en COP 💸</span>
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
      </div>

      <p v-if="presupuesto" class="presupuesto">Presupuesto: <strong>{{ formatoCOP(presupuesto) }}</strong></p>

      <fieldset class="campo estados">
        <legend>Estado del regalo</legend>
        <div class="estados__opciones">
          <button
            v-for="e in ESTADOS_REGALO"
            :key="e.id"
            type="button"
            class="estados__boton"
            :class="{ 'estados__boton--activo': estado === e.id }"
            :aria-pressed="estado === e.id"
            @click="estado = e.id"
          >
            {{ e.emoji }} {{ e.nombre }}
          </button>
        </div>
      </fieldset>

      <div class="formulario__acciones">
        <button class="btn" type="submit" :disabled="guardando">
          {{ guardando ? 'Guardando…' : 'Guardar en secreto 🔐' }}
        </button>
        <button v-if="corazonadas.mia" class="btn btn--fantasma" type="button" @click="borrarTodo">Borrar</button>
      </div>
    </form>

    <!-- ================= Después de la revelación ================= -->
    <section v-if="revelado" class="pareja aparecer">
      <h2>Lo que {{ auth.pareja?.nombre ?? 'tu pareja' }} guardaba 🔓</h2>

      <div v-if="teoriaPareja" class="tarjeta">
        <span class="etiqueta">Su teoría</span>
        <p>{{ teoriaPareja.teoria || 'No escribió ninguna teoría.' }}</p>

        <template v-if="regaloPareja">
          <span class="etiqueta">Su regalo elegido</span>
          <p>
            {{ regaloPareja.regalo_elegido || 'Todavía no definía el regalo.' }}
            <span v-if="regaloPareja.presupuesto_cop"> · {{ formatoCOP(regaloPareja.presupuesto_cop) }}</span>
            <span v-if="regaloPareja.enlace"> · <a :href="regaloPareja.enlace" target="_blank" rel="noopener">ver enlace</a></span>
          </p>
          <p>Estado: {{ ESTADOS_REGALO.find((e) => e.id === regaloPareja.estado)?.emoji }} {{ ESTADOS_REGALO.find((e) => e.id === regaloPareja.estado)?.nombre }}</p>
        </template>
      </div>

      <p v-else class="texto-tenue">Todavía no hay nada que revelar de su parte.</p>
    </section>

    <p v-else class="bloqueada tarjeta">
      🔒 La sección de tu pareja se abre el <strong>20 de noviembre de 2026</strong>. La cuenta regresiva está
      corriendo.
    </p>
  </div>
</template>

<style scoped>
.cabecera-seccion {
  position: relative;
  margin-bottom: 1.2rem;
}

.cabecera-seccion h1 {
  font-size: clamp(1.5rem, 7vw, 2rem);
  margin-bottom: 0.3rem;
}

.cabecera-seccion p {
  margin-bottom: 0.6rem;
}

.candado {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: rgba(74, 222, 128, 0.15);
  color: var(--ok);
  border: 1px solid rgba(74, 222, 128, 0.4);
}

.formulario {
  margin-bottom: 1.4rem;
}

.dos-columnas {
  display: grid;
  gap: 0 0.8rem;
}

@media (min-width: 560px) {
  .dos-columnas {
    grid-template-columns: 1fr 1fr;
  }
}

.presupuesto {
  font-size: 0.9rem;
  color: var(--color-acento);
  margin-top: -0.4rem;
}

.estados {
  border: none;
  padding: 0;
  margin: 0 0 1rem;
}

.estados legend {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--texto-tenue);
  margin-bottom: 0.5rem;
}

.estados__opciones {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.estados__boton {
  flex: 1;
  min-width: 96px;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid var(--borde);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.estados__boton--activo {
  background: var(--degradado-marca);
  color: #fff;
  border-color: transparent;
}

.formulario__acciones {
  display: flex;
  gap: 0.6rem;
}

.formulario__acciones .btn {
  flex: 1;
}

.bloqueada {
  text-align: center;
  font-size: 0.92rem;
  color: var(--texto-tenue);
}

.bloqueada strong {
  color: var(--color-acento);
}

.pareja h2 {
  font-size: 1.3rem;
  margin-bottom: 0.8rem;
}

.pareja .tarjeta {
  margin-bottom: 0.8rem;
}

.pareja p {
  margin-bottom: 0.9rem;
}
</style>

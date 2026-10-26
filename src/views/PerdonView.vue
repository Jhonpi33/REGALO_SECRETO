<script setup>
/**
 * Carta de perdón — /app/perdon
 *
 * · Si la recibí (Majo): ve la carta con dos botones. Cada "No" hace
 *   aparecer más botones "No" por toda la pantalla (y le avisa a Jhon).
 *   Cuando aprieta "Sí" hay celebración y le avisa a Jhon con el besito.
 * · Si la envié (Jhon): ve el estado ("esperando… N intentos") y puede
 *   reenviar la notificación.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const cargando = ref(true)
const fila = ref(null)
const rechazos = ref(0)
const botonesNo = ref([])
const acepto = ref(false)
const avisado = ref(false)
const enviando = ref(false)

let siguienteId = 0
let enCurso = false
let pendiente = false
let temporizador = null

const FRASES_NO = [
  'No 😌', 'Noope', 'Tampoco 😌', 'Ni lo sueñes', 'Ajá, ¿y eso?', 'Sigue intentando',
  'No no no', 'Hmm… no', 'Hoy no', 'Después te digo 😌', 'Qué va', 'Nel'
]

const soyEmisor = computed(() => !!fila.value && fila.value.de_id === auth.usuario?.id)
const soyReceptor = computed(() => !!fila.value && fila.value.para_id === auth.usuario?.id)
const perdonado = computed(() => fila.value?.estado === 'perdonado')

/** El botón "Sí" crece mientras más "No" apriete. */
const escalaSi = computed(() => 1 + Math.min(rechazos.value * 0.05, 0.6))

const fraseSino = computed(() => {
  const n = rechazos.value
  if (n === 0) return 'Piénsalo bien 😉'
  if (n < 3) return `Vas en ${n}… ¿segura? 😌`
  if (n < 6) return `Vas en ${n}… el botón rosado está acá 💕`
  if (n < 10) return `Vas en ${n}… él ya pidió perdón, ¡dale! 🥺`
  return `Vas en ${n}… hasta el teléfono está esperando 😴`
})

onMounted(async () => {
  await cargar()
  // El que envió la carta quiere ver los intentos en vivo
  temporizador = setInterval(async () => {
    if (soyEmisor.value && !perdonado.value) await refrescar()
  }, 8000)
})

onBeforeUnmount(() => clearInterval(temporizador))

async function cargar() {
  cargando.value = true
  const { data } = await supabase
    .from('perdones')
    .select('*')
    .order('creada_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  fila.value = data ?? null
  if (data) {
    rechazos.value = data.rechazos ?? 0
    if (data.estado === 'perdonado' && data.para_id === auth.usuario?.id) acepto.value = true
  }
  cargando.value = false
}

async function refrescar() {
  const { data } = await supabase
    .from('perdones')
    .select('*')
    .order('creada_en', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (data) fila.value = data
}

/**
 * Llama a la Edge Function `notificar` con coalescing:
 * si llegan varios "No" seguidos solo se procesan en cadena, sin apilar.
 */
async function avisar(tipo) {
  if (enCurso) {
    pendiente = true
    return null
  }
  enCurso = true
  let ultimo = null
  try {
    do {
      pendiente = false
      const { data, error } = await supabase.functions.invoke('notificar', { body: { tipo } })
      if (error) throw new Error(error.message ?? 'No se pudo enviar')
      ultimo = data
    } while (pendiente)
    return ultimo
  } catch (e) {
    console.warn('No se pudo avisar:', e?.message)
    return null
  } finally {
    enCurso = false
  }
}

function nuevoBoton() {
  return {
    id: siguienteId++,
    x: Math.round(4 + Math.random() * 62),
    y: Math.round(4 + Math.random() * 72),
    giro: Math.round(Math.random() * 26 - 13),
    texto: FRASES_NO[Math.floor(Math.random() * FRASES_NO.length)]
  }
}

/** Cada "No" engendra más "No" (y le avisa a Jhon). */
function presionarNo() {
  rechazos.value++
  const cuantos = Math.min(2 + Math.floor(rechazos.value / 4), 4)
  for (let i = 0; i < cuantos && botonesNo.value.length < 16; i++) {
    botonesNo.value.push(nuevoBoton())
  }
  avisar('perdon-no')
}

/** Sí: celebración + notificación a Jhon. */
async function perdonar() {
  if (acepto.value) return
  acepto.value = true
  await supabase.from('perdones').update({ rechazos: rechazos.value }).eq('id', fila.value.id)
  const r = await avisar('perdon-si')
  avisado.value = Boolean(r?.ok)
  if (!avisado.value) toast.mostrar('No pude avisarle… toca "Enviar besito" para reintentar.')
}

async function enviarBesito() {
  enviando.value = true
  const r = await avisar('perdon-si')
  avisado.value = Boolean(r?.ok)
  enviando.value = false
  if (avisado.value) toast.ok('¡Besito enviado! 💋')
}

/** Quien envió la carta: reenvía la notificación. */
async function reenviar() {
  enviando.value = true
  const r = await avisar('perdon')
  enviando.value = false
  if (r?.ok) toast.ok('Carta reenviada 💕')
  else toast.error('No se pudo reenviar la carta.')
  await refrescar()
}

/** No había carta: la crea y la envía. */
async function crearCarta() {
  enviando.value = true
  const r = await avisar('perdon')
  enviando.value = false
  if (r?.ok) toast.ok('¡Carta enviada! Le llegará la notificación 💕')
  else toast.error('No se pudo enviar la carta.')
  await cargar()
}
</script>

<template>
  <section class="perdon">
    <!-- Cargando -->
    <div v-if="cargando" class="tarjeta text-center">
      <span class="perdon__emoji">💕</span>
      <p>Abriendo la carta…</p>
    </div>

    <!-- No hay carta todavía (pantalla de quien la envía) -->
    <div v-else-if="!fila" class="tarjeta text-center">
      <span class="perdon__emoji">💌</span>
      <h1>Todavía no hay ninguna carta</h1>
      <p class="tenue">
        Si quieres pedirle perdón, escríbela aquí: le llegará una notificación en el celular con la carta y con dos
        botones para responderte.
      </p>
      <button class="btn btn--ancho" :disabled="enviando" @click="crearCarta">
        {{ enviando ? 'Enviando…' : 'Escribir la carta y enviarla 💕' }}
      </button>
    </div>

    <!-- ===== Yo la recibí: el juego del perdón ===== -->
    <div v-else-if="acepto" class="celebra">
      <span class="celebra__emoji">💋</span>
      <h1>¡Gracias, mi amor! 💕</h1>
      <p class="celebra__texto">
        Perdón aceptado… y te ganaste unas gomitas 🍬<br />
        <strong>Te amo 💕</strong>
      </p>
      <p v-if="rechazos > 0" class="tenue">Apretaste "No" {{ rechazos }} veces antes 😌</p>
      <div class="celebra__acciones">
        <button v-if="!avisado" class="btn btn--ancho" :disabled="enviando" @click="enviarBesito">
          {{ enviando ? 'Enviando…' : 'Enviarle el besito 💋' }}
        </button>
        <p v-else class="celebra__ok">¡Ya le avisé! Él ya sabe que lo perdonaste 💕</p>
        <button class="btn btn--secundario btn--ancho" @click="router.push('/app/pistas')">Ir a mis pistas</button>
      </div>
    </div>

    <div v-else-if="soyReceptor" class="zona">
      <!-- La carta -->
      <article class="carta">
        <span class="carta__emoji">💌</span>
        <p class="carta__texto">{{ fila.mensaje }}</p>
        <p class="carta__firma">Te amo 💕</p>
      </article>

      <!-- Botones "No" que aparecen por todas partes -->
      <button
        v-for="b in botonesNo"
        :key="b.id"
        class="btn-no-fugaz"
        :style="{ left: b.x + '%', top: b.y + '%', transform: `rotate(${b.giro}deg)` }"
        @click="presionarNo"
      >
        {{ b.texto }}
      </button>

      <!-- Acciones -->
      <div class="acciones">
        <button class="btn-si" :style="{ transform: `scale(${escalaSi})` }" @click="perdonar">
          Sí, te perdono 💕
        </button>
        <button class="btn-no" @click="presionarNo">No 😌</button>
        <p class="frase">{{ fraseSino }}</p>
      </div>
    </div>

    <!-- ===== Yo la envié: esperando respuesta ===== -->
    <div v-else-if="soyEmisor && !perdonado" class="tarjeta text-center">
      <span class="perdon__emoji">⏳</span>
      <h1>Esperando su respuesta…</h1>
      <p>
        La carta ya está en su celular 💕<br />
        Si apretó <strong>"No"</strong>, va en
        <strong>{{ fila.rechazos }}</strong> intento<span v-if="fila.rechazos !== 1">s</span> 😅
      </p>
      <div class="celebra__acciones">
        <button class="btn btn--ancho" :disabled="enviando" @click="reenviar">
          {{ enviando ? 'Reenviando…' : 'Reenviar la carta 💕' }}
        </button>
        <button class="btn btn--secundario btn--ancho" @click="router.push('/app/pistas')">Volver a mis pistas</button>
      </div>
    </div>

    <!-- ===== Yo la envié y me perdonó ===== -->
    <div v-else class="celebra">
      <span class="celebra__emoji">🎉</span>
      <h1>¡Ella te perdonó! 💕</h1>
      <p class="celebra__texto">
        Te ganaste unas gomitas 🍬 y un besito 💋<br />
        <strong>Te amo 💕</strong>
      </p>
      <p class="tenue">Apretó "No" {{ fila.rechazos }} veces antes 😌</p>
      <button class="btn btn--ancho" @click="router.push('/app/pistas')">Ir a mi panel</button>
    </div>
  </section>
</template>

<style scoped>
.perdon {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.text-center {
  text-align: center;
}

.tenue {
  color: var(--texto-tenue);
}

.perdon__emoji {
  display: block;
  font-size: 3rem;
  margin-bottom: 0.4rem;
  animation: latido 2s ease-in-out infinite;
}

h1 {
  font-family: var(--fuente-titulos);
  font-size: 1.35rem;
  margin: 0 0 0.5rem;
}

.tarjeta p {
  margin: 0.5rem 0 1rem;
  line-height: 1.5;
}

/* ---------- Zona del juego ---------- */
.zona {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-bottom: 1rem;
}

.carta {
  position: relative;
  z-index: 1;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
  border: 1px solid var(--color-primario);
  border-radius: 22px;
  padding: 1.3rem 1.2rem;
  box-shadow: var(--sombra);
  text-align: center;
}

.carta__emoji {
  font-size: 2.6rem;
  display: block;
  animation: latido 2.4s ease-in-out infinite;
}

.carta__texto {
  font-size: 1.05rem;
  line-height: 1.6;
  margin: 0.8rem 0 0.6rem;
}

.carta__firma {
  font-family: var(--fuente-titulos);
  color: var(--color-primario);
  font-size: 1.15rem;
  margin: 0;
}

.acciones {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
}

.btn-si {
  font-family: var(--fuente-titulos);
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  padding: 0.95rem 1.6rem;
  min-height: 56px;
  border: none;
  border-radius: 999px;
  background: var(--degradado-marca);
  box-shadow: 0 10px 26px rgba(224, 85, 155, 0.45);
  cursor: pointer;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-no {
  font-size: 0.95rem;
  color: var(--texto-tenue);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--borde);
  border-radius: 999px;
  padding: 0.6rem 1.4rem;
  min-height: 44px;
  cursor: pointer;
}

.frase {
  margin: 0.2rem 0 0;
  font-size: 0.9rem;
  color: var(--texto-tenue);
  text-align: center;
  min-height: 1.2rem;
}

/* Los "No" que nacen por la pantalla */
.btn-no-fugaz {
  position: absolute;
  z-index: 4;
  font-size: 0.9rem;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid var(--borde);
  border-radius: 999px;
  padding: 0.55rem 1rem;
  min-height: 42px;
  cursor: pointer;
  animation: aparece 0.3s ease-out;
  backdrop-filter: blur(6px);
}

/* ---------- Celebración ---------- */
.celebra {
  text-align: center;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
  border: 1px solid var(--color-primario);
  border-radius: 24px;
  padding: 2rem 1.2rem;
  box-shadow: var(--sombra);
}

.celebra__emoji {
  display: block;
  font-size: 3.6rem;
  animation: latido 1.4s ease-in-out infinite;
}

.celebra__texto {
  line-height: 1.6;
  margin: 0.7rem 0;
}

.celebra__ok {
  color: var(--color-primario);
  font-weight: 700;
}

.celebra__acciones {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 1.2rem;
}

@keyframes latido {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

@keyframes aparece {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; }
}
</style>

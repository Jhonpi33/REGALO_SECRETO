<script setup>
/**
 * Pantalla de pistas, con dos pestañas:
 *  1. Mis pistas  → las que yo escribo (agregar / editar / borrar) + racha
 *  2. Pistas de mi pareja → las que debo descifrar (solo lectura)
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePistasStore } from '../stores/pistas'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import { etiquetaDia } from '../data/constantes'
import PistaCard from '../components/PistaCard.vue'
import PistaForm from '../components/PistaForm.vue'
import { yaRevelado } from '../composables/useRevelacion'

const ruta = useRoute()
const pistas = usePistasStore()
const auth = useAuthStore()
const toast = useToastStore()

const pestana = ref(ruta.query.tab === 'pareja' ? 'pareja' : 'mias')

const formAbierto = ref(false)
const pistaEnEdicion = ref(null)
const confirmandoBorrar = ref(null)

const nombrePareja = computed(() => auth.pareja?.nombre ?? 'tu pareja')
const revelado = computed(() => yaRevelado())

const gruposMias = computed(() => pistas.miasPorDia)
const gruposPareja = computed(() => pistas.deParejaPorDia)
const pistasNuevas = computed(() => pistas.nuevasPareja)

/** Al abrir la pestaña de la pareja, marco sus pistas como vistas. */
watch(
  pestana,
  (v) => {
    if (v === 'pareja') pistas.marcarVistas()
  },
  { immediate: true }
)

onMounted(() => {
  // Los banners llevan a /app/pistas?nueva=1 para crear una pista
  if (ruta.query.nueva === '1') formAbierto.value = true
})

function abrirNueva() {
  pistaEnEdicion.value = null
  formAbierto.value = true
}

function abrirEdicion(pista) {
  pistaEnEdicion.value = pista
  formAbierto.value = true
}

async function guardar(datos) {
  try {
    if (pistaEnEdicion.value) {
      await pistas.editar(pistaEnEdicion.value.id, datos)
      toast.ok('Pista actualizada ✏️')
    } else {
      await pistas.agregar(datos)
      toast.ok('¡Pista dejada! Tu pareja ahora tiene más pistas 🎁')
    }
    formAbierto.value = false
    pistaEnEdicion.value = null
  } catch (e) {
    toast.error('No se pudo guardar: ' + e.message)
  }
}

async function borrar(pista) {
  confirmandoBorrar.value = pista
  try {
    await pistas.borrar(pista.id)
    toast.ok('Pista borrada 🗑️')
  } catch (e) {
    toast.error('No se pudo borrar: ' + e.message)
  } finally {
    confirmandoBorrar.value = null
  }
}
</script>

<template>
  <div class="pistas">
    <!-- Pestañas -->
    <div class="pestanas" role="tablist">
      <button
        class="pestanas__boton"
        :class="{ 'pestanas__boton--activo': pestana === 'mias' }"
        role="tab"
        :aria-selected="pestana === 'mias'"
        @click="pestana = 'mias'"
      >
        🗝️ Mis pistas
        <span class="pestanas__conteo">{{ pistas.totalMias }}</span>
      </button>
      <button
        class="pestanas__boton"
        :class="{ 'pestanas__boton--activo': pestana === 'pareja' }"
        role="tab"
        :aria-selected="pestana === 'pareja'"
        @click="pestana = 'pareja'"
      >
        🔍 De {{ nombrePareja }}
        <span v-if="pistasNuevas.size" class="pestanas__badge">{{ pistasNuevas.size }}</span>
      </button>
    </div>

    <!-- ============ MIS PISTAS ============ -->
    <section v-if="pestana === 'mias'">
      <!-- Resumen: racha + total -->
      <div class="resumen">
        <div class="resumen__dato tarjeta">
          <span class="resumen__emoji">🔥</span>
          <div>
            <strong>{{ pistas.racha }}</strong>
            <small>días seguidos</small>
          </div>
        </div>
        <div class="resumen__dato tarjeta">
          <span class="resumen__emoji">📜</span>
          <div>
            <strong>{{ pistas.totalMias }}</strong>
            <small>pistas escritas</small>
          </div>
        </div>
        <div class="resumen__dato tarjeta">
          <span class="resumen__emoji">{{ pistas.yaDejeHoy ? '✅' : '⏳' }}</span>
          <div>
            <strong>{{ pistas.yaDejeHoy ? 'Sí' : 'No' }}</strong>
            <small>pista de hoy</small>
          </div>
        </div>
      </div>

      <button class="btn btn--ancho" @click="abrirNueva">➕ Agregar una pista</button>

      <p v-if="!pistas.totalMias" class="vacio">
        Aún no has dejado pistas. ¡Empieza con la primera y suelta a tu pareja a adivinar! 🤫
      </p>

      <div v-for="grupo in gruposMias" :key="grupo.clave" class="dia aparecer">
        <h3 class="dia__titulo">{{ etiquetaDia(grupo.clave) }}</h3>
        <PistaCard
          v-for="p in grupo.pistas"
          :key="p.id"
          :pista="p"
          modo="mia"
          @editar="abrirEdicion"
          @borrar="borrar"
        />
      </div>
    </section>

    <!-- ============ PISTAS DE MI PAREJA ============ -->
    <section v-else>
      <div class="aviso tarjeta">
        <span>👀</span>
        <p>
          Estas son las pistas que <strong>{{ nombrePareja }}</strong> ha ido dejando. Úsalas para descifrar su regalo
          — y si te atoras, la <router-link to="/app/ia">IA te da ideas</router-link>.
        </p>
      </div>

      <p v-if="!pistas.dePareja.length" class="vacio">
        {{ nombrePareja }} aún no deja pistas… o tal vez está guardando el secreto muy bien 🤐
      </p>

      <div v-for="grupo in gruposPareja" :key="grupo.clave" class="dia aparecer">
        <h3 class="dia__titulo">{{ etiquetaDia(grupo.clave) }}</h3>
        <PistaCard
          v-for="p in grupo.pistas"
          :key="p.id"
          :pista="p"
          modo="pareja"
          :nueva="pistasNuevas.has(p.id)"
        />
      </div>
    </section>

    <!-- Aviso si ya se reveló -->
    <p v-if="revelado" class="revelado">
      🎉 ¡Ya nos descubrimos! Ya puedes ver todo en <router-link to="/app/revelacion">Revelación</router-link>.
    </p>

    <PistaForm :abierto="formAbierto" :pista="pistaEnEdicion" @cerrar="formAbierto = false" @guardar="guardar" />
  </div>
</template>

<style scoped>
.pestanas {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.pestanas__boton {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 48px;
  padding: 0.55rem 0.6rem;
  border-radius: 14px;
  border: 1px solid var(--borde);
  background: rgba(255, 255, 255, 0.05);
  color: var(--texto-tenue);
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pestanas__boton--activo {
  background: var(--degradado-marca);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 20px rgba(224, 85, 155, 0.3);
}

.pestanas__conteo {
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.25);
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
}

.pestanas__badge {
  font-size: 0.72rem;
  background: #ffd98a;
  color: #4a2c00;
  font-weight: 800;
  padding: 0.08rem 0.45rem;
  border-radius: 999px;
}

.resumen {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.55rem;
  margin-bottom: 1rem;
}

.resumen__dato {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.6rem;
}

.resumen__emoji {
  font-size: 1.4rem;
}

.resumen__dato strong {
  display: block;
  font-size: 1.15rem;
  font-family: var(--fuente-titulos);
  line-height: 1;
}

.resumen__dato small {
  font-size: 0.66rem;
  color: var(--texto-tenue);
}

.aviso {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding: 0.85rem;
}

.aviso span {
  font-size: 1.3rem;
}

.aviso p {
  margin: 0;
  font-size: 0.9rem;
}

.dia {
  margin-top: 1.3rem;
}

.dia__titulo {
  font-size: 0.82rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-acento);
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.dia__titulo::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--borde), transparent);
}

.vacio {
  text-align: center;
  color: var(--texto-tenue);
  padding: 2rem 1rem;
  border: 1px dashed var(--borde);
  border-radius: 16px;
  margin-top: 1rem;
}

.revelado {
  margin-top: 1.4rem;
  text-align: center;
  background: rgba(255, 217, 138, 0.12);
  border: 1px solid rgba(255, 217, 138, 0.4);
  border-radius: 14px;
  padding: 0.8rem;
  font-size: 0.9rem;
}
</style>

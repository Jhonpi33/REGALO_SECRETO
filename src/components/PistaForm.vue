<script setup>
/**
 * Formulario de pista (nueva o en edición) dentro de un modal.
 * Campos: texto (obligatorio), categoría (opcional) y nivel de dificultad.
 */
import { ref, watch } from 'vue'
import { CATEGORIAS, NIVELES } from '../data/constantes'
import ModalBase from './ModalBase.vue'

const props = defineProps({
  abierto: { type: Boolean, default: false },
  pista: { type: Object, default: null } // si tiene id → edición
})
const emit = defineEmits(['cerrar', 'guardar'])

const texto = ref('')
const categoria = ref('')
const nivel = ref('tibia')
const guardando = ref(false)
const error = ref('')

watch(
  () => props.abierto,
  (v) => {
    if (!v) return
    texto.value = props.pista?.texto ?? ''
    categoria.value = props.pista?.categoria ?? ''
    nivel.value = props.pista?.nivel ?? 'tibia'
    error.value = ''
  }
)

async function guardar() {
  if (!texto.value.trim()) {
    error.value = 'La pista no puede quedar vacía ✍️'
    return
  }
  guardando.value = true
  try {
    emit('guardar', {
      texto: texto.value,
      categoria: categoria.value || null,
      nivel: nivel.value
    })
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <ModalBase :abierto="abierto" :titulo="pista ? 'Editar pista' : 'Nueva pista'" @cerrar="$emit('cerrar')">
    <form @submit.prevent="guardar">
      <label class="campo">
        <span>Tu pista ✍️ *</span>
        <textarea
          v-model="texto"
          class="textarea"
          placeholder="Ejemplo: Es algo que uso casi todos los días, y es de un color que me encanta…"
          maxlength="400"
          required
        />
      </label>

      <label class="campo">
        <span>Categoría (opcional)</span>
        <select v-model="categoria" class="select">
          <option value="">Sin categoría</option>
          <option v-for="c in CATEGORIAS" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>

      <fieldset class="campo nivel">
        <legend>¿Cuánta pista das?</legend>
        <div class="nivel__opciones">
          <button
            v-for="n in NIVELES"
            :key="n.id"
            type="button"
            class="nivel__boton"
            :class="{ 'nivel__boton--activo': nivel === n.id }"
            :aria-pressed="nivel === n.id"
            @click="nivel = n.id"
          >
            <span class="nivel__emoji">{{ n.emoji }}</span>
            <span class="nivel__nombre">{{ n.nombre }}</span>
            <span class="nivel__desc">{{ n.descripcion }}</span>
          </button>
        </div>
      </fieldset>

      <p v-if="error" class="nivel__error" role="alert">⚠️ {{ error }}</p>

      <div class="nivel__acciones">
        <button type="button" class="btn btn--secundario" @click="$emit('cerrar')">Cancelar</button>
        <button type="submit" class="btn" :disabled="guardando">
          {{ guardando ? 'Guardando…' : pista ? 'Guardar cambios' : 'Dejar la pista 🎁' }}
        </button>
      </div>
    </form>
  </ModalBase>
</template>

<style scoped>
.nivel {
  border: none;
  padding: 0;
  margin: 0 0 1rem;
}

.nivel legend {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--texto-tenue);
  margin-bottom: 0.5rem;
}

.nivel__opciones {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.nivel__boton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0.7rem 0.3rem;
  min-height: 96px;
  border-radius: 14px;
  border: 1px solid var(--borde);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.18s ease;
}

.nivel__boton--activo {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.06));
  border-color: var(--color-primario);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primario) 45%, transparent);
}

.nivel__emoji {
  font-size: 1.4rem;
}

.nivel__nombre {
  font-size: 0.85rem;
  font-weight: 700;
}

.nivel__desc {
  font-size: 0.66rem;
  color: var(--texto-tenue);
  text-align: center;
  line-height: 1.2;
}

.nivel__error {
  color: var(--error);
  font-size: 0.88rem;
}

.nivel__acciones {
  display: flex;
  gap: 0.6rem;
}

.nivel__acciones .btn {
  flex: 1;
}
</style>

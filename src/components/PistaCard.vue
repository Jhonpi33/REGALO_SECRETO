<script setup>
/**
 * Tarjeta de una pista.
 * modo="mia"   → puedo editarla y borrarla (hasta la revelación)
 * modo="pareja"→ solo la leo; las nuevas llevan sello "Nueva"
 */
import { NIVELES, emojiNivel, nombreNivel } from '../data/constantes'

const props = defineProps({
  pista: { type: Object, required: true },
  modo: { type: String, default: 'mia' },
  nueva: { type: Boolean, default: false }
})

const emit = defineEmits(['editar', 'borrar'])

const nivel = NIVELES.find((n) => n.id === props.pista.nivel) ?? NIVELES[1]
</script>

<template>
  <article class="pista" :class="'pista--' + (pista.nivel || 'tibia')">
    <div class="pista__cabecera">
      <span class="pista__nivel" :title="nombreNivel(pista.nivel)">
        {{ emojiNivel(pista.nivel) }} {{ nivel.nombre }}
      </span>
      <span v-if="pista.categoria" class="pista__categoria">{{ pista.categoria }}</span>
      <span v-if="nueva" class="pista__nueva">Nueva ✨</span>
    </div>

    <p class="pista__texto">{{ pista.texto }}</p>

    <div class="pista__pie">
      <time class="pista__hora" :datetime="pista.creada_en">
        {{
          new Intl.DateTimeFormat('es-CO', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/Bogota'
          }).format(new Date(pista.creada_en))
        }}
      </time>

      <span v-if="modo === 'mia'" class="pista__acciones">
        <button class="btn btn--fantasma btn--peq" @click="emit('editar', pista)">✏️ Editar</button>
        <button class="btn btn--fantasma btn--peq" @click="emit('borrar', pista)">🗑️ Borrar</button>
      </span>
    </div>
  </article>
</template>

<style scoped>
.pista {
  position: relative;
  background: var(--tarjeta);
  border: 1px solid var(--borde);
  border-left: 4px solid var(--color-primario);
  border-radius: 16px;
  padding: 0.85rem 0.95rem;
  margin-bottom: 0.7rem;
  box-shadow: var(--sombra-suave);
  overflow: hidden;
}

.pista--fria {
  border-left-color: #7dd3fc;
}
.pista--tibia {
  border-left-color: #fbbf24;
}
.pista--caliente {
  border-left-color: #fb7185;
}

.pista__cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.5rem;
}

.pista__nivel {
  font-size: 0.76rem;
  font-weight: 700;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.pista__categoria {
  font-size: 0.74rem;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: rgba(255, 217, 138, 0.16);
  color: var(--color-acento);
  border: 1px solid rgba(255, 217, 138, 0.35);
}

.pista__nueva {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: var(--degradado-marca);
  color: #fff;
  animation: latido 2.2s ease-in-out infinite;
}

.pista__texto {
  margin: 0 0 0.6rem;
  font-size: 1rem;
  line-height: 1.5;
}

.pista__pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.pista__hora {
  font-size: 0.76rem;
  color: var(--texto-tenue);
}

.pista__acciones {
  display: flex;
  gap: 0.4rem;
}
</style>

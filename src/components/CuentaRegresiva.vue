<script setup>
/**
 * Cuenta regresiva en vivo hasta la revelación
 * (20 de noviembre de 2026, 00:00 hora Bogotá).
 */
import { useRevelacion } from '../composables/useRevelacion'

const { revelado, dias, horas, minutos, segundos, fechaLarga } = useRevelacion()

const rellenar = (n) => String(n).padStart(2, '0')
</script>

<template>
  <div class="cuenta">
    <template v-if="!revelado">
      <p class="cuenta__titulo">
        Nos descubrimos el <strong>{{ fechaLarga }}</strong>
      </p>
      <div class="cuenta__rejilla" role="timer" aria-label="Cuenta regresiva para la revelación">
        <div class="cuenta__casilla">
          <span class="cuenta__numero">{{ dias }}</span>
          <span class="cuenta__etiqueta">días</span>
        </div>
        <span class="cuenta__separador">:</span>
        <div class="cuenta__casilla">
          <span class="cuenta__numero">{{ rellenar(horas) }}</span>
          <span class="cuenta__etiqueta">horas</span>
        </div>
        <span class="cuenta__separador">:</span>
        <div class="cuenta__casilla">
          <span class="cuenta__numero">{{ rellenar(minutos) }}</span>
          <span class="cuenta__etiqueta">min</span>
        </div>
        <span class="cuenta__separador">:</span>
        <div class="cuenta__casilla">
          <span class="cuenta__numero">{{ rellenar(segundos) }}</span>
          <span class="cuenta__etiqueta">seg</span>
        </div>
      </div>
    </template>

    <p v-else class="cuenta__revelado">🎉 ¡Ya nos descubrimos! Revisa la revelación 🎁</p>
  </div>
</template>

<style scoped>
.cuenta {
  text-align: center;
}

.cuenta__titulo {
  font-size: 0.98rem;
  color: var(--texto-tenue);
  margin-bottom: 0.8rem;
}

.cuenta__titulo strong {
  color: var(--color-acento-2);
}

.cuenta__rejilla {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.25rem, 2vw, 0.7rem);
}

.cuenta__casilla {
  min-width: clamp(62px, 17vw, 92px);
  padding: 0.6rem 0.3rem 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--borde);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.cuenta__numero {
  display: block;
  font-family: var(--fuente-titulos);
  font-size: clamp(1.5rem, 7vw, 2.4rem);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(120deg, #fff, var(--color-primario-claro));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.cuenta__etiqueta {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--texto-tenue);
}

.cuenta__separador {
  font-size: 1.4rem;
  color: var(--color-acento);
  animation: brillar 1s infinite;
}

.cuenta__revelado {
  font-size: 1.1rem;
  font-weight: 600;
}
</style>

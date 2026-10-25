<script setup>
/**
 * Guía "Cómo instalar la app" (PWA) para Android e iPhone.
 * Incluye la limitación de iOS: push solo con app en pantalla de inicio (iOS 16.4+).
 */
import { ref, onMounted } from 'vue'

const esIOS = ref(false)
const yaInstalable = ref(false)

onMounted(() => {
  esIOS.value = /iphone|ipad|ipod/i.test(navigator.userAgent)
  // El navegador avisa cuando la app ya puede instalarse
  window.addEventListener('beforeinstallprompt', () => (yaInstalable.value = true))
})

const pasosAndroid = [
  'Abre esta app en Google Chrome.',
  'Toca el menú ⋮ (tres puntos, arriba a la derecha).',
  'Elige “Agregar a pantalla de inicio” o “Instalar aplicación”.',
  'Confirma con “Instalar”.',
  '¡Listo! Aparece como un icono más de tu celular 🎁'
]

const pasosIPhone = [
  'Abre esta app en Safari (no en Chrome ni en otra app).',
  'Toca el botón compartir  ⬆️  (el cuadrado con la flecha).',
  'Desliza y elige “Agregar a pantalla de inicio”.',
  'Ponle el nombre que quieras y toca “Agregar”.',
  '¡Listo! Ya está en tu pantalla de inicio 🎁'
]

const pasosEscritorio = [
  'Abre la app en Chrome, Edge o Safari.',
  'Busca el ícono de instalar  ⤓  en la barra de direcciones.',
  'Toca “Instalar” y confirma.',
  'Se abrirá como una aplicación de escritorio 🖥️'
]
</script>

<template>
  <div class="instalar">
    <header class="instalar__cabecera">
      <span class="instalar__emoji">📲</span>
      <h1>Cómo instalar la app</h1>
      <p class="texto-tenue">
        Instálala en tu celular para que tenga su propio icono, abra a pantalla completa y pueda recibir las
        notificaciones.
      </p>
      <router-link class="btn btn--secundario" to="/">← Volver</router-link>
    </header>

    <!-- Aviso importante de iPhone -->
    <section class="tarjeta aviso-ios">
      <span>🍎</span>
      <div>
        <h2>Importante para iPhone</h2>
        <p>
          En iOS las <strong>notificaciones push solo funcionan si la app está instalada en la pantalla de inicio</strong>
          y tu sistema es <strong>iOS 16.4 o superior</strong>. Si solo la abres desde Safari, no llegaran los avisos.
        </p>
        <p class="texto-tenue">
          Para comprobar tu versión: Ajustes → General → Información → Versión de software.
        </p>
      </div>
    </section>

    <!-- Android -->
    <section class="tarjeta bloque">
      <h2>🤖 Android (Chrome)</h2>
      <ol class="pasos">
        <li v-for="(p, i) in pasosAndroid" :key="i">
          <span class="pasos__numero">{{ i + 1 }}</span>{{ p }}
        </li>
      </ol>
    </section>

    <!-- iPhone -->
    <section class="tarjeta bloque">
      <h2>🍎 iPhone (Safari · iOS 16.4 o superior)</h2>
      <ol class="pasos">
        <li v-for="(p, i) in pasosIPhone" :key="i">
          <span class="pasos__numero">{{ i + 1 }}</span>{{ p }}
        </li>
      </ol>
      <p v-if="esIOS" class="destacado">👉 Estás en un iPhone: sigue esos pasos para poder recibir avisos.</p>
      <p v-else class="texto-tenue">Si entras desde un iPhone, sigue estos pasos desde Safari.</p>
    </section>

    <!-- Computador -->
    <section class="tarjeta bloque">
      <h2>💻 Computador</h2>
      <ol class="pasos">
        <li v-for="(p, i) in pasosEscritorio" :key="i">
          <span class="pasos__numero">{{ i + 1 }}</span>{{ p }}
        </li>
      </ol>
      <p v-if="yaInstalable" class="destacado">✨ Tu navegador ya permite instalarla ahora mismo.</p>
    </section>

    <section class="tarjeta bloque">
      <h2>🔕 ¿Ya la instalaste y no llegan los avisos?</h2>
      <ul class="lista">
        <li>Revisa que los permisos de notificaciones estén activos (Mi perfil → Notificaciones).</li>
        <li>En iPhone: Ajustes → Notificaciones → Regalo Secreto → Permitir notificaciones.</li>
        <li>En Android: Ajustes → Aplicaciones → Regalo Secreto → Notificaciones.</li>
        <li>Si la app está en modo “no molestar” del teléfono, los avisos no vibrarán.</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.instalar__cabecera {
  text-align: center;
  margin-bottom: 1.4rem;
}

.instalar__emoji {
  font-size: 3rem;
  display: block;
  animation: flotar 4s ease-in-out infinite;
}

.instalar__cabecera h1 {
  font-size: clamp(1.7rem, 8vw, 2.4rem);
  margin-bottom: 0.5rem;
}

.instalar__cabecera .btn {
  margin-top: 0.7rem;
}

.aviso-ios {
  display: flex;
  gap: 0.8rem;
  border-color: rgba(255, 217, 138, 0.5);
  background: rgba(255, 217, 138, 0.1);
  margin-bottom: 1rem;
}

.aviso-ios > span {
  font-size: 1.6rem;
}

.aviso-ios h2 {
  font-size: 1.05rem;
  margin-bottom: 0.4rem;
}

.aviso-ios p {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.bloque {
  margin-bottom: 1rem;
}

.bloque h2 {
  font-size: 1.15rem;
  margin-bottom: 0.8rem;
}

.pasos {
  list-style: none;
  padding: 0;
  margin: 0;
}

.pasos li {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.55rem 0;
  border-bottom: 1px dashed var(--borde);
  font-size: 0.95rem;
  line-height: 1.45;
}

.pasos li:last-child {
  border-bottom: none;
}

.pasos__numero {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--degradado-marca);
  font-size: 0.8rem;
  font-weight: 700;
}

.destacado {
  margin-top: 0.8rem;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px dashed var(--borde);
  border-radius: 12px;
  padding: 0.6rem 0.75rem;
}

.lista {
  padding-left: 1.1rem;
  margin: 0;
}

.lista li {
  font-size: 0.92rem;
  margin-bottom: 0.45rem;
  line-height: 1.45;
}
</style>

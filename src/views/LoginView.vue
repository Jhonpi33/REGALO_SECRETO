<script setup>
/**
 * Pantalla de login.
 * Fondo dividido: mitad rosa (Majo) y mitad azul (Jhon).
 * Solo existen 2 usuarios: se crean a mano en el panel de Supabase.
 */
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { backendListo } from '../lib/supabase'
import CajaRegalo from '../components/CajaRegalo.vue'
import FondoVideo from '../components/FondoVideo.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const correo = ref('')
const clave = ref('')
const mostrandoClave = ref(false)

const pendiente = computed(() => route.query.redirigir)

async function enviar() {
  if (!correo.value || !clave.value) {
    auth.error = 'Escribe tu correo y tu contraseña.'
    return
  }
  const ok = await auth.entrar(correo.value, clave.value)
  if (ok) {
    router.push(pendiente.value ?? '/app/pistas')
  }
}
</script>

<template>
  <div class="login">
    <!-- Fondo con los videos de la pareja y velo de colores -->
    <FondoVideo denso />

    <!-- Mitad rosa + mitad azul -->
    <div class="login__fondo" aria-hidden="true">
      <span class="login__mitad login__mitad--rosa" />
      <span class="login__mitad login__mitad--azul" />
      <span class="login__corazon">💖</span>
    </div>

    <main class="login__tarjeta tarjeta aparecer">
      <div class="login__caja">
        <CajaRegalo :animar="true" />
      </div>

      <h1>Regalo Secreto</h1>
      <p class="texto-tenue">Jhon &amp; Majo — nos descubrimos el 20 de noviembre 🎁</p>

      <form class="login__form" @submit.prevent="enviar">
        <label class="campo">
          <span>Correo</span>
          <input
            v-model.trim="correo"
            class="input"
            type="email"
            name="correo"
            autocomplete="username"
            inputmode="email"
            placeholder="tucorreo@ejemplo.com"
            required
          />
        </label>

        <label class="campo">
          <span>Contraseña</span>
          <span class="login__clave">
            <input
              v-model="clave"
              class="input"
              :type="mostrandoClave ? 'text' : 'password'"
              name="clave"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
            <button type="button" class="login__ojo" :aria-label="mostrandoClave ? 'Ocultar contraseña' : 'Ver contraseña'" @click="mostrandoClave = !mostrandoClave">
              {{ mostrandoClave ? '🙈' : '👁️' }}
            </button>
          </span>
        </label>

        <p v-if="auth.error" class="login__error" role="alert">⚠️ {{ auth.error }}</p>

        <button class="btn btn--ancho" type="submit" :disabled="auth.cargando">
          {{ auth.cargando ? 'Entrando…' : 'Entrar al secreto 🔐' }}
        </button>
      </form>

      <p v-if="!backendListo" class="login__aviso">
        ⚙️ Falta configurar Supabase: copia <code>.env.example</code> a <code>.env</code> y agrega tus llaves (mira el
        <code>SETUP.md</code>).
      </p>

      <router-link class="login__volver" to="/">← Volver a la portada</router-link>
    </main>
  </div>
</template>

<style scoped>
.login {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem 1rem;
  overflow: hidden;
}

/* Fondo partido: rosa a la izquierda, azul a la derecha */
.login__fondo {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.login__mitad {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
}

.login__mitad--rosa {
  left: 0;
  background: radial-gradient(600px 700px at 20% 20%, rgba(255, 139, 189, 0.5), transparent 70%),
    linear-gradient(160deg, rgba(43, 17, 64, 0.62), rgba(27, 15, 46, 0.72));
}

.login__mitad--azul {
  right: 0;
  background: radial-gradient(600px 700px at 80% 20%, rgba(61, 139, 253, 0.45), transparent 70%),
    linear-gradient(200deg, rgba(16, 26, 53, 0.62), rgba(21, 12, 36, 0.72));
}

.login__corazon {
  position: absolute;
  left: 50%;
  top: 12%;
  transform: translateX(-50%);
  font-size: 2rem;
  animation: latido 2s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
}

.login__tarjeta {
  width: min(430px, 100%);
  text-align: center;
  padding: 1.6rem 1.3rem 1.8rem;
  background: rgba(22, 13, 38, 0.82);
}

.login__caja {
  display: flex;
  justify-content: center;
  margin-bottom: 0.4rem;
}

.login__caja :deep(.caja) {
  width: 130px;
}

.login h1 {
  font-size: clamp(1.8rem, 8vw, 2.3rem);
  background: linear-gradient(100deg, #ff8bbd, #ffd98a 45%, #7fc3ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.login__form {
  margin-top: 1.2rem;
  text-align: left;
}

.login__clave {
  position: relative;
  display: block;
}

.login__ojo {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.05rem;
  padding: 0.4rem;
  min-width: 40px;
  min-height: 40px;
}

.login__error {
  color: var(--error);
  font-size: 0.88rem;
  margin-bottom: 0.8rem;
}

.login__aviso {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: var(--color-acento);
  background: rgba(255, 217, 138, 0.1);
  border: 1px dashed rgba(255, 217, 138, 0.5);
  border-radius: 12px;
  padding: 0.6rem 0.7rem;
}

.login__aviso code {
  font-size: 0.78rem;
}

.login__volver {
  display: inline-block;
  margin-top: 1.1rem;
  font-size: 0.88rem;
  color: var(--texto-tenue);
  text-decoration: none;
}
</style>

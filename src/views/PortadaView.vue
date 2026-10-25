<script setup>
/**
 * Portada / landing: se ve antes de entrar y también como presentación.
 * Degradado rosa ↔ azul, partículas, caja de regalo, cuenta regresiva
 * y galería de fotos de la pareja.
 */
import ParticulasFondo from '../components/ParticulasFondo.vue'
import FondoVideo from '../components/FondoVideo.vue'
import CajaRegalo from '../components/CajaRegalo.vue'
import CuentaRegresiva from '../components/CuentaRegresiva.vue'
import CarruselFotos from '../components/CarruselFotos.vue'
</script>

<template>
  <div class="portada">
    <ParticulasFondo />

    <!-- Fondo: video de la pareja + velo de degradado rosa ↔ azul -->
    <FondoVideo />

    <main class="portada__contenido">
      <p class="portada__cejilla aparecer">💌 Amigo secreto de a dos</p>

      <h1 class="portada__titulo aparecer">
        Regalo <span>Secreto</span>
      </h1>

      <p class="portada__subtitulo aparecer">
        Jhon &amp; Majo — <strong>Nos descubrimos el 20 de noviembre</strong>
      </p>

      <div class="portada__caja aparecer">
        <CajaRegalo />
        <p class="portada__pista">Toca la caja 👆</p>
      </div>

      <div class="portada__cuenta aparecer">
        <CuentaRegresiva />
      </div>

      <div class="portada__acciones aparecer">
        <router-link to="/entrar" class="btn">Entrar 🎁</router-link>
        <router-link to="/instalar" class="btn btn--secundario">Cómo instalar la app</router-link>
      </div>

      <section class="portada__galeria aparecer">
        <h2>Nuestros momentos</h2>
        <CarruselFotos />
      </section>

      <footer class="portada__pie">
        <p>Hecho con 💕 para descubrirnos el <strong>20 · 11 · 2026</strong></p>
        <p class="texto-tenue">Cada día una pista · Cada pista una sonrisa</p>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.portada {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  padding-bottom: 3rem;
}

.portada__contenido {
  position: relative;
  z-index: 1;
  width: min(760px, 100% - 2rem);
  margin-inline: auto;
  padding-top: clamp(2rem, 8vh, 4.5rem);
  text-align: center;
}

.portada__cejilla {
  display: inline-block;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid var(--borde);
  font-size: 0.82rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-acento-2);
}

.portada__titulo {
  margin-top: 1rem;
  font-size: clamp(3rem, 15vw, 5.5rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 0.95;
}

.portada__titulo span {
  display: block;
  background: linear-gradient(100deg, #ff8bbd 0%, #ffd98a 35%, #7fc3ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 6px 24px rgba(255, 139, 189, 0.35));
}

.portada__subtitulo {
  margin-top: 0.9rem;
  font-size: clamp(1rem, 4vw, 1.2rem);
  color: var(--texto-tenue);
}

.portada__subtitulo strong {
  color: #fff;
}

.portada__caja {
  margin: 1.6rem auto 1.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.portada__pista {
  font-size: 0.85rem;
  color: var(--texto-tenue);
  margin: 0;
}

.portada__cuenta {
  margin: 0.5rem 0 1.6rem;
}

.portada__acciones {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 2.6rem;
}

.portada__acciones .btn {
  min-width: 200px;
}

.portada__galeria h2 {
  font-size: clamp(1.4rem, 6vw, 2rem);
  margin-bottom: 1rem;
  background: linear-gradient(100deg, #fff, var(--color-primario-claro));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.portada__pie {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--borde);
  font-size: 0.9rem;
  color: var(--texto-tenue);
}

.portada__pie strong {
  color: var(--color-acento);
}

.portada__pie p {
  margin-bottom: 0.35rem;
}

@media (min-width: 720px) {
  .portada__contenido {
    padding-top: clamp(3rem, 10vh, 6rem);
  }
}
</style>

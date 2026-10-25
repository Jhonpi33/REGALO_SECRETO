import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// Configuración de Vite + PWA para "Regalo Secreto"
// Los valores de Supabase llegan desde las variables de entorno (.env)
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png', 'videos/poster-01.jpg'],
      manifest: {
        name: 'Regalo Secreto — Jhon & Majo',
        short_name: 'Regalo Secreto',
        description:
          'Juego de amigo secreto de a dos: pistas diarias, corazonadas y revelación el 20 de noviembre.',
        lang: 'es',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1a1030',
        theme_color: '#e0559b',
        categories: ['lifestyle', 'entertainment'],
        icons: [
          { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Handler de push + click de notificaciones (archivito en /public)
        importScripts: ['push-handler.js'],
        // Precache del build + guardado offline de la app shell
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Fotos y pósteres: cacheados para que se vean sin conexión
            urlPattern: ({ url }) => url.pathname.startsWith('/fotos/') || /\.(jpg|jpeg|png|webp)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fotos-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 }
            }
          },
          {
            // Videos de fondo: guardados en caché (se descargan una sola vez)
            urlPattern: ({ url }) => url.pathname.startsWith('/videos/') || url.pathname.endsWith('.mp4'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'videos-cache',
              rangeRequests: true,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 180 }
            }
          },
          {
            // API de Supabase: red siempre (los datos son frescos)
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly'
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  build: {
    chunkSizeWarningLimit: 900
  }
})

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { backendListo } from '../lib/supabase'

// Rutas de la app. Cada pantalla indica si necesita sesión iniciada.
const rutas = [
  { path: '/', name: 'portada', component: () => import('../views/PortadaView.vue'), meta: { titulo: 'Regalo Secreto' } },
  { path: '/entrar', name: 'login', component: () => import('../views/LoginView.vue'), meta: { titulo: 'Entrar' } },
  {
    path: '/app',
    component: () => import('../views/AppLayout.vue'),
    meta: { requiereAuth: true },
    children: [
      { path: '', redirect: '/app/pistas' },
      {
        path: 'pistas',
        name: 'pistas',
        component: () => import('../views/PistasView.vue'),
        meta: { titulo: 'Pistas', pestana: 'pistas' }
      },
      {
        path: 'corazonadas',
        name: 'corazonadas',
        component: () => import('../views/CorazonadasView.vue'),
        meta: { titulo: 'Mis corazonadas', pestana: 'corazonadas' }
      },
      {
        path: 'ia',
        name: 'ia',
        component: () => import('../views/IAView.vue'),
        meta: { titulo: 'Ayuda de la IA', pestana: 'ia' }
      },
      {
        path: 'revelacion',
        name: 'revelacion',
        component: () => import('../views/RevelacionView.vue'),
        meta: { titulo: 'Revelación', pestana: 'revelacion' }
      },
      {
        path: 'perfil',
        name: 'perfil',
        component: () => import('../views/PerfilView.vue'),
        meta: { titulo: 'Mi perfil', pestana: 'perfil' }
      }
    ]
  },
  {
    path: '/instalar',
    name: 'instalar',
    component: () => import('../views/InstalarView.vue'),
    meta: { titulo: 'Cómo instalar la app' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes: rutas,
  scrollBehavior() {
    return { top: 0 }
  }
})

// Guardia global: mantiene la sesión y protege las rutas privadas.
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.listo) await auth.inicializar()

  document.title = to.meta.titulo ? `${to.meta.titulo} · Regalo Secreto` : 'Regalo Secreto'

  if (to.meta.requiereAuth && !auth.usuario) {
    return { name: 'login', query: { redirigir: to.fullPath } }
  }
  if (to.name === 'login' && auth.usuario) {
    return { name: 'pistas' }
  }
  if (!backendListo && to.meta.requiereAuth) {
    // Sin llaves de Supabase no hay sesión posible; avisamos en la portada.
    console.warn('Faltan las variables de entorno de Supabase (.env).')
  }
  return true
})

export default router

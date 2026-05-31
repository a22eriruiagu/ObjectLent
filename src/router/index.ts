import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomePage from '@/views/HomePage.vue';

/**
 * Definició de les rutes de l'aplicació
 * 
 * Estructura de navegació:
 * - / → Redirecció a /home
 * - /home → Pàgina principal amb la càmera i detecció d'objectes
 */
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage
  }
];

// Crear el router amb l'historial del navegador
// import.meta.env.BASE_URL prové de la configuració de Vite
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;

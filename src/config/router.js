import { createWebHistory, createRouter } from 'vue-router'

const routes = [
  { path: '/about', name:'about', component: () => import('../views/AboutView.vue') },
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/folder/:catchAll(.*)', name: 'folder', component: () => import('../views/HomeView.vue') },
  //Error 404
  { path: '/:catchAll(.*)', component: () => import('../views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
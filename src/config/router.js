import { createWebHistory, createRouter } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/about', component: () => import('../views/AboutView.vue') },
  //Error 404
  { path: '/:catchAll(.*)', component: () => import('../views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
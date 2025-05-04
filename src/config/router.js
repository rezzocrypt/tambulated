import { createWebHistory, createRouter } from 'vue-router'

import HomeView from '../views/HomeView.vue'
import AboutView from '../views/AboutView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const routes = [
  { path: '/', name:"Home", component: HomeView },
  { path: '/about', component: AboutView },
  {
    path: '/:catchAll(.*)',
    name: '404',
    component: NotFoundView
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
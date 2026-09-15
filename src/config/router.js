import { createWebHashHistory, createRouter } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/BookmarkView.vue') },
  { path: '/index.html', component: () => import('../views/BookmarkView.vue') },
  { path: '/about.html', name:'about', component: () => import('../views/AboutView.vue') },
  //обработка закладок
  { path: '/folder/:catchAll(.*)', name: 'folder', component: () => import('../views/BookmarkView.vue') },
  //Error 404
  { path: '/:catchAll(.*)', component: () => import('../views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
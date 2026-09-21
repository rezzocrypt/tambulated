import { createWebHashHistory, createRouter } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/BookmarkView.vue') },
  { path: '/index.html', component: () => import('../views/BookmarkView.vue') },
  { path: '/tasks', name: 'tasks', component: () => import('../views/KanbanView.vue') },
  { path: '/tasks.html', component: () => import('../views/KanbanView.vue') },
  { path: '/about.html', name:'about', component: () => import('../views/AboutView.vue') },
  //Error 404
  { path: '/:catchAll(.*)', component: () => import('../views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
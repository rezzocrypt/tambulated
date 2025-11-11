import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './config/router'
import ContextMenu from '@imengyu/vue3-context-menu'

const app = createApp(App)
app.use(ContextMenu)
app.use(router)
app.mount('#app')
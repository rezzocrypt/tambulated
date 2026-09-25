import './assets/main.css'
import './assets/toolbar.css'
import '@fontsource/press-start-2p/400.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './config/router'
import ContextMenu from '@imengyu/vue3-context-menu'
import { initializeTheme } from './composables/useTheme.js'
import { initializeLocale } from './composables/useLocale.js'

initializeTheme()
initializeLocale()

const app = createApp(App)
app.use(ContextMenu)
app.use(router)
app.mount('#app')
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { queryClient } from './queries/client'

const app = createApp(App)

// Pinia holds client state only — the session. Everything the server owns lives
// in the query cache.
app.use(createPinia())
app.use(VueQueryPlugin, { queryClient })
app.use(router)

app.mount('#app')

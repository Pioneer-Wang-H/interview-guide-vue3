import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './index.css'

// 初始化深色模式（避免页面闪烁）
;(function initTheme() {
  const stored = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = stored === 'dark' || (!stored && prefersDark)
  if (isDark) {
    document.documentElement.classList.add('dark')
  }
})()

const app = createApp(App)
app.use(router)
app.mount('#app')

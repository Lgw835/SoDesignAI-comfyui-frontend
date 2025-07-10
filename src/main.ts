import '@comfyorg/litegraph/style.css'
import { definePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'
import * as Sentry from '@sentry/vue'
import { initializeApp } from 'firebase/app'
import { createPinia } from 'pinia'
import 'primeicons/primeicons.css'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import Tooltip from 'primevue/tooltip'
import { createApp } from 'vue'
import { VueFire, VueFireAuth } from 'vuefire'

import '@/assets/css/style.css'
import { FIREBASE_CONFIG } from '@/config/firebase'
import router from '@/router'
import { useJwtAuthStore } from '@/stores/jwtAuthStore'
// 在开发环境下导入测试token工具
import '@/utils/testToken'

import App from './App.vue'
import { i18n } from './i18n'

const ComfyUIPreset = definePreset(Aura, {
  semantic: {
    // @ts-expect-error fixme ts strict error
    primary: Aura['primitive'].blue
  }
})

const firebaseApp = initializeApp(FIREBASE_CONFIG)

const app = createApp(App)
const pinia = createPinia()
Sentry.init({
  app,
  dsn: __SENTRY_DSN__,
  enabled: __SENTRY_ENABLED__,
  release: __COMFYUI_FRONTEND_VERSION__,
  integrations: [],
  autoSessionTracking: false,
  defaultIntegrations: false,
  normalizeDepth: 8,
  tracesSampleRate: 0
})
app.directive('tooltip', Tooltip)
app
  .use(router)
  .use(PrimeVue, {
    theme: {
      preset: ComfyUIPreset,
      options: {
        prefix: 'p',
        cssLayer: {
          name: 'primevue',
          order: 'primevue, tailwind-utilities'
        },
        // This is a workaround for the issue with the dark mode selector
        // https://github.com/primefaces/primevue/issues/5515
        darkModeSelector: '.dark-theme, :root:has(.dark-theme)'
      }
    }
  })
  .use(ConfirmationService)
  .use(ToastService)
  .use(pinia)
  .use(i18n)
  .use(VueFire, {
    firebaseApp,
    modules: [VueFireAuth()]
  })

// Initialize JWT authentication before mounting the app
const initializeComfyUIApp = async () => {
  try {
    const jwtAuthStore = useJwtAuthStore()

    // Initialize JWT authentication
    const isJwtAuthenticated = await jwtAuthStore.initialize()

    // Log authentication status for debugging
    console.log('JWT Authentication Status:', {
      isAuthenticated: isJwtAuthenticated,
      hasToken: !!jwtAuthStore.currentToken,
      user: jwtAuthStore.currentUser
    })

    // 强制要求JWT认证 - 无论开发环境还是生产环境
    if (!isJwtAuthenticated && !jwtAuthStore.currentToken) {
      // Check if there's a token in URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')

      if (!token) {
        // No token available, show error and stop app initialization
        console.log('❌ 访问被拒绝：未提供JWT令牌')
        document.body.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            margin: 0;
            padding: 20px;
          ">
            <div style="
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              max-width: 500px;
            ">
              <h1 style="color: #e74c3c; margin-bottom: 20px;">🔒 访问被拒绝</h1>
              <p style="color: #7f8c8d; margin-bottom: 30px; line-height: 1.6;">
                此ComfyUI实例需要有效的JWT认证令牌才能访问。<br>
                请通过SoDesign.AI系统的正确入口访问。
              </p>
              <a href="http://192.168.1.17:5000/login.html"
                 style="
                   display: inline-block;
                   background: #3498db;
                   color: white;
                   padding: 12px 24px;
                   text-decoration: none;
                   border-radius: 5px;
                   font-weight: bold;
                 ">
                前往SoDesign.AI登录
              </a>
            </div>
          </div>
        `
        return
      }
    }

    // 显示认证状态信息
    if (isJwtAuthenticated) {
      console.log('✅ JWT认证成功，允许访问')
    } else {
      console.log('⚠️ JWT认证失败，但检测到令牌参数，尝试重新验证...')
    }

    // Mount the app
    app.mount('#vue-app')
  } catch (error) {
    console.error('Application initialization error:', error)
    // Mount the app anyway to show error state
    app.mount('#vue-app')
  }
}

// Start the application
initializeComfyUIApp()

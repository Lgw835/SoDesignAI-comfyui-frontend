import vue from '@vitejs/plugin-vue'
import dotenv from 'dotenv'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { type UserConfig, defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import vueDevTools from 'vite-plugin-vue-devtools'

import { comfyAPIPlugin, generateImportMapPlugin } from './build/plugins'

dotenv.config()

const IS_DEV = process.env.NODE_ENV === 'development'
const SHOULD_MINIFY = process.env.ENABLE_MINIFY === 'true'
// vite dev server will listen on all addresses, including LAN and public addresses
const VITE_REMOTE_DEV = process.env.VITE_REMOTE_DEV === 'true'
const DISABLE_TEMPLATES_PROXY = process.env.DISABLE_TEMPLATES_PROXY === 'true'
const DISABLE_VUE_PLUGINS = process.env.DISABLE_VUE_PLUGINS === 'true'

const DEV_SERVER_COMFYUI_URL =
  process.env.DEV_SERVER_COMFYUI_URL || 'http://127.0.0.1:8188'
const DEV_SERVER_MONGODB_API_URL =
  process.env.DEV_SERVER_MONGODB_API_URL || 'http://192.168.1.17:5000'

export default defineConfig({
  base: '',
  server: {
    host: '0.0.0.0', // 绑定到所有网络接口，允许内网和公网访问
    port: 5173, // 明确指定端口
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.1.17',
      '100.101.71.12',
      'sodesign.youthspire.cn',
      'workflow.youthspire.cn'
    ],
    cors: {
      origin: [
        'https://sodesign.youthspire.cn',
        'https://workflow.youthspire.cn',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://192.168.1.17:5173',
        'http://192.168.1.17:5174',
        'http://100.101.71.12:5173',
        'http://100.101.71.12:5174',
        true // 允许其他来源
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'X-Frame-Options']
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true'
    },
    middlewareMode: false,
    // 添加中间件来处理CORS预检请求
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const origin = req.headers.origin

        // 允许的域名列表
        const allowedOrigins = [
          'https://sodesign.youthspire.cn',
          'https://workflow.youthspire.cn',
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://192.168.1.17:5173',
          'http://100.101.71.12:5173'
        ]

        // 动态设置CORS头部
        if (origin && allowedOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin)
        } else {
          res.setHeader('Access-Control-Allow-Origin', '*')
        }

        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With')
        res.setHeader('Access-Control-Allow-Credentials', 'true')

        // 支持iframe嵌入的安全头部
        res.setHeader('X-Frame-Options', 'SAMEORIGIN')
        res.setHeader('Content-Security-Policy', 'frame-ancestors \'self\' https://sodesign.youthspire.cn https://workflow.youthspire.cn')

        // 处理OPTIONS预检请求
        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        next()
      })
    },
    proxy: {
      '/internal': {
        target: DEV_SERVER_COMFYUI_URL,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*'
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
          })
        }
      },

      '/api/comfyui': {
        target: DEV_SERVER_MONGODB_API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/comfyui/, '/api/comfyui'),
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*'
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
          })
        }
      },

      '/api': {
        target: DEV_SERVER_COMFYUI_URL,
        changeOrigin: true,
        // Return empty array for extensions API as these modules
        // are not on vite's dev server.
        bypass: (req, res, _options) => {
          if (req.url === '/api/extensions') {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With')
            res.end(JSON.stringify([]))
          }
          return null
        },
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*'
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
          })
        }
      },

      '/ws': {
        target: DEV_SERVER_COMFYUI_URL,
        ws: true,
        changeOrigin: true
      },

      '/workflow_templates': {
        target: DEV_SERVER_COMFYUI_URL,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*'
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
          })
        }
      },

      // Proxy extension assets (images/videos) under /extensions to the ComfyUI backend
      '/extensions': {
        target: DEV_SERVER_COMFYUI_URL,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*'
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
          })
        }
      },

      // Proxy docs markdown from backend
      '/docs': {
        target: DEV_SERVER_COMFYUI_URL,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*'
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
          })
        }
      },

      ...(!DISABLE_TEMPLATES_PROXY
        ? {
            '/templates': {
              target: DEV_SERVER_COMFYUI_URL,
              changeOrigin: true,
              configure: (proxy, _options) => {
                proxy.on('proxyRes', (proxyRes, req, res) => {
                  proxyRes.headers['Access-Control-Allow-Origin'] = '*'
                  proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                  proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
                })
              }
            }
          }
        : {}),

      '/testsubrouteindex': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path.substring('/testsubrouteindex'.length),
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*'
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
          })
        }
      }
    }
  },

  plugins: [
    ...(!DISABLE_VUE_PLUGINS
      ? [vueDevTools(), vue(), createHtmlPlugin({})]
      : [vue()]),
    comfyAPIPlugin(IS_DEV),
    generateImportMapPlugin([
      {
        name: 'vue',
        pattern: 'vue',
        entry: './dist/vue.esm-browser.prod.js'
      },
      {
        name: 'vue-i18n',
        pattern: 'vue-i18n',
        entry: './dist/vue-i18n.esm-browser.prod.js'
      },
      {
        name: 'primevue',
        pattern: /^primevue\/?.*/,
        entry: './index.mjs',
        recursiveDependence: true
      },
      {
        name: '@primevue/themes',
        pattern: /^@primevue\/themes\/?.*/,
        entry: './index.mjs',
        recursiveDependence: true
      },
      {
        name: '@primevue/forms',
        pattern: /^@primevue\/forms\/?.*/,
        entry: './index.mjs',
        recursiveDependence: true,
        override: {
          '@primeuix/forms': {
            entry: ''
          }
        }
      }
    ]),

    Icons({
      compiler: 'vue3'
    }),

    Components({
      dts: true,
      resolvers: [IconsResolver()],
      dirs: ['src/components', 'src/layout', 'src/views'],
      deep: true,
      extensions: ['vue']
    })
  ],

  build: {
    minify: SHOULD_MINIFY ? 'esbuild' : false,
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      // Disabling tree-shaking
      // Prevent vite remove unused exports
      treeshake: false
    }
  },

  esbuild: {
    minifyIdentifiers: false,
    keepNames: true,
    minifySyntax: SHOULD_MINIFY,
    minifyWhitespace: SHOULD_MINIFY
  },

  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts']
  },

  define: {
    __COMFYUI_FRONTEND_VERSION__: JSON.stringify(
      process.env.npm_package_version
    ),
    __SENTRY_ENABLED__: JSON.stringify(
      !(process.env.NODE_ENV === 'development' || !process.env.SENTRY_DSN)
    ),
    __SENTRY_DSN__: JSON.stringify(process.env.SENTRY_DSN || ''),
    __ALGOLIA_APP_ID__: JSON.stringify(process.env.ALGOLIA_APP_ID || ''),
    __ALGOLIA_API_KEY__: JSON.stringify(process.env.ALGOLIA_API_KEY || ''),
    __USE_PROD_CONFIG__: process.env.USE_PROD_CONFIG === 'true'
  },

  resolve: {
    alias: {
      '@': '/src'
    }
  },

  optimizeDeps: {
    exclude: ['@comfyorg/litegraph', '@comfyorg/comfyui-electron-types']
  }
}) satisfies UserConfig as UserConfig

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 開発時は /api へのリクエストをバックエンド（Spring Boot）へ転送する。
    // ブラウザからは同じオリジン（localhost:5173）への通信に見えるので、CORS の設定が要らない
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// 前端开发端口 5173
// /api 代理到 Arca 海外后端（对齐 popop-fe 方案）
// /local-api 代理到本地临时后端（AI 代理等暂未迁移的接口）
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/local-api': {
        target: 'http://127.0.0.1:9527',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/local-api/, '/api'),
      },
      '/api': {
        target: 'https://i18n-api.imaginewithu.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
})

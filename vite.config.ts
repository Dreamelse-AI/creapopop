import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// 前端开发端口 5173，API 请求代理到本地 Node 后端 9527
// Arca 路径 /arca 代理到 preview 后端（联调时 VITE_API_BASE_URL=/arca）
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
      '/api': {
        target: 'http://127.0.0.1:9527',
        changeOrigin: true,
      },
      '/arca': {
        target: 'https://api-preview-2603.imaginewithu.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/arca/, ''),
        secure: true,
      },
    },
  },
})

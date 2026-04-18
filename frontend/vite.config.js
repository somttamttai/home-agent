import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 로컬 개발: /api → Vercel 배포된 API 프록시
// 프로덕션 (Vercel): /api → 같은 도메인 (Serverless Functions)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://home-agent-ochre.vercel.app',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})

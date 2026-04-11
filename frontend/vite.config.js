import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 로컬 개발: /api → http://localhost:8000 프록시 (FastAPI)
// 프로덕션 (Vercel): /api → 같은 도메인 (Serverless Functions)
// 빌드된 번들은 상대경로 fetch('/api/...') 이므로 별도 설정 불필요.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})

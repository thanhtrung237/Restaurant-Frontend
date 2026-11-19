import path from 'node:path'
import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DEV_')
  const { DEV_HTTPS_CERT, DEV_HTTPS_KEY } = env
  const backend = env.DEV_BACKEND_ORIGIN || 'http://127.0.0.1:8080'
  if (Boolean(DEV_HTTPS_CERT) !== Boolean(DEV_HTTPS_KEY)) {
    throw new Error('Set both DEV_HTTPS_CERT and DEV_HTTPS_KEY to enable HTTPS.')
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0', // Cho phép truy cập từ các thiết bị khác trong mạng
      port: 5173,
      strictPort: true,
      https: DEV_HTTPS_CERT && DEV_HTTPS_KEY
        ? { cert: readFileSync(DEV_HTTPS_CERT), key: readFileSync(DEV_HTTPS_KEY) }
        : undefined,
      proxy: {
        '/api/v1': { target: backend, changeOrigin: true },
        '/ws': { target: backend, changeOrigin: true, ws: true },
      },
    },
  }
})

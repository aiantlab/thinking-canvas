import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { scapiVitePlugin } from './scapiVitePlugin.ts'

export default defineConfig({
  base: '/thinking-canvas/',
  plugins: [react(), tailwindcss(), scapiVitePlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  appType: 'spa',
  define: {
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  optimizeDeps: {
    exclude: ['@aztec/bb.js'],
    esbuildOptions: {
      inject: ['./buffer-shim.js'],
    },
  },
})

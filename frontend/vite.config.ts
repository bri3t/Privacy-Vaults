import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // circomlibjs → blake-hash needs Buffer in the browser
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      // Point Node's buffer to the browser polyfill
      buffer: 'buffer/',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Inject Buffer global so CommonJS deps like blake-hash find it
      inject: ['./buffer-shim.js'],
    },
  },
})

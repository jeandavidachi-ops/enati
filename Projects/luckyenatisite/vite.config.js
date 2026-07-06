import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SPA React servie par Vite en dev (proxy /api + /health -> Flask sur 8080).
// Build -> dist/ (servi par Flask en prod, cf. server.py fallback SPA).
export default defineConfig({
  plugins: [react()],
  // Dossier des assets statiques (images) servis à la racine : /images/...
  publicDir: 'static',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})

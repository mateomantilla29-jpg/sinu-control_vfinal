import { defineConfig } from 'vite';

// La API (Flask, puerto 5000) se sirve a traves del mismo origen de la SPA (5173):
// asi no hay problemas de CORS ni bloqueos del navegador entre puertos.
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
});

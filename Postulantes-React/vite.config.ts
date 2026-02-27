import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    },
    // IMPORTANTE: allowedHosts solo para Vite 6+
    allowedHosts: ['serecipeb-subnacionales.duckdns.org', 'localhost'],

    hmr: {
      protocol: 'wss',
      host: 'serecipeb-subnacionales.duckdns.org',
      clientPort: 443          // ⭐ Evita fallback a localhost:3000
    }
  }
});


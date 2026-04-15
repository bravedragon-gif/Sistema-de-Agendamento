import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxy = {
  '/api': 'http://127.0.0.1:5000',
  '/admin/google': 'http://127.0.0.1:5000'
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: apiProxy
  },
  preview: {
    port: 4173,
    proxy: apiProxy
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});

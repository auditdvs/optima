import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    allowedHosts: [
      'minds-tsunami-mpeg-dis.trycloudflare.com',
      '.trycloudflare.com', // Allow all Cloudflare tunnel subdomains
    ],
  },
  build: {
    outDir: 'dist', // Pastikan output ke "dist"
    chunkSizeWarningLimit: 500, // Atur ulang batas peringatan chunk
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

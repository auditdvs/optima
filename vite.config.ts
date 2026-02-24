import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Expose to network
    allowedHosts: [
      'minds-tsunami-mpeg-dis.trycloudflare.com',
      '.trycloudflare.com', // Allow all Cloudflare tunnel subdomains
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 500,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

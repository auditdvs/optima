import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist', // Pastikan output ke "dist"
    chunkSizeWarningLimit: 500, // Atur ulang batas peringatan chunk
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

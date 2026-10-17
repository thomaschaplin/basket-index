import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { charts: ['recharts'], pdf: ['pdfjs-dist'], motion: ['framer-motion'] },
      },
    },
  },
  test: { environment: 'node' },
});

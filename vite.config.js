import { defineConfig } from 'vite';

// base relativa: lo stesso build funziona su GitHub Pages (/print-badge/) e sul dominio principale.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  // Raíz del proyecto: index.html en la raíz
  root: '.',

  // Directorio de salida del build
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Vite 8 usa oxc como transpilador por defecto (no esbuild)
    minify: 'oxc',
    target: 'es2020',
    // Separar chunks para mejor caché
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  // Servidor de desarrollo
  server: {
    port: 3000,
    open: false,
    host: true,
  },

  // Preview (producción local)
  preview: {
    port: 3000,
    host: true,
  },
});

import { defineConfig } from 'vite';
import singleFile from 'vite-plugin-singlefile';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      input: 'index.html',
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    singleFile({
      removeViteModuleLoader: true,
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
});
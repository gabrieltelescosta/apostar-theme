import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  publicDir: false,
  build: {
    outDir: 'cdn.mnply.com.br/apostar',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      input: resolve(__dirname, 'src/widget.ts'),
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'widget.js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
})

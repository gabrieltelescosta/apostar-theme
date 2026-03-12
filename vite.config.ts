import { defineConfig } from 'vite'
import { resolve } from 'path'
import { cpSync } from 'fs'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  publicDir: false,
  server: {
    fs: {
      allow: ['.'],
    },
  },
  plugins: [
    {
      name: 'copy-config',
      writeBundle() {
        cpSync(resolve(__dirname, 'config'), resolve(__dirname, 'dist/config'), {
          recursive: true,
        })
      },
    },
    {
      name: 'serve-config',
      configureServer(server) {
        server.middlewares.use('/config', (req, res, next) => {
          const filePath = resolve(__dirname, 'config', req.url!.replace(/^\//, ''))
          import('fs').then(({ existsSync, readFileSync }) => {
            if (existsSync(filePath)) {
              res.setHeader('Content-Type', 'application/json')
              res.end(readFileSync(filePath, 'utf-8'))
            } else {
              next()
            }
          })
        })
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2017',
    rollupOptions: {
      input: resolve(__dirname, 'src/widget.ts'),
      output: {
        format: 'iife',
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

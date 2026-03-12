import { defineConfig } from 'vite'
import { resolve } from 'path'
import { cpSync } from 'fs'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  publicDir: 'config-public',
  server: {
    fs: {
      allow: ['.'],
    },
  },
  plugins: [
    {
      name: 'copy-config',
      writeBundle() {
        cpSync(
          resolve(__dirname, 'config'),
          resolve(__dirname, 'cdn.mnply.com.br/apostar/config'),
          { recursive: true },
        )
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
    outDir: 'cdn.mnply.com.br/apostar',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      input: resolve(__dirname, 'src/widget.ts'),
      output: {
        entryFileNames: 'widget.js',
        chunkFileNames: 'modules/[name].[hash].js',
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

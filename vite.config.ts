import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isMobile = process.env.MOBILE === 'true'

  return {
    plugins: [
      react(),
      ...(!isMobile
        ? [
            electron([
              {
                entry: 'electron/main.ts',
                onstart(options) {
                  options.startup()
                },
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      external: ['better-sqlite3']
                    }
                  }
                }
              },
              {
                entry: 'electron/preload.ts',
                onstart(options) {
                  options.reload()
                },
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      external: ['better-sqlite3']
                    }
                  }
                }
              }
            ]),
            renderer()
          ]
        : [])
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'framer-motion'],
            'vendor-ui': ['lucide-react', 'recharts'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable']
          }
        }
      }
    }
  }
})

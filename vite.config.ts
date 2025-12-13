import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries - always present
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI icons (large) - always present  
          'vendor-icons': ['lucide-react'],
          // Charts - always present
          'vendor-charts': ['recharts'],
        }
      }
    },
    chunkSizeWarningLimit: 600, // Raise warning threshold slightly
  },
  server: {
    port: 3002,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3012',
        changeOrigin: true,
        secure: false
      },
      '/files': {
        target: 'http://localhost:3012',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
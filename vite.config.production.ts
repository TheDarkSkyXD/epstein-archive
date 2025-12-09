import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { config } from './src/config'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    open: true,
    proxy: {
      '/api': {
        target: `http://localhost:${config.apiPort}`,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Production optimizations
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'utils': ['date-fns', 'fuse.js'],
        },
      },
    },
    // Code splitting
    chunkSizeWarningLimit: 1000,
  },
  // Performance optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts', 'date-fns'],
  },
  // Environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(config.nodeEnv),
  },
})

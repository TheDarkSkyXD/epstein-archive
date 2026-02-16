import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@client': path.resolve(__dirname, 'src/client'),
      '@server': path.resolve(__dirname, 'src/server'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_DATE__: JSON.stringify(
      new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    ),
  },
  plugins: [
    react(),
    visualizer({
      open: false,
      filename: 'bundle-analysis.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Keep truly massive/isolated libraries separate
            if (id.includes('react-pdf') || id.includes('pdfjs-dist')) return 'vendor-pdf';
            if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
            if (id.includes('lucide-react')) return 'vendor-icons';

            // Everything else in node_modules goes to vendor
            // This ensures React and its core ecosystem stay together
            return 'vendor';
          }

          // Feature-based grouping for our own source code
          if (id.includes('src/client/components/Investigation')) {
            return 'feature-investigation';
          }
          if (
            id.includes('src/client/components/Media') ||
            id.includes('src/client/components/Photo')
          ) {
            return 'feature-media';
          }
          if (id.includes('src/client/components/email')) {
            return 'feature-email';
          }
          if (id.includes('src/client/components/Document')) {
            return 'feature-documents';
          }
          if (id.includes('src/client/components/NetworkVisualization')) {
            return 'feature-network';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: true,
  },
  server: {
    port: 3002,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3012',
        changeOrigin: true,
        secure: false,
      },
      '/files': {
        target: 'http://localhost:3012',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

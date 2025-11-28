import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  // Define environment variables
  define: {
    // This prevents the 'process is not defined' error
    'process.env': {}
  },
  
  // Optimize dependencies
  optimizeDeps: {
    exclude: ['occt-import-js']
  },
  
  // Include WASM files
  assetsInclude: ['**/*.wasm'],
  
  // Server configuration
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to backend during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/converted': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { 'process.env': {} },
  optimizeDeps: { exclude: ['occt-import-js'] },
  assetsInclude: ['**/*.wasm'],
  build: {
    outDir: 'dist',       // Production build folder
    chunkSizeWarningLimit: 2000
  }
  // server section removed for deployment
})

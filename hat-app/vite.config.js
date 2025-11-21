import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/hat-app/', // GitHub Pages base path - must match deployment path
  server: {
    host: true, // Allow external connections (for mobile testing)
    port: 5173
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure absolute paths are used
    rollupOptions: {
      output: {
        // Ensure consistent path resolution
        assetFileNames: 'assets/[name]-[hash][extname]',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js'
      }
    }
  }
})


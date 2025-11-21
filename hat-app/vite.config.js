import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/hat-app/', // GitHub Pages base path
  server: {
    host: true, // Allow external connections (for mobile testing)
    port: 5173
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})


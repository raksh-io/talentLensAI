import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/analyze': 'http://localhost:8000',
      '/jobs': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/recruiter/candidates': 'http://localhost:8000',
      '/recruiter/create-job': 'http://localhost:8000',
    }
  }
})

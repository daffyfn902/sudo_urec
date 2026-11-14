import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // FastAPI backend (uvicorn backend.main:app --port 8000). If it isn't running,
    // src/services/api.ts falls back to the mock data.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})

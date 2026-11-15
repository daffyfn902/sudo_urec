import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Listen on the local network too, so a phone (Expo Go app in mobile/) can open the dev server
    host: true,
    // FastAPI backend (uvicorn backend.main:app --port 8000). If it isn't running,
    // src/services/api.ts falls back to the mock data.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  // `npm run preview` serves the production build the same way (Vercel routes /api to the backend itself)
  preview: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})

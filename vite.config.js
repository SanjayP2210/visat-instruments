import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Local development: forward /api to the Express server (server/ → npm run dev) so the
// browser talks to a single origin, exactly like production on Vercel.
const apiProxy = {
  '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:5000', changeOrigin: false },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: apiProxy,
  },
  // Allow temporary public share links (localhost.run / Cloudflare tunnels) to reach the preview server.
  preview: {
    allowedHosts: ['.lhr.life', '.trycloudflare.com'],
    proxy: apiProxy,
  },
})

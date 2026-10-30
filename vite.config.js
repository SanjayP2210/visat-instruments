import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Allow temporary public share links (localhost.run / Cloudflare tunnels) to reach the preview server.
  preview: {
    allowedHosts: ['.lhr.life', '.trycloudflare.com'],
  },
})

import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const N8N_TARGET = process.env.VITE_N8N_URL ?? 'http://localhost:5678';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // n8n Form Trigger — production (workflow ACTIVE toggle ON)
      //   GET  /n8n/form/<id>       → shows the n8n-hosted form page
      //   POST /n8n/form/<id>       → submits form data into the workflow
      '/n8n/form': {
        target: N8N_TARGET,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/n8n/, ''),
        secure: false,
      },
      // n8n Form Trigger — test mode (workflow open in n8n editor, listening)
      //   POST /n8n/form-test/<id>  → same as above but for test executions
      '/n8n/form-test': {
        target: N8N_TARGET,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/n8n/, ''),
        secure: false,
      },
      // Generic webhook fallback (for Webhook nodes, not Form Trigger)
      '/n8n/webhook': {
        target: N8N_TARGET,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/n8n/, ''),
        secure: false,
      },
      // Express API backend (candidates / stats from PostgreSQL)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署到 https://<user>.github.io/AimSense/
  base: process.env.GITHUB_ACTIONS ? '/AimSense/' : '/',
  server: {
    port: 5173,
    strictPort: false,
  },
})

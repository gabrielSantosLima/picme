import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/picme/' : '/',
  plugins: [react(), tailwindcss()],
}))

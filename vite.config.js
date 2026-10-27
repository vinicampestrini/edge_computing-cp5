
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/sth-api': {
        target: 'http://34.201.100.78:8666',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sth-api/, ''),
      },
    },
  },
})

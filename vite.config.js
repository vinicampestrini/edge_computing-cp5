
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/sth-api': {
        target: 'http://3.94.168.155:8666',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sth-api/, ''),
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev
export default defineConfig({
  plugins: [react()],
  define: {
    // This fixes the "React is not defined" error
    'global': 'window',
  },
})

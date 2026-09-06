import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Pin the dev port — localStorage (which holds the Firebase session)
    // is scoped to the origin (host + port). If Vite hopped ports, the
    // session would appear to "log out" the user on refresh.
    port: 5173,
    strictPort: true,
  },
})

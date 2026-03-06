import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000, // Cambia el 3000 por el puerto que prefieras
    strictPort: true, // Opcional: si el puerto está ocupado, la app se cierra en lugar de buscar otro
  }
})

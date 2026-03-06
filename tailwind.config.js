/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Nombres personalizados para tu taller
        'taller-dark': '#0f172a',   // Fondo oscuro
        'taller-primary': '#3b82f6', // Color principal (botones, enlaces)
        'taller-bg': '#f1f5f9',      // Fondo gris clarito para el contenido
      },
    },
  },
  plugins: [],
}
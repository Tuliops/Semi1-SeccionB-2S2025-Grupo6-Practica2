/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Podemos extender colores si necesitamos tonos específicos
        dark: {
          50: '#fafafa',
          900: '#111827',
          950: '#030712'
        }
      }
    },
  },
  plugins: [],
}
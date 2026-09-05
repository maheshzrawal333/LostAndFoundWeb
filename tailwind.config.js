/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          lightest: '#E3F2FD', // 50
          light: '#90CAF9',    // 200
          primary: '#2196F3',  // 500
          dark: '#0D47A1',     // 900
        },
        background: '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sec-dark': '#0d1117',
        'sec-panel': '#161b22',
        'sec-accent': '#2f81f7',
        'sec-border': '#30363d',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Still needed, but placed differently
  theme: {
    extend: {
      colors: {
        // You can extend with custom colors if needed
      },
    },
  },
  plugins: [],
}
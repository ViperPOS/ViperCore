/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: '#F2EAE3',
        warmGray: '#D0C9C3',
        signalRed: '#FF073A',
        ink: '#131211',
        black: '#000000',
      },
    },
  },
  plugins: [],
}
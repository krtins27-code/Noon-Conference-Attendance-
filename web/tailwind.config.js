/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          600: "#1e3a8a",
          700: "#1e2f6e",
        },
      },
    },
  },
  plugins: [],
};

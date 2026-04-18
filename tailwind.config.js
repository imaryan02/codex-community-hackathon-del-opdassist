/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          600: "#0891b2",
          700: "#0e7490",
          900: "#164e63"
        }
      }
    },
  },
  plugins: [],
};

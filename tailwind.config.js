/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    fontFamily: {
      sans: ["Inter", "ui-sans-serif", "system-ui"],
      body: ["Nunito", "ui-sans-serif", "system-ui"],
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1a365d",
          light: "#2c4f82",
          dark: "#102a4c",
        },
        secondary: {
          DEFAULT: "#ff6b35",
          light: "#ff8c5a",
          dark: "#e55a2a",
        },
        success: {
          DEFAULT: "#48bb78",
          light: "#68d391",
          dark: "#38a169",
        },
        neutral: {
          DEFAULT: "#f7fafc",
          light: "#ffffff",
          dark: "#e2e8f0",
        },
      },
    },
  },
  plugins: [],
}


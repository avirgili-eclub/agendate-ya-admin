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
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "zoom-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "zoom-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-8px)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(8px)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-from-left": {
          from: { transform: "translateX(-8px)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-from-right": {
          from: { transform: "translateX(8px)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        in: "fade-in 200ms ease-out",
        out: "fade-out 150ms ease-in",
        "zoom-in": "zoom-in 200ms ease-out",
        "zoom-out": "zoom-out 150ms ease-in",
      },
    },
  },
  plugins: [],
}


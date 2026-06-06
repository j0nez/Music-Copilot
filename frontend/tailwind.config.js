/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          200: "#bac8ff",
          300: "#91a7ff",
          400: "#748ffc",
          500: "#5c7cfa",
          600: "#4c6ef5",
          700: "#4263eb",
          800: "#3b5bdb",
          900: "#364fc7",
        },
        accent: {
          50: "#ebfff2",
          100: "#cdffdf",
          200: "#a0ffc5",
          300: "#73ffb8",
          400: "#2dd4a8",
          500: "#14b890",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        surface: {
          50: "#f8f9fa",
          100: "#f1f3f5",
          200: "#e9ecef",
          700: "#343a40",
          800: "#212529",
          900: "#0d1b2a",
        },
      },
      fontFamily: {
        heading: ["Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Cascadia Code", "monospace"],
      },
    },
  },
  plugins: [],
};

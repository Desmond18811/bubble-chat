/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#b3ace9",
        "app-dark": "#161616",
        purple: "#6c5ce7",
        "purple-light": "#efedfb",
        "purple-soft": "#eae7fa",
        "purple-text": "#6c5ce7",
        "accent-orange": "#f4663b",
        ink: "#1f2030",
        "ink-soft": "#9a9aab",
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        cream: "#FAF7F2",
        ink: "#1A1A1A",
        burgundy: "#81021f",
        ancora: "#4a0b1c",
        border: "#E8E4DC",
        card: "#FFFFFF",
        muted: "#6B6B6B",
        mutedLight: "#B8B2A4",
        scrollbarThumb: "#D6D1C6",
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', "sans-serif"],
        kai: ['"LXGW WenKai"', "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};

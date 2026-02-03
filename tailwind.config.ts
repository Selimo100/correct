import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#fdf2f5",
          100: "#fce7ec",
          200: "#f9cfd9",
          300: "#f3a8b9",
          400: "#ea728f",
          500: "#c93a5f",
          600: "#a62e4c",
          700: "#87263f",
          800: "#6f2237",
          900: "#5d1e30",
        },
      },
      boxShadow: {
        soft: "0 6px 20px -8px rgba(0,0,0,0.15)",
        header: "0 1px 0 rgba(0,0,0,0.06)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
}

export default config

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        marseille: {
          50: "#f0f5ff",
          100: "#e5edff",
          200: "#cddbfe",
          300: "#b4c6fc",
          500: "#1f3c88", // Official Marseille-Échecs Navy Blue
          600: "#193170",
          700: "#142657",
          800: "#0f1c3f",
          900: "#091024",
          accent: "#3b82f6",
        }
      },
    },
  },
  plugins: [],
};
export default config;

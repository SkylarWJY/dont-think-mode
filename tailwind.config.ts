import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#0a0a0b",
          soft: "#141417",
          card: "#17171b",
          line: "#26262c",
        },
        mist: {
          DEFAULT: "#e7e7ea",
          dim: "#a1a1aa",
          faint: "#6b6b73",
        },
        sage: {
          DEFAULT: "#9db8a4",
          deep: "#5f8268",
        },
        amber: {
          DEFAULT: "#d8b48a",
        },
        rose: {
          DEFAULT: "#c98a8a",
        },
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.04)", opacity: "1" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        breathe: "breathe 6s ease-in-out infinite",
        rise: "rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;

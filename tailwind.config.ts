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
        // Channel-based CSS vars so the whole palette can flip light/dark.
        // Values live in globals.css under :root (dark) and .light.
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          card: "rgb(var(--ink-card) / <alpha-value>)",
          line: "rgb(var(--ink-line) / <alpha-value>)",
        },
        mist: {
          DEFAULT: "rgb(var(--mist) / <alpha-value>)",
          dim: "rgb(var(--mist-dim) / <alpha-value>)",
          faint: "rgb(var(--mist-faint) / <alpha-value>)",
        },
        sage: {
          DEFAULT: "rgb(var(--sage) / <alpha-value>)",
          deep: "rgb(var(--sage-deep) / <alpha-value>)",
        },
        amber: {
          DEFAULT: "rgb(var(--amber) / <alpha-value>)",
        },
        rose: {
          DEFAULT: "rgb(var(--rose) / <alpha-value>)",
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

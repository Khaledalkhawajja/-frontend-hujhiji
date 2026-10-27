import type { Config } from "tailwindcss";

// Every colour is a CSS variable (see src/index.css) so light and dark mode share one set of class names.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: token("page"),
        surface: token("surface"),
        subtle: token("subtle"),
        border: token("border"),
        "border-strong": token("border-strong"),
        ink: { DEFAULT: token("ink"), 2: token("ink-2"), muted: token("ink-muted") },
        brand: {
          DEFAULT: token("brand"),
          dark: token("brand-dark"),
          tint: token("brand-tint"),
          ink: token("brand-ink"),
        },
        slate: { DEFAULT: token("slate"), deep: token("slate-deep"), tint: token("slate-tint") },
        ok: { DEFAULT: token("ok"), tint: token("ok-tint") },
        warn: { DEFAULT: token("warn"), tint: token("warn-tint") },
        bad: { DEFAULT: token("bad"), tint: token("bad-tint") },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Noto Sans Arabic"', "system-ui", "sans-serif"],
      },
      borderRadius: { card: "10px", control: "6px" },
      boxShadow: { pop: "0 16px 40px rgb(30 36 39 / 0.16), 0 2px 6px rgb(30 36 39 / 0.06)" },
    },
  },
  plugins: [],
} satisfies Config;

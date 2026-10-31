import type { Config } from "tailwindcss";

const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: c("bg"),
        surface: c("surface"),
        raised: c("raised"),
        line: c("line"),
        ink: c("ink"),
        muted: c("muted"),
        primary: c("primary"),
        "primary-ink": c("primary-ink"),
        accent: c("accent"),
        good: c("good"),
        warn: c("warn"),
        bad: c("bad"),
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "20px" },
      boxShadow: {
        soft: "0 1px 2px rgb(var(--shadow) / 0.06), 0 8px 24px -8px rgb(var(--shadow) / 0.18)",
        lift: "0 2px 4px rgb(var(--shadow) / 0.08), 0 18px 40px -12px rgb(var(--shadow) / 0.28)",
        clay: "inset 0 1px 0 rgb(255 255 255 / 0.25), inset 0 -2px 6px rgb(var(--shadow) / 0.12), 0 10px 24px -10px rgb(var(--shadow) / 0.35)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        glow: { "0%,100%": { boxShadow: "0 0 0 0 rgb(var(--primary) / 0.55)" }, "50%": { boxShadow: "0 0 0 14px rgb(var(--primary) / 0)" } },
        shake: { "0%,100%": { transform: "translateX(0)" }, "25%": { transform: "translateX(-6px)" }, "75%": { transform: "translateX(6px)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite",
        glow: "glow 2.2s ease-in-out infinite",
        shake: "shake 0.32s ease-in-out 2",
        floaty: "floaty 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

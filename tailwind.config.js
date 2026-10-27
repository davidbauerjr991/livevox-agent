// Color tokens come from lyra-ui's single source of truth — never hand-copy
// them (an unconfigured `bg-lyra-*` class silently generates zero CSS). A plain
// relative `require` is used because Tailwind loads this config outside Vite,
// so the `@nicecxone/lyra-ui` alias doesn't apply here.
const lyraColors = require("../lyra-ui/tailwind-tokens.cjs");

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
    // Lyra components carry their own utility classes — scan them too or they render unstyled.
    "../lyra-ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ...lyraColors,
      },
      borderRadius: {
        "lyra-none":  "var(--lyra-radius-none)",
        "lyra-xs":    "var(--lyra-radius-xs)",
        "lyra-sm":    "var(--lyra-radius-sm)",
        "lyra-md":    "var(--lyra-radius-md)",
        "lyra-lg":    "var(--lyra-radius-lg)",
        "lyra-xl":    "var(--lyra-radius-xl)",
        "lyra-round": "var(--lyra-radius-round)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      // Accordion height animation (lyra-ui's Accordion is built on Radix).
      // Hand-copied from lyra-ui/tailwind.config.js — keep in sync.
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 200ms ease-in-out",
        "accordion-up": "accordion-up 200ms ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

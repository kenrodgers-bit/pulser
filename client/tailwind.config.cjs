/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "var(--pulse-surface)",
        "surface-2": "var(--pulse-surface2)",
        accent: "var(--pulse-accent)",
        "accent-2": "var(--pulse-accent2)",
        ink: "var(--pulse-text)",
        muted: "var(--pulse-muted)",
        border: "var(--pulse-border)",
        bg: "var(--pulse-bg)",
        success: "var(--pulse-green)",
        danger: "#ff637d",
        white: "var(--pulse-white)",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        heading: ["Sora", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        glass: "0 4px 24px rgba(0, 0, 0, 0.4)",
        modal: "0 8px 40px rgba(0, 0, 0, 0.6)",
        glow: "0 0 20px rgba(124, 92, 252, 0.25)",
      },
      keyframes: {
        storyPulse: {
          "0%": { boxShadow: "0 0 0 0 rgba(124, 92, 252, 0.4)" },
          "100%": { boxShadow: "0 0 0 6px rgba(124, 92, 252, 0)" },
        },
        presenceBreathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.3)", opacity: "0.6" },
        },
        typingBounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        messageIn: {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        ring: "storyPulse 2s ease-out infinite",
        presence: "presenceBreathe 2s ease-in-out infinite",
        typing: "typingBounce 1s ease-in-out infinite",
        messageIn: "messageIn 200ms ease-out",
        shimmer: "shimmer 1.5s linear infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

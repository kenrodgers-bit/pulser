/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg-base)",
        surface: "var(--bg-surface)",
        "surface-2": "var(--bg-elevated)",
        accent: "var(--unread)",
        "accent-2": "#8134af",
        ink: "var(--text-primary)",
        muted: "var(--text-secondary)",
        border: "var(--border)",
        success: "var(--online)",
        danger: "var(--danger)",
        white: "#ffffff",
      },
      borderRadius: {
        bubble: "18px",
        card: "14px",
        input: "12px",
        media: "14px",
        modal: "20px",
      },
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        heading: ["'DM Serif Display'", "serif"],
        mono: ["'DM Sans'", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.5)",
        modal: "0 8px 40px rgba(0, 0, 0, 0.6)",
        glow: "0 0 20px rgba(221, 42, 123, 0.28)",
      },
      keyframes: {
        storyPulse: {
          "0%": { boxShadow: "0 0 0 0 rgba(221, 42, 123, 0.4)" },
          "100%": { boxShadow: "0 0 0 6px rgba(221, 42, 123, 0)" },
        },
        presenceBreathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.25)", opacity: "0.65" },
        },
        typingBounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        messageIn: {
          from: { opacity: 0, transform: "translateY(14px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        ring: "storyPulse 2s ease-out infinite",
        presence: "presenceBreathe 2s ease-in-out infinite",
        typing: "typingBounce 1s ease-in-out infinite",
        messageIn: "messageIn 200ms ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

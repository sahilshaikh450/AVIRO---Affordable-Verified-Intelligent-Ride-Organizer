/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        aviro: {
          orange:  "#FF6B2B",
          dark:    "#0D0F14",
          card:    "#161A22",
          card2:   "#1E2330",
          border:  "#2A2F3E",
          muted:   "#8B93A8",
          green:   "#22C55E",
          blue:    "#3B82F6",
          purple:  "#A855F7",
          yellow:  "#FBBF24",
        }
      },
      fontFamily: {
        sans:    ["Space Grotesk", "sans-serif"],
        display: ["Syne", "sans-serif"],
      },
      animation: {
        "fade-up":   "fadeUp 0.5s ease both",
        "pulse-dot": "pulseDot 1.5s ease infinite",
        "float":     "float 3s ease-in-out infinite",
        "slide-in":  "slideIn 0.3s ease both",
      },
      keyframes: {
        fadeUp:   { from: { opacity: 0, transform: "translateY(20px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pulseDot: { "0%,100%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.4, transform: "scale(0.6)" } },
        float:    { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        slideIn:  { from: { opacity: 0, transform: "translateX(-16px)" }, to: { opacity: 1, transform: "translateX(0)" } },
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(circle at 50% 0%, rgba(255,107,43,0.12) 0%, transparent 60%)",
      }
    }
  },
  plugins: [],
}

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        aviro: {
          orange: '#000000',
          dark: '#FFFFFF',
          card: '#FFFFFF',
          card2: '#F3F3F3',
          border: '#E8E8E8',
          muted: '#6B6B6B',
          fg: '#000000',
          green: '#05944F',
          blue: '#276EF1',
          purple: '#7356BF',
          yellow: '#B7791F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease backwards',
        'pulse-dot': 'pulseDot 1.5s ease infinite',
        float: 'float 3s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease both',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%,100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(0.6)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        slideIn: {
          from: { opacity: 0, transform: 'translateX(-16px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at 50% 0%, rgba(255,107,43,0.12) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
};

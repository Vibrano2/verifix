/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#16858F',
        wordmark: '#16D4C6',
        navy: '#0E3B40',
        background: '#F4F8F8',
        surface: '#FFFFFF',
        muted: '#94A3B8',
        'dark-bg': '#06151F',
        'dark-surface': '#0E242B',
        'dark-footer': '#06151F',
        gold: {
          DEFAULT: '#F5B700',
          speed: '#F5B700',
          accent: '#F5B700',
        },
        success: '#2E7D32',
        error: '#D32F2F',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px -2px rgba(14, 59, 64, 0.08), 0 4px 6px -1px rgba(14, 59, 64, 0.04)',
        'card-hover': '0 10px 25px -3px rgba(22, 133, 143, 0.15), 0 4px 6px -2px rgba(14, 59, 64, 0.05)',
        'modal': '0 20px 25px -5px rgba(14, 59, 64, 0.2), 0 10px 10px -5px rgba(14, 59, 64, 0.08)',
        'gold-glow': '0 0 15px rgba(250, 184, 4, 0.4)',
      },
      backgroundImage: {
        'splash-radial': 'radial-gradient(circle at center, #184E53 0%, #1A5B61 50%, #0B3033 100%)',
        'primary-gradient': 'linear-gradient(135deg, #16858F 0%, #0E5C63 100%)',
        'gold-gradient': 'linear-gradient(135deg, #FDC80B 0%, #FAB804 50%, #D59F0F 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
        'bounce-light': 'bounceLight 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        bounceLight: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Lora', 'Georgia', 'serif'],
      },
      colors: {
        note: {
          rose: { light: '#fce7f3', DEFAULT: '#f43f5e', dark: '#be123c' },
          amber: { light: '#fef3c7', DEFAULT: '#f59e0b', dark: '#b45309' },
          emerald: { light: '#d1fae5', DEFAULT: '#10b981', dark: '#047857' },
          sky: { light: '#e0f2fe', DEFAULT: '#0ea5e9', dark: '#0369a1' },
          violet: { light: '#ede9fe', DEFAULT: '#8b5cf6', dark: '#6d28d9' },
          slate: { light: '#f1f5f9', DEFAULT: '#64748b', dark: '#334155' },
        },
      },
      animation: {
        'pulse-today': 'pulseToday 0.6s ease-in-out 2',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-out forwards',
        'fade-in': 'fadeIn 0.2s ease-out',
        'toast-in': 'toastIn 0.3s ease-out',
        'toast-out': 'toastOut 0.3s ease-in forwards',
      },
      keyframes: {
        pulseToday: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.8' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        toastIn: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        toastOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

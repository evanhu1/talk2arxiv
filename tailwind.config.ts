import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          '0': '#0c0c0c',
          '1': '#131313',
          '2': '#1a1a1a',
          '3': '#222222',
          '4': '#2a2a2a',
        },
        border: {
          DEFAULT: '#1f1f1f',
          hover: '#333333',
        },
        accent: {
          DEFAULT: '#c49a6c',
          hover: '#d4aa7c',
          muted: 'rgba(196, 154, 108, 0.08)',
        },
        'text-primary': '#e8e4de',
        'text-secondary': '#8a857e',
        'text-tertiary': '#555048',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config

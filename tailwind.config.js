/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        teal: {
          pos: '#006874',
          dark: '#4DD8E6',
          container: '#E0F7FA',
        },
        ink: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        amber: {
          pos: '#D97706',
          container: '#FEF3C7',
          dark: '#FBBF24',
          text: '#92400E'
        },
        emerald: {
          pos: '#059669',
          container: '#D1FAE5',
          text: '#065F46'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace']
      }
    },
  },
  plugins: [],
}

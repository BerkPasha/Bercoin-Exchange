/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ex: {
          bg: '#09080F',
          card: '#110F1C',
          border: '#1E1B30',
          input: '#1E1B30',
          primary: '#8B5CF6',
          green: '#22C55E',
          red: '#F87171',
          tp: '#F1F0F5',
          ts: '#8B849C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

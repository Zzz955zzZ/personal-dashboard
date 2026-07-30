/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'serif'],
      },
      colors: {
        coral: {
          50: '#fef5f4',
          100: '#fde8e5',
          200: '#fad0c9',
          300: '#f5a89d',
          400: '#e85d5d',
          500: '#d43b3a',
          600: '#b52c2b',
          700: '#c2332f',
          800: '#7a1a1a',
          900: '#4a1010',
        },
        ink: '#1c1c1a',
        paper: {
          50: '#fdfcfb',
          100: '#f8f6f3',
          200: '#efeae3',
          300: '#e2dbd0',
          400: '#c9bfaf',
          500: '#9e907e',
          600: '#75695a',
          700: '#554c40',
          800: '#352f28',
          900: '#1c1916',
        },
      },
      letterSpacing: {
        wide2: '0.18em',
      },
    },
  },
  plugins: [],
};

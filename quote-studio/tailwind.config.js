/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        serif: ['Georgia', '"Times New Roman"', 'Songti SC', 'SimSun', 'serif'],
      },
      colors: {
        coral: {
          50: '#faf8f5',
          100: '#f3efe9',
          200: '#e7e0d6',
          300: '#d5ccc0',
          400: '#7d6e5d',
          500: '#5c4f42',
          600: '#3e352c',
          700: '#2f2821',
          800: '#221d18',
          900: '#1a1612',
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

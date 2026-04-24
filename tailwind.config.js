/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        jd: {
          green: {
            50: '#f1f8ee',
            100: '#dbedd3',
            200: '#b8daa8',
            300: '#8ac275',
            400: '#5fa84a',
            500: '#4a9138',
            600: '#367C2B',
            700: '#2b6323',
            800: '#244f1d',
            900: '#1d3f18',
          },
          yellow: {
            50: '#fffde5',
            100: '#fff9b3',
            200: '#fff280',
            300: '#ffe94d',
            400: '#FFDE00',
            500: '#e6c800',
            600: '#b39b00',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

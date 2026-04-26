/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cody: {
          /** Finnish flag field blue (≈ RGB 0, 53, 128) */
          finnish: '#003580',
          'finnish-dark': '#00264d',
          /** Accent gold for highlights and CTAs */
          gold: '#c9a227',
          'gold-light': '#e8d078',
          'gold-dark': '#9a7c1c',
        },
        /** Task Master — robin-egg / Tiffany blue-green */
        tiffany: {
          DEFAULT: '#0ABAB5',
          dark: '#089A94',
          darker: '#067671',
          light: '#D4F0EE',
          surface: '#EEF9F8',
        },
        /** Chorios — Calgary Flames inspired */
        flames: {
          red: '#C8102E',
          'red-dark': '#9E0C24',
          orange: '#F47A38',
          'orange-dark': '#D96528',
          yellow: '#F1BE48',
          'yellow-light': '#FCE8A6',
          dark: '#1A1A1A',
          surface: '#FFF5F0',
          cream: '#FFFBF7',
        },
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

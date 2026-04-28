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
        /** Furries — Squirtle-inspired (soft blue, cream belly, shell brown) */
        squirtle: {
          blue: '#6BB8E8',
          'blue-deep': '#3D8BC7',
          'blue-dark': '#2A6FA3',
          cream: '#F5ECD8',
          'cream-deep': '#E8DCC4',
          shell: '#7A6550',
          'shell-light': '#9A8268',
          surface: '#E8F4FC',
          ink: '#1E3A4C',
        },
        /** Budget Pal — Buffalo Sabres inspired (royal blue & gold) */
        sabres: {
          blue: '#002654',
          'blue-mid': '#003087',
          'blue-bright': '#0038A8',
          gold: '#FDB827',
          'gold-light': '#FFC72C',
          'gold-dark': '#C4A000',
          surface: '#EEF2F8',
          cream: '#F7F9FC',
          ink: '#0A1628',
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
        /** Plant-Based Menu — rich evergreen palette */
        evergreen: {
          DEFAULT: '#1E5631',
          dark: '#154427',
          ink: '#0E2D1A',
          light: '#DCEBDE',
          surface: '#F2F8F2',
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

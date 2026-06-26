/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#C42034',
          dark:    '#A01C2A',
          light:   '#D94455',
          50:      '#FEF2F3',
          100:     '#FDD5D8',
        },
      },
    },
  },
  plugins: [],
}

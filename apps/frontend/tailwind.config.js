/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#fdf2f8', 100: '#fce7f3', 500: '#ec4899', 600: '#db2777', 700: '#be185d' },
        danger: { 500: '#ef4444', 600: '#dc2626' },
        success: { 500: '#22c55e', 600: '#16a34a' },
      },
    },
  },
  plugins: [],
};

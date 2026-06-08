/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: {
            DEFAULT: '#1e3a8a',
            dark: '#172554',
            light: '#dbeafe',
          },
          orange: {
            DEFAULT: '#f97316',
            dark: '#ea580c',
            light: '#ffedd5',
          },
          grey: '#fafafa'
        }
      },
      borderRadius: {
        'bento': '24px',
        'hero': '32px'
      }
    },
  },
  plugins: [],
}

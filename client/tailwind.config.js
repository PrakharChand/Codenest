/** @type {import('tailwindcss').Config} */
export default {
  // Toggle dark/light mode via a root CSS class: class="dark" on <html>
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // Design tokens added in Phase 7 (frontend foundation)
    },
  },
  plugins: [],
}

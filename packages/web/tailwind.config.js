/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0a0a0a',
          card: '#141414',
          elevated: '#1a1a1a',
          hover: '#1e1e1e',
          border: '#2a2a2a',
        },
        accent: {
          DEFAULT: '#6b8afd',
          light: '#8ba4ff',
          dark: '#4a6ae0',
          subtle: 'rgba(107,138,253,0.1)',
        },
        text: {
          DEFAULT: '#f0f0f0',
          secondary: '#a0a0a0',
          muted: '#707070',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
      },
      boxShadow: {
        'glow-subtle': '0 0 25px -5px rgba(107, 138, 253, 0.15)',
        'glow-accent': '0 0 30px -5px rgba(107, 138, 253, 0.25)',
      },
    },
  },
  plugins: [],
};

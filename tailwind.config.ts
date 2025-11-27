// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#2563eb',
          purple: '#7c3aed',
          green: '#16a34a',
          gray: '#374151',
        },
      },
      boxShadow: {
        elevated: '0 10px 25px rgba(0,0,0,0.1)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;

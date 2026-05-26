import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#0d0815',
          900: '#150f24',
          800: '#1e1533',
          700: '#2a1f44',
          600: '#382a58',
        },
        coral: {
          400: '#f0845c',
          500: '#e87040',
          600: '#d45e30',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          900: '#2e1065',
        },
        gold: {
          400: '#e8c547',
          500: '#d4af37',
          600: '#b8962e',
        },
        sage: {
          500: '#5a7a52',
          600: '#4a6a42',
        },
        // Pi fleet agent colors
        pi: {
          marco: '#8b5cf6',
          luna: '#e87040',
          pauli: '#d4af37',
          darya: '#ec4899',
          devika: '#06b6d4',
          synthia: '#10b981',
          cynthia: '#f59e0b',
          zero: '#6366f1',
        },
        // Neon accents for sphere visualization
        neon: {
          violet: '#b066ff',
          coral: '#ff7055',
          gold: '#ffd24d',
          cyan: '#22d3ee',
          pink: '#f472b6',
          green: '#34d399',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 1.2s ease-out forwards',
        'slide-reveal': 'slideReveal 1s ease-out forwards',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'orb-pulse': 'orbPulse 2s ease-in-out infinite',
        'orb-glow': 'orbGlow 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideReveal: {
          '0%': { opacity: '0', transform: 'translateY(40px)', filter: 'blur(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        orbPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.08)', opacity: '0.9' },
        },
        orbGlow: {
          '0%, 100%': { boxShadow: '0 0 12px var(--orb-glow), 0 0 24px var(--orb-glow)' },
          '50%': { boxShadow: '0 0 24px var(--orb-glow), 0 0 48px var(--orb-glow)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

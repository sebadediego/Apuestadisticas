/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: { primary: '#0a0e17', secondary: '#111827', tertiary: '#1a2235' },
        accent: { emerald: '#10b981', cyan: '#06b6d4', amber: '#f59e0b', red: '#ef4444' },
        text: { primary: '#f1f5f9', secondary: '#94a3b8', muted: '#64748b' },
        border: { subtle: '#1e293b', active: '#334155' },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        glow: { '0%': { boxShadow: '0 0 5px rgba(16,185,129,0.2)' }, '100%': { boxShadow: '0 0 20px rgba(16,185,129,0.4)' } },
      },
    },
  },
  plugins: [],
};

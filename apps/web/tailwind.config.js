const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    // Point to hoisted dependencies in monorepo root
    '../../node_modules/@heroui/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      // Gaming-themed color palette inspired by Stake
      colors: {
        // Primary brand colors
        primary: {
          DEFAULT: '#00E6CC', // Teal/cyan primary
          50: '#E6FFFC',
          100: '#CCFFF8',
          200: '#99FFF1',
          300: '#66FFEA',
          400: '#33FFE3',
          500: '#00E6CC', // Primary
          600: '#00B8A3',
          700: '#008A7A',
          800: '#005C52',
          900: '#002E29',
        },
        // Secondary purple/violet accent
        secondary: {
          DEFAULT: '#8B5CF6', // Purple accent
          50: '#F3F0FF',
          100: '#E7E1FF',
          200: '#D1C2FF',
          300: '#BAA3FF',
          400: '#A485FF',
          500: '#8B5CF6', // Secondary
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        // Gaming dark theme
        dark: {
          DEFAULT: '#0F0F23', // Very dark blue
          50: '#F8F8FB',
          100: '#F1F1F7',
          200: '#E3E3EF',
          300: '#D6D6E7',
          400: '#C8C8DF',
          500: '#1A1A2E', // Dark surface
          600: '#16213E', // Darker surface
          700: '#0F0F23', // Primary dark
          800: '#0D0D1F',
          900: '#0A0A1B',
        },
        // Success/win colors
        success: {
          DEFAULT: '#22C55E',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        // Warning/caution colors
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        // Danger/loss colors
        danger: {
          DEFAULT: '#EF4444',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        }
      },
      // Gaming-themed fonts
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
        'mono': ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular'],
        'gaming': ['Orbitron', 'monospace'], // For gaming aesthetics
      },
      // Box shadows for gaming glow effects
      boxShadow: {
        'glow': '0 0 20px rgba(0, 230, 204, 0.3)',
        'glow-lg': '0 0 30px rgba(0, 230, 204, 0.4)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-purple-lg': '0 0 30px rgba(139, 92, 246, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(0, 230, 204, 0.1)',
      },
      // Animation durations
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      // Custom keyframes
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 230, 204, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 230, 204, 0.6)' },
        }
      },
      // Background patterns for gaming aesthetics
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gaming-grid': 'linear-gradient(rgba(0,230,204,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,230,204,0.1) 1px, transparent 1px)',
      },
      // Custom spacing for gaming layouts
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      }
    },
  },
  darkMode: "class", // Enable class-based dark mode
  plugins: [heroui({
    themes: {
      // Custom dark theme for gaming platform
      dark: {
        colors: {
          background: "#0F0F23", // Very dark blue background
          foreground: "#FFFFFF",
          primary: {
            DEFAULT: "#00E6CC",
            foreground: "#000000",
          },
          secondary: {
            DEFAULT: "#8B5CF6",
            foreground: "#FFFFFF",
          },
          success: {
            DEFAULT: "#22C55E",
            foreground: "#000000",
          },
          warning: {
            DEFAULT: "#F59E0B",
            foreground: "#000000",
          },
          danger: {
            DEFAULT: "#EF4444",
            foreground: "#FFFFFF",
          },
          default: {
            DEFAULT: "#1A1A2E",
            foreground: "#FFFFFF",
          },
          content1: "#16213E",
          content2: "#1A1A2E",
          content3: "#0F0F23",
          content4: "#0D0D1F",
        }
      }
    }
  })]
}
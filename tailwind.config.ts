import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "24px",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // ========================================
        // Core Semantic Colors - NO HSL WRAPPER
        // Direct var() references for Hex values
        // ========================================
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",

        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--primary-hover)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
          contrast: "var(--card-contrast)",
        },

        // ========================================
        // Extended Semantic Colors
        // ========================================
        bg: {
          DEFAULT: "var(--bg)",
          soft: "var(--bg-soft)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          "0": "var(--surface-0)",
          "1": "var(--surface-1)",
          "2": "var(--surface-2)",
        },
        text: {
          DEFAULT: "var(--text)",
          dim: "var(--text-dim)",
          muted: "var(--text-muted)",
          subtle: "var(--text-subtle)",
        },

        // ========================================
        // Status Colors (Theme-Aware)
        // ========================================
        success: {
          DEFAULT: "var(--success)",
          bg: "var(--success-bg)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
        },
        error: {
          DEFAULT: "var(--error)",
          bg: "var(--error-bg)",
        },

        // ========================================
        // Deep Space Design System (Theme-Aware)
        // ========================================
        "deep-space": {
          DEFAULT: "var(--deep-space-bg)",
          surface: "var(--deep-space-surface)",
          elevated: "var(--deep-space-elevated)",
          border: "var(--deep-space-border)",
          "border-subtle": "var(--deep-space-border-subtle)",
          "border-accent": "var(--deep-space-border-accent)",
        },
        "deep-purple": {
          DEFAULT: "var(--deep-space-purple)",
          glow: "var(--deep-space-purple-glow)",
          soft: "var(--deep-space-purple-soft)",
          hover: "var(--deep-space-purple-hover)",
        },
        "deep-violet": {
          DEFAULT: "var(--deep-space-violet)",
          glow: "var(--deep-space-violet-glow)",
        },
        "deep-emerald": {
          DEFAULT: "var(--deep-space-emerald)",
          glow: "var(--deep-space-emerald-glow)",
          soft: "var(--deep-space-emerald-soft)",
        },
        "deep-text": {
          DEFAULT: "var(--deep-space-text)",
          secondary: "var(--deep-space-text-secondary)",
          muted: "var(--deep-space-text-muted)",
        },
        "deep-glass": {
          DEFAULT: "var(--deep-space-glass)",
          border: "var(--deep-space-glass-border)",
        },

        // ========================================
        // Neon Accent Colors (Static)
        // ========================================
        "neon-emerald": "#10b981",
        "neon-amber": "#f59e0b",
        "neon-red": "#ef4444",
        "neon-purple": "#8b5cf6",
        "neon-blue": "#3b82f6",
        "neon-cyan": "#06b6d4",

        // ========================================
        // Status Indicators (Static)
        // ========================================
        "status-operational": "#10b981",
        "status-warning": "#f59e0b",
        "status-critical": "#ef4444",
        "status-offline": "#6b7280",
        "status-ai": "#8b5cf6",

        // ========================================
        // Premium Settings (Theme-Aware)
        // ========================================
        premium: {
          bg: {
            primary: "var(--premium-bg-primary)",
            secondary: "var(--premium-bg-secondary)",
          },
          border: "var(--premium-border)",
          text: {
            primary: "var(--premium-text-primary)",
            secondary: "var(--premium-text-secondary)",
            tertiary: "var(--premium-text-tertiary)",
          },
          accent: {
            DEFAULT: "var(--premium-accent)",
            hover: "var(--premium-accent-hover)",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Deep Space Command Core - Animations
        "pulse-glow": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)",
          },
          "50%": {
            opacity: "0.6",
            boxShadow: "0 0 40px rgba(139, 92, 246, 0.6)",
          },
        },
        "pulse-glow-emerald": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 15px rgba(16, 185, 129, 0.3)",
          },
          "50%": {
            opacity: "0.7",
            boxShadow: "0 0 30px rgba(16, 185, 129, 0.5)",
          },
        },
        "scanline": {
          "0%": {
            transform: "translateY(-100%)",
          },
          "100%": {
            transform: "translateY(100vh)",
          },
        },
        "hazard-pan": {
          "0%": {
            backgroundPosition: "0 0",
          },
          "100%": {
            backgroundPosition: "50px 50px",
          },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "glow-pulse": {
          "0%, 100%": {
            textShadow: "0 0 10px currentColor",
          },
          "50%": {
            textShadow: "0 0 20px currentColor, 0 0 30px currentColor",
          },
        },
        "border-flow": {
          "0%": {
            backgroundPosition: "0% 50%",
          },
          "50%": {
            backgroundPosition: "100% 50%",
          },
          "100%": {
            backgroundPosition: "0% 50%",
          },
        },
        // Flowent Inbox - Floating particle animations
        "float-slow": {
          "0%, 100%": {
            transform: "translateY(0) translateX(0)",
            opacity: "0.3",
          },
          "25%": {
            transform: "translateY(-20px) translateX(10px)",
            opacity: "0.5",
          },
          "50%": {
            transform: "translateY(-10px) translateX(-5px)",
            opacity: "0.4",
          },
          "75%": {
            transform: "translateY(-30px) translateX(15px)",
            opacity: "0.6",
          },
        },
        "float-medium": {
          "0%, 100%": {
            transform: "translateY(0) translateX(0)",
            opacity: "0.4",
          },
          "33%": {
            transform: "translateY(-15px) translateX(8px)",
            opacity: "0.6",
          },
          "66%": {
            transform: "translateY(-25px) translateX(-10px)",
            opacity: "0.5",
          },
        },
        "float-fast": {
          "0%, 100%": {
            transform: "translateY(0) translateX(0)",
            opacity: "0.5",
          },
          "50%": {
            transform: "translateY(-40px) translateX(5px)",
            opacity: "0.7",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Deep Space Command Core - Animation Classes
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "pulse-glow-emerald": "pulse-glow-emerald 2s ease-in-out infinite",
        "scanline": "scanline 8s linear infinite",
        "hazard-pan": "hazard-pan 3s linear infinite",
        "fade-in-up": "fade-in-up 0.3s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "border-flow": "border-flow 3s ease infinite",
        // Flowent Inbox - Floating particle animation classes
        "float-slow": "float-slow 12s ease-in-out infinite",
        "float-medium": "float-medium 8s ease-in-out infinite",
        "float-fast": "float-fast 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config

export default config

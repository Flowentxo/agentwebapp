// 🎨 Brain AI Design System - Design Tokens
// Modern SaaS-inspired design system

export const designTokens = {
  // Colors - Dual Theme System
  colors: {
    // Light Theme
    light: {
      // Primary Brand Colors
      primary: {
        50: '#f0f4ff',
        100: '#e0eaff',
        200: '#c7d7fe',
        300: '#a5bbfc',
        400: '#8199f8',
        500: '#6366f1',  // Primary brand color
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81',
      },

      // Secondary Accent
      secondary: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7',  // Secondary accent
        600: '#9333ea',
        700: '#7e22ce',
        800: '#6b21a8',
        900: '#581c87',
      },

      // Success Green
      success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
      },

      // Warning Amber
      warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
      },

      // Error Red
      error: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },

      // Neutral Grays
      gray: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
      },

      // Background & Surface
      background: '#ffffff',
      surface: '#fafafa',
      elevated: '#ffffff',

      // Text
      text: {
        primary: '#171717',
        secondary: '#525252',
        tertiary: '#a3a3a3',
        inverse: '#ffffff',
      },

      // Border
      border: {
        light: '#f5f5f5',
        medium: '#e5e5e5',
        strong: '#d4d4d4',
      },
    },

    // Dark Theme
    dark: {
      // Primary Brand Colors (adjusted for dark)
      primary: {
        50: '#312e81',
        100: '#3730a3',
        200: '#4338ca',
        300: '#4f46e5',
        400: '#6366f1',
        500: '#818cf8',  // Primary in dark mode
        600: '#a5b4fc',
        700: '#c7d7fe',
        800: '#e0eaff',
        900: '#f0f4ff',
      },

      // Secondary Accent
      secondary: {
        50: '#581c87',
        100: '#6b21a8',
        200: '#7e22ce',
        300: '#9333ea',
        400: '#a855f7',
        500: '#c084fc',
        600: '#d8b4fe',
        700: '#e9d5ff',
        800: '#f3e8ff',
        900: '#faf5ff',
      },

      // Success
      success: {
        50: '#14532d',
        100: '#166534',
        200: '#15803d',
        300: '#16a34a',
        400: '#22c55e',
        500: '#4ade80',
        600: '#86efac',
        700: '#bbf7d0',
        800: '#dcfce7',
        900: '#f0fdf4',
      },

      // Warning
      warning: {
        50: '#78350f',
        100: '#92400e',
        200: '#b45309',
        300: '#d97706',
        400: '#f59e0b',
        500: '#fbbf24',
        600: '#fcd34d',
        700: '#fde68a',
        800: '#fef3c7',
        900: '#fffbeb',
      },

      // Error
      error: {
        50: '#7f1d1d',
        100: '#991b1b',
        200: '#b91c1c',
        300: '#dc2626',
        400: '#ef4444',
        500: '#f87171',
        600: '#fca5a5',
        700: '#fecaca',
        800: '#fee2e2',
        900: '#fef2f2',
      },

      // Neutral Grays (inverted)
      gray: {
        50: '#171717',
        100: '#262626',
        200: '#404040',
        300: '#525252',
        400: '#737373',
        500: '#a3a3a3',
        600: '#d4d4d4',
        700: '#e5e5e5',
        800: '#f5f5f5',
        900: '#fafafa',
      },

      // Background & Surface
      background: '#0a0a0a',
      surface: '#171717',
      elevated: '#262626',

      // Text
      text: {
        primary: '#fafafa',
        secondary: '#d4d4d4',
        tertiary: '#737373',
        inverse: '#171717',
      },

      // Border
      border: {
        light: '#262626',
        medium: '#404040',
        strong: '#525252',
      },
    },
  },

  // Typography
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },

    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
    },

    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },

    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },

    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  },

  // Spacing Scale (4px base unit)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    32: '8rem',     // 128px
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    glow: '0 0 20px rgb(99 102 241 / 0.3)',
  },

  // Animation Durations
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },

  // Animation Easings
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Z-index Scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

// Export individual token sets for easier imports
export const { colors, typography, spacing, borderRadius, shadows, duration, easing, zIndex, breakpoints } = designTokens;

// CSS Variables Generator
export function generateCSSVariables(theme: 'light' | 'dark' = 'light') {
  const themeColors = colors[theme];

  return `
    /* Brand Colors */
    --color-primary-500: ${themeColors.primary[500]};
    --color-primary-600: ${themeColors.primary[600]};
    --color-secondary-500: ${themeColors.secondary[500]};

    /* Semantic Colors */
    --color-success: ${themeColors.success[500]};
    --color-warning: ${themeColors.warning[500]};
    --color-error: ${themeColors.error[500]};

    /* Background */
    --color-background: ${themeColors.background};
    --color-surface: ${themeColors.surface};
    --color-elevated: ${themeColors.elevated};

    /* Text */
    --color-text-primary: ${themeColors.text.primary};
    --color-text-secondary: ${themeColors.text.secondary};
    --color-text-tertiary: ${themeColors.text.tertiary};

    /* Border */
    --color-border-light: ${themeColors.border.light};
    --color-border-medium: ${themeColors.border.medium};
    --color-border-strong: ${themeColors.border.strong};

    /* Typography */
    --font-sans: ${typography.fontFamily.sans};
    --font-mono: ${typography.fontFamily.mono};

    /* Spacing */
    --spacing-base: ${spacing[4]};

    /* Border Radius */
    --radius-md: ${borderRadius.md};
    --radius-lg: ${borderRadius.lg};

    /* Shadows */
    --shadow-sm: ${shadows.sm};
    --shadow-md: ${shadows.md};
    --shadow-lg: ${shadows.lg};

    /* Duration */
    --duration-fast: ${duration.fast};
    --duration-normal: ${duration.normal};
  `;
}

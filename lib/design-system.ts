/**
 * SINTRA PREMIUM DESIGN SYSTEM
 * Apple-inspired, Glass-Morphism Design Tokens
 *
 * Based on the Budget & Usage page design
 */

// --- DESIGN TOKENS ---
export const tokens = {
  // Backgrounds - Consistent dark theme without gradient fade
  bgPage: '#111114',
  bgCard: 'rgba(255, 255, 255, 0.02)',
  bgCardHover: 'rgba(255, 255, 255, 0.03)',
  bgCardAlt: 'rgba(255, 255, 255, 0.01)',

  // Borders
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderHover: 'rgba(255, 255, 255, 0.15)',

  // Colors
  accent: '#6366f1', // Indigo/Violet
  accentAlt: '#14b8a6', // Teal
  accentWarning: '#f59e0b', // Amber
  accentError: '#ef4444', // Red
  accentSuccess: '#22c55e', // Green

  // Text
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textDimmed: 'rgba(255, 255, 255, 0.2)',

  // Typography
  fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',

  // Shadows
  shadowCard: 'inset 0 0 20px rgba(255,255,255,0.01), 0 20px 50px rgba(0,0,0,0.15)',
  shadowElevated: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
  shadowGlow: (color: string) => `0 0 30px ${color}20`,

  // Radii
  radiusSmall: '12px',
  radiusMedium: '24px',
  radiusLarge: '32px',
  radiusXL: '40px',

  // Spacing
  spacingXS: '4px',
  spacingSM: '8px',
  spacingMD: '16px',
  spacingLG: '24px',
  spacingXL: '32px',
  spacing2XL: '48px',
  spacing3XL: '64px',
};

// --- GRADIENT PRESETS ---
export const gradients = {
  primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  success: 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  dark: 'linear-gradient(135deg, #1a1a1f 0%, #0a0a0c 100%)',
  subtle: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
};

// --- ANIMATION PRESETS ---
export const animations = {
  spring: { type: 'spring', damping: 25, stiffness: 200 },
  smooth: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  fast: { duration: 0.3, ease: 'easeOut' },
  shimmer: 'shimmer 2s infinite',
};

// --- UTILITY FUNCTIONS ---
export const formatCurrency = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('de-DE').format(value);

export const formatCompact = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);

// --- CSS CLASS UTILITIES ---
export const glassCard = `
  bg-[rgba(255,255,255,0.015)]
  backdrop-blur-[50px]
  border border-white/5
  rounded-[40px]
  shadow-[inset_0_0_20px_rgba(255,255,255,0.01),0_20px_50px_rgba(0,0,0,0.2)]
`;

export const glassCardHover = `
  hover:bg-[rgba(255,255,255,0.05)]
  hover:border-white/15
  transition-all duration-300
`;

export const labelStyle = `
  text-[10px] uppercase tracking-widest font-bold text-white/40
`;

export const headingStyle = `
  text-4xl md:text-5xl font-black text-white tracking-tight
`;

export const subheadingStyle = `
  text-white/40 font-medium max-w-md leading-relaxed
`;

export const statValue = `
  text-3xl font-bold tabular-nums
`;

export const statLabel = `
  text-sm text-white/40
`;

// --- COMPONENT STYLE PRESETS ---
export const buttonPrimary = `
  px-6 py-3 bg-card text-black hover:bg-card/90
  rounded-full text-xs font-bold uppercase tracking-widest
  shadow-xl shadow-white/10
  transition-all hover:scale-105 active:scale-95
`;

export const buttonSecondary = `
  px-6 py-3 bg-card/10 hover:bg-card/20
  border border-white/10
  rounded-full text-xs font-bold uppercase tracking-widest
  transition-all
`;

export const buttonGradient = `
  px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600
  hover:from-indigo-500 hover:to-violet-500
  rounded-full text-xs font-bold text-white uppercase tracking-widest
  shadow-lg shadow-indigo-500/20
  transition-all hover:scale-105
`;

export const badge = (color: 'indigo' | 'teal' | 'green' | 'red' | 'yellow' = 'indigo') => {
  const colors = {
    indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20',
    teal: 'bg-teal-500/20 text-teal-300 border-teal-500/20',
    green: 'bg-green-500/20 text-green-400 border-green-500/20',
    red: 'bg-red-500/20 text-red-400 border-red-500/20',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
  };
  return `px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border ${colors[color]}`;
};

export const tableHeader = `
  text-[10px] uppercase font-bold tracking-widest text-white/30 bg-card/5
`;

export const tableRow = `
  hover:bg-card/5 transition-colors
`;

export const tableCell = `
  px-8 py-5
`;

// --- PAGE LAYOUT ---
export const pageContainer = `
  min-h-screen px-6 py-12 lg:px-12
`;

export const pageContent = `
  max-w-[1440px] mx-auto space-y-12
`;

export const sectionSpacing = `
  space-y-6
`;

// --- BENTO GRID ---
export const bentoGrid = `
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
`;

export const bentoCard = `
  p-8 rounded-[40px] border border-white/5
  bg-[rgba(255,255,255,0.015)] backdrop-blur-[50px]
  shadow-[inset_0_0_20px_rgba(255,255,255,0.01),0_20px_50px_rgba(0,0,0,0.2)]
  relative overflow-hidden group
`;

export const bentoSpotlight = `
  absolute inset-0 opacity-0 group-hover:opacity-100
  transition-opacity duration-500 pointer-events-none
  bg-[radial-gradient(600px_circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(255,255,255,0.06),transparent_40%)]
`;

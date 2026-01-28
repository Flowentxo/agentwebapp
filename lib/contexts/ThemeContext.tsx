/**
 * Theme Context - Enhanced Dark Mode Management with next-themes
 *
 * "Design is how it works." - Steve Jobs
 *
 * Features:
 * - Dark/Light mode toggle with next-themes
 * - System preference detection
 * - localStorage persistence
 * - SSR-safe with no flash
 * - Tailwind CSS dark mode class support
 */

'use client';

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { type ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
}

/**
 * ThemeProvider - Wraps next-themes provider with our configuration
 *
 * Safety First: Dark mode is the default to match user expectations.
 * The app will always start in dark mode unless the user explicitly changes it.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'flowent-theme',
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      storageKey={storageKey}
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}

/**
 * useTheme hook - Extended interface for theme management
 */
export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme, themes } = useNextTheme();

  const toggleTheme = () => {
    const current = resolvedTheme || 'dark';
    setTheme(current === 'light' ? 'dark' : 'light');
  };

  return {
    theme: theme as 'light' | 'dark' | 'system' | undefined,
    setTheme,
    resolvedTheme: resolvedTheme as 'light' | 'dark' | undefined,
    systemTheme: systemTheme as 'light' | 'dark' | undefined,
    themes,
    toggleTheme,
  };
}

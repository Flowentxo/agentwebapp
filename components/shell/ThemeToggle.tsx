/**
 * Theme Toggle - Dark Mode Switch
 *
 * "Simplicity is the ultimate sophistication." - Leonardo da Vinci
 *
 * Features:
 * - Animated Sun/Moon icons
 * - Smooth transitions
 * - Accessible (keyboard + screen reader)
 * - Apple-inspired design
 */

'use client';

import { useTheme } from '@/lib/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Return null on server-side and during initial client render
  if (!mounted) {
    return (
      <div className="relative flex items-center justify-center w-12 h-12 rounded-full" />
    );
  }

  return <ThemeToggleClient />;
}

function ThemeToggleClient() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 hover:bg-[var(--oracle-surface-secondary)] group"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute"
          >
            <Moon
              className="h-5 w-5 transition-colors duration-300"
              style={{ color: 'var(--oracle-blue)' }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ opacity: 0, rotate: 90, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.8 }}
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute"
          >
            <Sun
              className="h-5 w-5 transition-colors duration-300"
              style={{ color: 'var(--oracle-blue)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ripple effect on hover */}
      <span className="absolute inset-0 rounded-full transition-transform duration-300 group-hover:scale-110" />
    </button>
  );
}

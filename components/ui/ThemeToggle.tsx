'use client';

import { useTheme } from '@/lib/contexts/ThemeContext';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown' | 'switch';
  className?: string;
}

/**
 * ThemeToggle - Elegant theme switcher component
 *
 * Variants:
 * - icon: Simple icon button that cycles through themes
 * - dropdown: Dropdown with all three options
 * - switch: Minimal toggle switch
 */
export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className={`p-2 rounded-lg bg-muted/50 ${className}`}
        disabled
        aria-label="Loading theme"
      >
        <div className="w-5 h-5" />
      </button>
    );
  }

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme as 'light' | 'dark' | 'system');
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={cycleTheme}
        className={`
          relative p-2 rounded-lg
          bg-muted/50 hover:bg-muted
          border border-border/50 hover:border-border
          transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          ${className}
        `}
        aria-label={`Current theme: ${theme}. Click to change.`}
        title={`Theme: ${theme}`}
      >
        {theme === 'system' ? (
          <Monitor className="w-5 h-5 text-muted-foreground" />
        ) : resolvedTheme === 'dark' ? (
          <Moon className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Sun className="w-5 h-5 text-amber-500" />
        )}
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative group ${className}`}>
        <button
          className={`
            p-2 rounded-lg
            bg-muted/50 hover:bg-muted
            border border-border/50 hover:border-border
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          `}
          aria-label="Theme options"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500" />
          )}
        </button>

        <div className="
          absolute right-0 mt-2 w-36 py-1
          bg-popover border border-border rounded-lg shadow-lg
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-all duration-200
          z-50
        ">
          <ThemeOption
            icon={<Sun className="w-4 h-4" />}
            label="Light"
            active={theme === 'light'}
            onClick={() => setTheme('light')}
          />
          <ThemeOption
            icon={<Moon className="w-4 h-4" />}
            label="Dark"
            active={theme === 'dark'}
            onClick={() => setTheme('dark')}
          />
          <ThemeOption
            icon={<Monitor className="w-4 h-4" />}
            label="System"
            active={theme === 'system'}
            onClick={() => setTheme('system')}
          />
        </div>
      </div>
    );
  }

  // Switch variant
  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={`
        relative w-14 h-7 rounded-full p-0.5
        bg-muted border border-border
        transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${className}
      `}
      role="switch"
      aria-checked={resolvedTheme === 'dark'}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span
        className={`
          absolute top-0.5 w-6 h-6 rounded-full
          bg-foreground
          flex items-center justify-center
          transition-transform duration-200 ease-in-out
          ${resolvedTheme === 'dark' ? 'translate-x-7' : 'translate-x-0.5'}
        `}
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-background" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-background" />
        )}
      </span>
    </button>
  );
}

interface ThemeOptionProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ThemeOption({ icon, label, active, onClick }: ThemeOptionProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 px-3 py-2
        text-sm text-left
        hover:bg-muted/80
        transition-colors duration-150
        ${active ? 'text-primary font-medium' : 'text-foreground'}
      `}
    >
      <span className={active ? 'text-primary' : 'text-muted-foreground'}>
        {icon}
      </span>
      {label}
      {active && (
        <span className="ml-auto text-xs text-primary">
          ✓
        </span>
      )}
    </button>
  );
}

export default ThemeToggle;

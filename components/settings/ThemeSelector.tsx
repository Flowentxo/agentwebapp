'use client';

/**
 * ThemeSelector Component
 *
 * Visual theme picker for Settings page with preview cards.
 * Supports Light, Dark, and System themes.
 *
 * Features:
 * - Three clickable preview cards
 * - Visual representation of each theme
 * - Active state indication with primary color border
 * - Smooth transitions
 */

import { useTheme } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

type ThemeOption = 'light' | 'dark' | 'system';

interface ThemeCardProps {
  theme: ThemeOption;
  label: string;
  description: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Individual theme preview card
 */
function ThemeCard({
  theme,
  label,
  description,
  icon: Icon,
  isActive,
  onClick,
}: ThemeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200',
        'hover:scale-[1.02] active:scale-[0.98]',
        isActive
          ? 'border-primary bg-primary/5 dark:bg-primary/10'
          : 'border-border hover:border-primary/50 bg-card'
      )}
    >
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Preview Box */}
      <div className="w-full aspect-[16/10] rounded-lg overflow-hidden border border-border/50">
        <ThemePreview theme={theme} />
      </div>

      {/* Label & Icon */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

/**
 * Visual preview of the theme
 */
function ThemePreview({ theme }: { theme: ThemeOption }) {
  // Light theme preview
  if (theme === 'light') {
    return (
      <div className="w-full h-full bg-card flex">
        {/* Sidebar */}
        <div className="w-1/4 h-full bg-muted border-r border-border p-1.5">
          <div className="w-full h-2 bg-gray-300 rounded mb-1.5" />
          <div className="w-3/4 h-1.5 bg-gray-200 rounded mb-1" />
          <div className="w-2/3 h-1.5 bg-gray-200 rounded mb-1" />
          <div className="w-4/5 h-1.5 bg-gray-200 rounded" />
        </div>
        {/* Main Content */}
        <div className="flex-1 p-2">
          <div className="w-full h-2 bg-gray-200 rounded mb-2" />
          <div className="w-3/4 h-1.5 bg-muted rounded mb-1" />
          <div className="w-full h-8 bg-muted/50 rounded border border-border mt-2" />
        </div>
      </div>
    );
  }

  // Dark theme preview - Lighter Anthrazit Zinc Palette
  if (theme === 'dark') {
    return (
      <div className="w-full h-full bg-zinc-900 flex">
        {/* Sidebar - Zinc 900 background */}
        <div className="w-1/4 h-full bg-zinc-900 border-r border-zinc-700 p-1.5">
          <div className="w-full h-2 bg-zinc-600 rounded mb-1.5" />
          <div className="w-3/4 h-1.5 bg-zinc-800 rounded mb-1" />
          <div className="w-2/3 h-1.5 bg-zinc-800 rounded mb-1" />
          <div className="w-4/5 h-1.5 bg-zinc-800 rounded" />
        </div>
        {/* Main Content */}
        <div className="flex-1 p-2">
          <div className="w-full h-2 bg-zinc-800 rounded mb-2" />
          <div className="w-3/4 h-1.5 bg-zinc-800 rounded mb-1" />
          <div className="w-full h-8 bg-zinc-800 rounded border border-zinc-700 mt-2" />
        </div>
      </div>
    );
  }

  // System theme preview (split) - Lighter Anthrazit for dark half
  return (
    <div className="w-full h-full flex">
      {/* Light Half */}
      <div className="w-1/2 h-full bg-card flex">
        <div className="w-1/3 h-full bg-muted border-r border-border p-0.5">
          <div className="w-full h-1.5 bg-gray-300 rounded mb-1" />
          <div className="w-2/3 h-1 bg-gray-200 rounded" />
        </div>
        <div className="flex-1 p-1">
          <div className="w-full h-1.5 bg-gray-200 rounded mb-1" />
          <div className="w-3/4 h-1 bg-muted rounded" />
        </div>
      </div>
      {/* Dark Half - Zinc Palette */}
      <div className="w-1/2 h-full bg-zinc-900 flex">
        <div className="w-1/3 h-full bg-zinc-900 border-r border-zinc-700 p-0.5">
          <div className="w-full h-1.5 bg-zinc-600 rounded mb-1" />
          <div className="w-2/3 h-1 bg-zinc-800 rounded" />
        </div>
        <div className="flex-1 p-1">
          <div className="w-full h-1.5 bg-zinc-800 rounded mb-1" />
          <div className="w-3/4 h-1 bg-zinc-800 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Main ThemeSelector Component
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themeOptions: Array<{
    value: ThemeOption;
    label: string;
    description: string;
    icon: React.ElementType;
  }> = [
    {
      value: 'light',
      label: 'Light',
      description: 'Clean & bright',
      icon: Sun,
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Easy on the eyes',
      icon: Moon,
    },
    {
      value: 'system',
      label: 'System',
      description: 'Match device',
      icon: Monitor,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {themeOptions.map((option) => (
        <ThemeCard
          key={option.value}
          theme={option.value}
          label={option.label}
          description={option.description}
          icon={option.icon}
          isActive={theme === option.value}
          onClick={() => setTheme(option.value)}
        />
      ))}
    </div>
  );
}

export default ThemeSelector;

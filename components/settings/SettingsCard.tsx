/**
 * Settings Card - Ultra-Premium Glass Components
 * Deep glassmorphism with generous padding and subtle depth
 */

'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface SettingsCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function SettingsCard({
  title,
  description,
  icon: Icon,
  iconColor = 'text-zinc-400',
  children,
  className = '',
  action,
}: SettingsCardProps) {
  return (
    <div className={`rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-white/[0.05] shadow-xl shadow-black/20 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between px-8 py-6 border-b border-white/[0.03]">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/[0.15]">
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Content */}
      <div className="p-8">{children}</div>
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className = '',
}: SettingsSectionProps) {
  return (
    <div className={`space-y-5 ${className}`}>
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-zinc-400 mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsRow({
  label,
  description,
  children,
  className = '',
}: SettingsRowProps) {
  return (
    <div className={`flex items-center justify-between py-4 px-4 -mx-4 rounded-xl hover:bg-white/[0.02] transition-colors ${className}`}>
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-white/80">{label}</p>
        {description && (
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

interface SettingsDividerProps {
  className?: string;
}

export function SettingsDivider({ className = '' }: SettingsDividerProps) {
  return <div className={`border-t border-white/[0.03] ${className}`} />;
}

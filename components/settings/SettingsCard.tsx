/**
 * Settings Card - Reusable Card Component for Settings Sections
 * Clean, minimal design with consistent styling
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
  iconColor = 'text-muted-foreground',
  children,
  className = '',
  action,
}: SettingsCardProps) {
  return (
    <div className={`rounded-xl bg-[var(--vicy-surface)] border border-[var(--vicy-border)] shadow-sm overflow-hidden backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--vicy-border)]">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--vicy-glass-bg)] border border-[var(--vicy-glass-border)] mt-0.5">
              <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-[var(--vicy-text-primary)]">{title}</h3>
            {description && (
              <p className="text-xs text-[var(--vicy-text-secondary)] mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Content */}
      <div className="p-5">{children}</div>
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
    <div className={`space-y-4 ${className}`}>
      <div>
        <h2 className="text-lg font-semibold text-[var(--vicy-text-primary)]">{title}</h2>
        {description && (
          <p className="text-sm text-[var(--vicy-text-secondary)] mt-1">{description}</p>
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
    <div className={`flex items-center justify-between py-3 ${className}`}>
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-[var(--vicy-text-primary)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--vicy-text-secondary)] mt-0.5">{description}</p>
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
  return <div className={`border-t border-[var(--vicy-border)] ${className}`} />;
}

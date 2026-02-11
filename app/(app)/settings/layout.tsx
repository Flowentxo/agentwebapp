/**
 * Settings Layout - Clean, Distraction-Free Layout
 *
 * SECURITY: Authentication is enforced in page.tsx via requireSession()
 * This layout provides a minimalist visual shell focused on settings.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';

// Back to Dashboard Navigation - True Black OLED
function BackNavigation() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--vicy-surface-95)] backdrop-blur-xl border-b border-[var(--vicy-border)]">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] transition-colors group"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--vicy-glass-bg)] border border-[var(--vicy-border)] group-hover:bg-[var(--vicy-accent-glow)] group-hover:border-[var(--vicy-accent-30)] transition-colors">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          </div>
          <span className="text-sm font-medium">Dashboard</span>
        </Link>

        {/* Settings Icon Badge */}
        <div className="flex items-center gap-2 text-[var(--vicy-text-secondary)]">
          <Settings className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Einstellungen</span>
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton - True Black OLED
function SettingsLayoutSkeleton() {
  return (
    <div className="pt-14 min-h-screen bg-[var(--vicy-bg)]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-48 bg-[var(--vicy-surface)] rounded-lg" />
            <div className="h-4 w-64 bg-[var(--vicy-surface-50)] rounded" />
          </div>
          {/* Tabs Skeleton */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-24 bg-[var(--vicy-surface)] rounded-lg" />
            ))}
          </div>
          {/* Content Skeleton */}
          <div className="grid gap-4">
            <div className="h-32 bg-[var(--vicy-surface-50)] rounded-xl" />
            <div className="h-48 bg-[var(--vicy-surface-50)] rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="vicy-theme min-h-screen bg-[var(--vicy-bg)]">
      {/* Back Navigation Bar */}
      <BackNavigation />

      {/* Main Content Area - Centered */}
      <div className="relative z-10 pt-14">
        <Suspense fallback={<SettingsLayoutSkeleton />}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}

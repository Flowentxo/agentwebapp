/**
 * Settings Layout - Clean, Distraction-Free Design
 * Focused UI for configuration with minimal visual noise
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProfileResponse } from '@/lib/profile/schemas';
import SettingsHeader from './SettingsHeader';
import SettingsTopNav from './SettingsTopNav';

export interface NavigationOptions {
  autoStartMfaSetup?: boolean;
}

interface SettingsLayoutProps {
  profile: ProfileResponse;
  children: (
    activeTab: string,
    onNavigateToTab: (tab: string, options?: NavigationOptions) => void,
    navigationOptions: NavigationOptions | null,
    clearNavigationOptions: () => void
  ) => React.ReactNode;
  onLogout?: () => void;
}

export default function SettingsLayout({
  profile,
  children,
  onLogout
}: SettingsLayoutProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [navigationOptions, setNavigationOptions] = useState<NavigationOptions | null>(null);

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    setNavigationOptions(null);
    setActiveTab(tabId);
  };

  const handleNavigateToTab = (tabId: string, options?: NavigationOptions) => {
    if (options) {
      setNavigationOptions(options);
    }
    if (tabId !== activeTab) {
      setActiveTab(tabId);
    }
  };

  const clearNavigationOptions = () => {
    setNavigationOptions(null);
  };

  return (
    <div className="min-h-screen w-full bg-[var(--vicy-bg)]">
      {/* Header with User Info */}
      <div className="border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <SettingsHeader profile={profile} onLogout={onLogout} />
        </div>
      </div>

      {/* Tab Navigation - Sticky below back navigation bar */}
      <div className="sticky top-14 z-30 bg-zinc-950/60 backdrop-blur-2xl border-b border-white/[0.03]">
        <div className="max-w-5xl mx-auto">
          <SettingsTopNav activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </div>

      {/* Content Area with Smooth Transitions */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {children(activeTab, handleNavigateToTab, navigationOptions, clearNavigationOptions)}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

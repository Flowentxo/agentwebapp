/**
 * Settings Top Navigation - Floating Pills
 * Premium pill-style tabs with animated background transition
 */

'use client';

import { motion } from 'framer-motion';
import {
  User,
  Shield,
  Building2,
  Terminal,
  Plug,
} from 'lucide-react';

interface SettingsTopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'general', label: 'Allgemein', icon: User },
  { id: 'security', label: 'Sicherheit', icon: Shield },
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'advanced', label: 'Erweitert', icon: Terminal },
  { id: 'integrations', label: 'Integrationen', icon: Plug },
];

export default function SettingsTopNav({ activeTab, onTabChange }: SettingsTopNavProps) {
  return (
    <nav className="px-6 py-2">
      <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              {/* Animated pill background */}
              {isActive && (
                <motion.div
                  layoutId="activeSettingsPill"
                  className="absolute inset-0 bg-zinc-800 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.3),0_0_15px_rgba(255,255,255,0.06)]"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}

              <Icon className={`relative z-10 w-4 h-4 ${isActive ? 'text-purple-400' : ''}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

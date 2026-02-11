/**
 * Settings Top Navigation - Clean Tab Navigation
 * Minimal, focused tab switching with smooth animations
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
  { id: 'general', label: 'Allgemein', icon: User, description: 'Profil & Präferenzen' },
  { id: 'security', label: 'Sicherheit', icon: Shield, description: 'Passwort & 2FA' },
  { id: 'workspace', label: 'Workspace', icon: Building2, description: 'Team & Organisation' },
  { id: 'advanced', label: 'Erweitert', icon: Terminal, description: 'API & System' },
  { id: 'integrations', label: 'Integrationen', icon: Plug, description: 'Apps & Dienste' },
];

export default function SettingsTopNav({ activeTab, onTabChange }: SettingsTopNavProps) {
  return (
    <nav className="relative px-6 py-2">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'text-[var(--vicy-text-primary)] bg-[var(--vicy-accent-glow)]'
                  : 'text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] hover:bg-[var(--vicy-surface-hover)]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--vicy-accent)]' : ''}`} />
              {tab.label}

              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeSettingsTab"
                  className="absolute inset-0 rounded-lg bg-[var(--vicy-accent-glow)] border border-[var(--vicy-accent-20)]"
                  style={{ zIndex: -1 }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
            </button>
          );
        })}
      </div>
      {/* Mobile scroll indicator */}
      <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-[var(--vicy-surface-95)] to-transparent pointer-events-none md:hidden" />
    </nav>
  );
}

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
];

export default function SettingsTopNav({ activeTab, onTabChange }: SettingsTopNavProps) {
  return (
    <nav className="px-6 py-2">
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
                  ? 'text-foreground bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
              {tab.label}

              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeSettingsTab"
                  className="absolute inset-0 rounded-lg bg-primary/5 border border-primary/10"
                  style={{ zIndex: -1 }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

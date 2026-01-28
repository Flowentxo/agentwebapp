/**
 * Profile Tabs - Modern tab navigation with icons and underline indicator
 * Horizontal scrollable on mobile, sticky on scroll
 *
 * Combined Profile + Settings functionality:
 * - Profile tabs: Overview, Personal, Security, Sessions, Notifications, Privacy, Audit
 * - Settings tabs: Organization, System (merged from old Settings page)
 */

'use client';

import {
  LayoutDashboard,
  User,
  Shield,
  Monitor,
  Bell,
  Lock,
  FileText,
  Building2,
  Settings2,
  Key
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: 'profile' | 'settings';
}

const tabs: Tab[] = [
  // Profile Group
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, group: 'profile' },
  { id: 'personal', label: 'Persönlich', icon: User, group: 'profile' },
  { id: 'security', label: 'Sicherheit', icon: Shield, group: 'profile' },
  { id: 'sessions', label: 'Sitzungen', icon: Monitor, group: 'profile' },
  { id: 'notifications', label: 'Benachrichtigungen', icon: Bell, group: 'profile' },
  { id: 'privacy', label: 'Datenschutz', icon: Lock, group: 'profile' },
  { id: 'audit', label: 'Protokoll', icon: FileText, group: 'profile' },
  // Settings Group (merged from old Settings page)
  { id: 'organization', label: 'Organisation', icon: Building2, group: 'settings' },
  { id: 'system', label: 'System', icon: Settings2, group: 'settings' },
  { id: 'api-keys', label: 'API-Keys', icon: Key, group: 'settings' },
];

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const profileTabs = tabs.filter(t => t.group === 'profile');
  const settingsTabs = tabs.filter(t => t.group === 'settings');

  return (
    <div className="sticky top-16 z-30 bg-[rgb(var(--surface-0))]/95 backdrop-blur-xl border-b border-white/10">
      <div className="px-4 md:px-6">
        {/* Horizontal scrollable tab list */}
        <div className="overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1 min-w-max py-3">
            {/* Profile Tabs */}
            {profileTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                    'hover:bg-card/5',
                    isActive
                      ? 'text-white'
                      : 'text-white/60 hover:text-white/80'
                  )}
                  aria-pressed={isActive}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>

                  {/* Active indicator - underline */}
                  {isActive && (
                    <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500" />
                  )}
                </button>
              );
            })}

            {/* Divider between Profile and Settings tabs */}
            <div className="h-6 w-px bg-card/10 mx-2" />

            {/* Settings Tabs */}
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                    'hover:bg-card/5',
                    isActive
                      ? 'text-white'
                      : 'text-white/60 hover:text-white/80'
                  )}
                  aria-pressed={isActive}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>

                  {/* Active indicator - underline */}
                  {isActive && (
                    <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

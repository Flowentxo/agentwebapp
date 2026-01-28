'use client';

import { motion } from 'framer-motion';
import {
  User,
  Shield,
  Bell,
  Smartphone,
  Eye,
  FileText,
  Building2,
  Settings2,
  CreditCard,
  Key,
  Webhook,
  Activity,
  Sliders
} from 'lucide-react';

export type SettingsGroup = 'ACCOUNT' | 'WORKSPACE' | 'DEVELOPER' | 'SYSTEM';

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  const menuGroups = [
    {
      title: 'ACCOUNT',
      items: [
        { id: 'overview', label: 'Übersicht', icon:  User }, // Changed label from 'Profile' to 'Übersicht' 
        { id: 'personal', label: 'Persönlich', icon: Settings2 }, //Using Settings2 as a placeholder for specific personal settings if needed, or stick to User
        { id: 'security', label: 'Sicherheit', icon: Shield },
        { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
        { id: 'sessions', label: 'Sitzungen', icon: Smartphone },
        { id: 'privacy', label: 'Datenschutz', icon: Eye },
      ]
    },
    {
      title: 'WORKSPACE',
      items: [
        { id: 'workspaces', label: 'Workspaces', icon: Building2 }, // New Workspaces tab
        { id: 'organization', label: 'Organisation', icon:  Building2 }, // Kept distinct if needed, or merge? Let's keep distinct as per plan.
        // { id: 'billing', label: 'Abrechnung', icon: CreditCard }, // Add if ready
      ]
    },
    {
      title: 'DEVELOPER',
      items: [
        { id: 'api-keys', label: 'API Keys', icon: Key },
        // { id: 'webhooks', label: 'Webhooks', icon: Webhook },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'preferences', label: 'Präferenzen', icon: Sliders },
        { id: 'audit', label: 'Audit Log', icon: Activity },
        // { id: 'system', label: 'Systemstatus', icon: Activity }, // Merged or distinct?
      ]
    }
  ];

  return (
    <div className="w-64 flex-shrink-0 min-h-screen border-r-2 border-border bg-card">
      <div className="p-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-8 px-3">Einstellungen</h2>

        <nav className="space-y-8">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <h3 className="px-3 text-[10px] font-bold tracking-widest text-muted-foreground/70 uppercase mb-3">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 group ${
                        isActive
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTabIndicator"
                          className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-xl"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}

                      <Icon className={`w-4 h-4 relative z-10 transition-colors ${
                        isActive ? 'text-primary' : 'text-current group-hover:text-primary'
                      }`} />

                      <span className="relative z-10 font-medium">{item.label}</span>

                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

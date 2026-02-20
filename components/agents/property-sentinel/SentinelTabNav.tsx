'use client';

import { BarChart3, MessageSquare } from 'lucide-react';

const AGENT_COLOR = '#92400E';

export type SentinelTab = 'dashboard' | 'chat';

interface SentinelTabNavProps {
  activeTab: SentinelTab;
  onTabChange: (tab: SentinelTab) => void;
}

const tabs: { id: SentinelTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

export function SentinelTabNav({ activeTab, onTabChange }: SentinelTabNavProps) {
  return (
    <div className="flex items-center gap-1 px-6 py-2 border-b border-white/[0.04]">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium
              transition-all duration-200 border
              ${isActive
                ? 'text-white/80 border-white/[0.08]'
                : 'text-white/30 border-transparent hover:text-white/50 hover:bg-white/[0.03]'}
            `}
            style={isActive ? {
              backgroundColor: `${AGENT_COLOR}12`,
              borderColor: `${AGENT_COLOR}25`,
              color: AGENT_COLOR,
            } : undefined}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}

      {/* Beta badge */}
      <span className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-medium text-amber-500/70 bg-amber-500/10 border border-amber-500/20">
        Beta
      </span>
    </div>
  );
}

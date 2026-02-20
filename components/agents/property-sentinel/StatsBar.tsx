'use client';

import { motion } from 'framer-motion';
import { Home, Target, TrendingUp, ArrowRightCircle, BarChart3 } from 'lucide-react';
import type { SentinelStats } from '@/store/sentinelStore';

const AGENT_COLOR = '#92400E';

interface StatsBarProps {
  stats: SentinelStats | null;
  isLoading: boolean;
}

const statCards = [
  { key: 'totalProfiles', label: 'Suchprofile', icon: Home, getValue: (s: SentinelStats) => `${s.activeProfiles}/${s.totalProfiles}` },
  { key: 'totalListings', label: 'Inserate gefunden', icon: Target, getValue: (s: SentinelStats) => String(s.totalListings) },
  { key: 'qualifiedListings', label: 'Qualifizierte Deals', icon: TrendingUp, getValue: (s: SentinelStats) => String(s.qualifiedListings) },
  { key: 'inPipeline', label: 'In Pipeline', icon: ArrowRightCircle, getValue: (s: SentinelStats) => String(s.inPipeline) },
  { key: 'avgScore', label: 'Avg Score', icon: BarChart3, getValue: (s: SentinelStats) => s.avgScore > 0 ? `${s.avgScore}/100` : '--' },
] as const;

export function StatsBar({ stats, isLoading }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 px-6 pt-6">
      {statCards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${AGENT_COLOR}15`, border: `1px solid ${AGENT_COLOR}25` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: AGENT_COLOR }} />
              </div>
              <span className="text-[11px] text-white/40">{card.label}</span>
            </div>
            <div className="text-lg font-semibold text-white/80">
              {isLoading ? (
                <div className="w-12 h-5 bg-white/[0.04] rounded animate-pulse" />
              ) : stats ? (
                card.getValue(stats)
              ) : (
                '--'
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

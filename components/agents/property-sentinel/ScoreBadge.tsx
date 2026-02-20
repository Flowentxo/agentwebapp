'use client';

import { getScoreLabel } from '@/lib/agents/property-sentinel/config';

interface ScoreBadgeProps {
  score: number | null | undefined;
  size?: 'sm' | 'md';
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] text-white/20 bg-white/[0.04] border border-white/[0.06]">
        --
      </span>
    );
  }

  const { label, color } = getScoreLabel(score);
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`${sizeClass} rounded-full font-medium inline-flex items-center gap-1`}
      style={{
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      {score}
      <span className="opacity-60">{label}</span>
    </span>
  );
}

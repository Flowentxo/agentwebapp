'use client';

/**
 * AgentStack - Overlapping colored circles for multi-agent threads
 *
 * Shows 2-3 agent avatars stacked, with a "+N" overflow badge.
 */

interface AgentInfo {
  id: string;
  name: string;
  color: string;
}

interface AgentStackProps {
  agents: AgentInfo[];
  max?: number;
  size?: 'sm' | 'md';
}

export function AgentStack({ agents, max = 3, size = 'sm' }: AgentStackProps) {
  if (!agents || agents.length === 0) return null;

  const visible = agents.slice(0, max);
  const overflow = agents.length - max;

  const sizeClasses = size === 'sm'
    ? 'w-5 h-5 text-[8px]'
    : 'w-7 h-7 text-[10px]';

  const ringClass = size === 'sm'
    ? 'ring-1 ring-white dark:ring-zinc-900'
    : 'ring-2 ring-white dark:ring-zinc-900';

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((agent, i) => (
        <div
          key={agent.id}
          title={agent.name}
          className={`${sizeClasses} ${ringClass} rounded-full flex items-center justify-center font-bold text-white`}
          style={{
            backgroundColor: agent.color,
            zIndex: visible.length - i,
          }}
        >
          {agent.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={`${sizeClasses} ${ringClass} rounded-full flex items-center justify-center font-medium bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300`}
          style={{ zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

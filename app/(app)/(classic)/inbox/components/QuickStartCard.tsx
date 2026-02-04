'use client';

import { cn } from '@/lib/utils';
import {
  Mail,
  Target,
  PenTool,
  FileText,
  Newspaper,
  MessageSquare,
  BarChart,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Mail,
  Target,
  PenTool,
  FileText,
  Newspaper,
  MessageSquare,
  BarChart,
  Zap,
};

interface QuickStartCardProps {
  template: {
    id: string;
    name: string;
    description: string;
    icon?: string;
    color: string;
    estimatedTime?: string;
    useCase?: string;
  };
  index: number;
  onClick: (template: QuickStartCardProps['template']) => void;
}

export function QuickStartCard({ template, index, onClick }: QuickStartCardProps) {
  const Icon = (template.icon && iconMap[template.icon]) || Zap;

  // Strip emoji from template name for cleaner display
  const cleanName = template.name.replace(/[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}]\s*/gu, '');

  return (
    <button
      onClick={() => onClick(template)}
      className={cn(
        'group relative flex items-start gap-3 p-3.5 rounded-xl text-left',
        'border border-gray-200 dark:border-zinc-800',
        'bg-white dark:bg-zinc-900/50',
        'hover:border-gray-300 dark:hover:border-zinc-700',
        'hover:shadow-sm dark:hover:shadow-lg dark:hover:shadow-black/20',
        'hover:-translate-y-0.5',
        'transition-all duration-200',
        'opacity-0 animate-card-appear'
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Left color accent */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: template.color }}
      />

      {/* Icon */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: template.color + '15' }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color: template.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {cleanName}
        </h3>
        <p className="text-xs text-gray-500 dark:text-zinc-500 line-clamp-2 mt-0.5">
          {template.description}
        </p>
        {template.estimatedTime && (
          <span className="inline-block mt-1.5 text-[10px] text-gray-400 dark:text-zinc-600 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            {template.estimatedTime}
          </span>
        )}
      </div>
    </button>
  );
}

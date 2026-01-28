'use client';

import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  info?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PanelHeader({
  title,
  subtitle,
  info,
  icon,
  children,
  actions,
  className = '',
}: PanelHeaderProps) {
  return (
    <div
      role="group"
      className={`hairline-b flex min-h-[3rem] items-center justify-between px-5 py-3 ${className}`}
    >
      <div className="flex flex-1 items-center gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-semibold text-text">{title}</h3>
            {info && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Information: ${info}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-card/5 text-text-muted transition-colors hover:bg-card/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] cursor-pointer"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                        }
                      }}
                    >
                      <Info className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">{info}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
          {children}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

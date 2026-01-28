/**
 * ServiceBlade - Infrastructure Status Component
 *
 * A horizontal "server rack" style component for displaying
 * service health status with latency and load metrics.
 *
 * Part of the Deep Space Command Core design system.
 */

'use client';

import { memo } from 'react';
import { LucideIcon, Activity, Server, Database, HardDrive, Cpu, Wifi } from 'lucide-react';

type ServiceStatus = 'operational' | 'warning' | 'critical' | 'offline' | 'maintenance';

interface ServiceBladeProps {
  name: string;
  icon?: LucideIcon;
  status: ServiceStatus;
  latency?: number;
  load?: number;
  uptime?: string;
  region?: string;
  lastCheck?: string;
}

/**
 * Get default icon based on service name
 */
function getDefaultIcon(name: string): LucideIcon {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('database') || lowerName.includes('postgres') || lowerName.includes('sql')) {
    return Database;
  }
  if (lowerName.includes('redis') || lowerName.includes('cache')) {
    return HardDrive;
  }
  if (lowerName.includes('api') || lowerName.includes('gateway')) {
    return Wifi;
  }
  if (lowerName.includes('vector') || lowerName.includes('ai') || lowerName.includes('openai')) {
    return Cpu;
  }
  return Server;
}

const statusConfig: Record<ServiceStatus, {
  label: string;
  dotClass: string;
  badgeClass: string;
  textClass: string;
}> = {
  operational: {
    label: 'Operational',
    dotClass: 'status-dot-operational',
    badgeClass: 'bg-neon-emerald/10 text-neon-emerald border-neon-emerald/20',
    textClass: 'text-neon-emerald',
  },
  warning: {
    label: 'Warning',
    dotClass: 'status-dot-warning',
    badgeClass: 'bg-neon-amber/10 text-neon-amber border-neon-amber/20',
    textClass: 'text-neon-amber',
  },
  critical: {
    label: 'Critical',
    dotClass: 'status-dot-critical',
    badgeClass: 'bg-neon-red/10 text-neon-red border-neon-red/20',
    textClass: 'text-neon-red',
  },
  offline: {
    label: 'Offline',
    dotClass: 'status-dot-offline',
    badgeClass: 'bg-muted/500/10 text-muted-foreground border-slate-500/20',
    textClass: 'text-muted-foreground',
  },
  maintenance: {
    label: 'Maintenance',
    dotClass: 'status-dot-ai',
    badgeClass: 'bg-neon-purple/10 text-neon-purple border-neon-purple/20',
    textClass: 'text-neon-purple',
  },
};

/**
 * Get latency color based on value
 */
function getLatencyClass(latency: number): string {
  if (latency < 50) return 'text-neon-emerald';
  if (latency < 100) return 'text-neon-amber';
  return 'text-neon-red';
}

/**
 * Get load bar color based on percentage
 */
function getLoadColor(load: number): string {
  if (load < 50) return 'bg-neon-emerald';
  if (load < 80) return 'bg-neon-amber';
  return 'bg-neon-red';
}

function ServiceBladeComponent({
  name,
  icon,
  status,
  latency,
  load,
  uptime,
  region,
  lastCheck,
}: ServiceBladeProps) {
  const config = statusConfig[status];
  // Use provided icon or derive from service name
  const Icon = icon || getDefaultIcon(name);

  return (
    <div className="glass-blade p-4 flex items-center gap-4 group">
      {/* Status dot with pulse animation */}
      <div className="flex-shrink-0">
        <div className={`status-dot ${config.dotClass}`} />
      </div>

      {/* Icon */}
      <div className="flex-shrink-0 p-2 rounded-lg bg-card/5">
        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
      </div>

      {/* Service name and region */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-white truncate">
            {name}
          </h4>
          {region && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-card/5 text-muted-foreground font-mono uppercase">
              {region}
            </span>
          )}
        </div>
        {lastCheck && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Last check: {lastCheck}
          </p>
        )}
      </div>

      {/* Metrics section */}
      <div className="flex items-center gap-6">
        {/* Latency */}
        {latency !== undefined && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Latency
            </p>
            <p className={`text-sm font-mono font-medium ${getLatencyClass(latency)}`}>
              {latency}ms
            </p>
          </div>
        )}

        {/* Load with mini bar */}
        {load !== undefined && (
          <div className="text-right w-20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Load
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-card/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getLoadColor(load)}`}
                  style={{ width: `${Math.min(load, 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                {load}%
              </span>
            </div>
          </div>
        )}

        {/* Uptime */}
        {uptime && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Uptime
            </p>
            <p className="text-sm font-mono text-slate-300">
              {uptime}
            </p>
          </div>
        )}

        {/* Status badge */}
        <div
          className={`
            flex-shrink-0 px-2.5 py-1 rounded-md border text-[11px] font-medium uppercase tracking-wider
            ${config.badgeClass}
          `}
        >
          {config.label}
        </div>
      </div>
    </div>
  );
}

export const ServiceBlade = memo(ServiceBladeComponent);
export default ServiceBlade;

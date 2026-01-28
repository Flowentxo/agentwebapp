/**
 * KPI Cards Component
 * Displays key performance indicators for security monitoring
 */

'use client';

import { TrendingUp, TrendingDown, Minus, Shield, Lock, AlertTriangle, FileWarning } from 'lucide-react';

interface KPI {
  value: number;
  trend: 'up' | 'down' | 'neutral';
}

interface KPICardsProps {
  activeAlerts: KPI;
  blockedIPs: KPI;
  failedLogins: KPI;
  policyViolations: KPI;
}

export default function KPICards({
  activeAlerts,
  blockedIPs,
  failedLogins,
  policyViolations,
}: KPICardsProps) {
  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral', inverse: boolean = false) => {
    if (trend === 'neutral') return 'text-white/50';
    if (inverse) {
      return trend === 'up' ? 'text-green-400' : 'text-red-400';
    }
    return trend === 'up' ? 'text-red-400' : 'text-green-400';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Active Alerts */}
      <div className="panel p-5 hover-lift transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-red-500/10 ring-1 ring-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium ${getTrendColor(activeAlerts.trend)}`}>
            {getTrendIcon(activeAlerts.trend)}
            {activeAlerts.trend !== 'neutral' && (
              <span>{activeAlerts.trend === 'up' ? '+' : '-'}12%</span>
            )}
          </span>
        </div>
        <p className="text-xs uppercase tracking-wide text-white/50 font-semibold mb-1">
          Aktive Alerts
        </p>
        <p className="text-2xl font-bold text-white">{activeAlerts.value}</p>
        <p className="text-xs text-white/40 mt-1">Erfordern Überprüfung</p>
      </div>

      {/* Blocked IPs */}
      <div className="panel p-5 hover-lift transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-orange-500/10 ring-1 ring-orange-500/20">
            <Lock className="w-5 h-5 text-orange-400" />
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium ${getTrendColor(blockedIPs.trend)}`}>
            {getTrendIcon(blockedIPs.trend)}
            {blockedIPs.trend !== 'neutral' && (
              <span>{blockedIPs.trend === 'up' ? '+' : '-'}8%</span>
            )}
          </span>
        </div>
        <p className="text-xs uppercase tracking-wide text-white/50 font-semibold mb-1">
          Geblockte IPs
        </p>
        <p className="text-2xl font-bold text-white">{blockedIPs.value}</p>
        <p className="text-xs text-white/40 mt-1">Letzte 24 Stunden</p>
      </div>

      {/* Failed Logins */}
      <div className="panel p-5 hover-lift transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-yellow-500/10 ring-1 ring-yellow-500/20">
            <Shield className="w-5 h-5 text-yellow-400" />
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium ${getTrendColor(failedLogins.trend)}`}>
            {getTrendIcon(failedLogins.trend)}
            {failedLogins.trend !== 'neutral' && (
              <span>{failedLogins.trend === 'up' ? '+' : '-'}15%</span>
            )}
          </span>
        </div>
        <p className="text-xs uppercase tracking-wide text-white/50 font-semibold mb-1">
          Failed Logins
        </p>
        <p className="text-2xl font-bold text-white">{failedLogins.value}</p>
        <p className="text-xs text-white/40 mt-1">Letzte Stunde</p>
      </div>

      {/* Policy Violations */}
      <div className="panel p-5 hover-lift transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
            <FileWarning className="w-5 h-5 text-blue-400" />
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium ${getTrendColor(policyViolations.trend)}`}>
            {getTrendIcon(policyViolations.trend)}
            {policyViolations.trend !== 'neutral' && (
              <span>{policyViolations.trend === 'up' ? '+' : '-'}5%</span>
            )}
          </span>
        </div>
        <p className="text-xs uppercase tracking-wide text-white/50 font-semibold mb-1">
          Policy Violations
        </p>
        <p className="text-2xl font-bold text-white">{policyViolations.value}</p>
        <p className="text-xs text-white/40 mt-1">Letzte 7 Tage</p>
      </div>
    </div>
  );
}

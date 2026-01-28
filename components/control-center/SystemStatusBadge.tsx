'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ServiceStatus {
  name: string;
  displayName: string;
  status: 'healthy' | 'degraded' | 'down';
}

interface SystemStatusBadgeProps {
  isAdmin?: boolean;
}

export function SystemStatusBadge({ isAdmin = false }: SystemStatusBadgeProps) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          // Map health data to services
          const serviceList: ServiceStatus[] = [
            {
              name: 'api',
              displayName: 'API',
              status: data.status === 'ok' ? 'healthy' : 'degraded'
            },
            {
              name: 'database',
              displayName: 'Datenbank',
              status: data.database?.connected ? 'healthy' : 'down'
            },
            {
              name: 'redis',
              displayName: 'Cache',
              status: data.redis?.connected ? 'healthy' : 'degraded'
            },
          ];
          setServices(serviceList);
        }
      } catch (error) {
        console.error('[SystemStatus] Failed to fetch:', error);
        setServices([
          { name: 'api', displayName: 'API', status: 'degraded' },
          { name: 'database', displayName: 'Datenbank', status: 'degraded' },
          { name: 'redis', displayName: 'Cache', status: 'degraded' },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const allHealthy = services.every(s => s.status === 'healthy');
  const hasDown = services.some(s => s.status === 'down');

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated/50 border border-border">
        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
        <span className="text-xs text-text-muted">Prüfe...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all
          ${allHealthy
            ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
            : hasDown
            ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
          }
        `}
      >
        {allHealthy ? (
          <CheckCircle className="w-3.5 h-3.5" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5" />
        )}
        <span className="text-xs font-medium">
          {allHealthy ? 'Alle Systeme aktiv' : hasDown ? 'System-Warnung' : 'Eingeschränkt'}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-surface-elevated border border-border rounded-lg shadow-xl z-50"
          >
            <div className="p-3 border-b border-border">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                Systemstatus
              </span>
            </div>
            <div className="p-2 space-y-1">
              {services.map(service => (
                <div
                  key={service.name}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface/50"
                >
                  <span className="text-sm text-text">{service.displayName}</span>
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-2 h-2 rounded-full
                      ${service.status === 'healthy' ? 'bg-green-500' :
                        service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}
                    `} />
                    <span className={`text-xs ${
                      service.status === 'healthy' ? 'text-green-400' :
                      service.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {service.status === 'healthy' ? 'OK' :
                       service.status === 'degraded' ? 'Langsam' : 'Offline'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {!allHealthy && (
              <div className="p-2 border-t border-border">
                <p className="text-xs text-text-muted">
                  Unser Team arbeitet an der Behebung.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

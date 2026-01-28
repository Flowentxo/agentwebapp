'use client';

/**
 * IntegrationCardMinimal Component
 *
 * Minimal, enterprise-grade integration card matching the Command Center aesthetic.
 * Features: Logo, Name, Category Badge, Status, Action Button
 *
 * Design Philosophy:
 * - Dark mode enterprise aesthetic
 * - Subtle borders and refined spacing
 * - Description only visible on hover
 * - Reduced visual clutter
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Settings2,
  Zap,
  CheckCircle2,
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

export interface IntegrationData {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'connected' | 'available' | 'error';
  logoUrl?: string;
  syncInterval?: string;
  color?: string;
}

interface IntegrationCardMinimalProps {
  integration: IntegrationData;
  index?: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onManage?: () => void;
  isConnecting?: boolean;
}

// =====================================================
// CATEGORY STYLES
// =====================================================

const categoryStyles: Record<string, string> = {
  email: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  calendar: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  crm: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  storage: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  social: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  analytics: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  payments: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  automation: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  webhooks: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
};

// =====================================================
// MAIN COMPONENT - GRID VIEW
// =====================================================

export function IntegrationCardMinimal({
  integration,
  index = 0,
  onConnect,
  onDisconnect,
  onManage,
  isConnecting = false,
}: IntegrationCardMinimalProps) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isConnected = integration.status === 'connected';
  const categoryStyle = categoryStyles[integration.category] || categoryStyles.automation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative p-5 rounded-xl
        bg-card/[0.02] border border-white/[0.06]
        hover:bg-card/[0.04] hover:border-white/[0.1]
        transition-all duration-200
      `}
    >
      {/* Main Content */}
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="relative flex-shrink-0">
          <div className={`
            w-11 h-11 rounded-lg flex items-center justify-center
            bg-card/[0.04] border border-white/[0.08]
            transition-all duration-200
            ${isHovered ? 'border-white/[0.15]' : ''}
          `}>
            {integration.logoUrl && !imgError ? (
              <img
                src={integration.logoUrl}
                alt=""
                className="w-6 h-6 object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <Zap className="w-5 h-5 text-white/40" />
            )}
          </div>

          {/* Connection Status Dot */}
          {isConnected && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[15px] font-semibold text-white truncate">
              {integration.name}
            </h3>
            <span className={`
              px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border
              ${categoryStyle}
            `}>
              {integration.category}
            </span>
          </div>

          {/* Status Line */}
          <div className="flex items-center gap-2 text-xs text-white/40">
            {isConnected ? (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-400/80">Connected</span>
                </span>
                {integration.syncInterval && (
                  <>
                    <span className="text-white/20">•</span>
                    <span>{integration.syncInterval}</span>
                  </>
                )}
              </>
            ) : (
              <span className="text-white/30">Available to connect</span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0">
          {isConnected ? (
            <button
              onClick={onManage || onDisconnect}
              className={`
                p-2 rounded-lg transition-all duration-200
                text-white/30 hover:text-white/70
                hover:bg-card/[0.06]
              `}
              title="Manage"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className={`
                h-8 px-4 rounded-lg text-xs font-semibold
                transition-all duration-200
                ${isConnecting
                  ? 'bg-card/10 text-white/50 cursor-wait'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
                }
              `}
            >
              {isConnecting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Connect'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Hover Description */}
      {isHovered && integration.description && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="mt-3 pt-3 border-t border-white/[0.06]"
        >
          <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
            {integration.description}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// =====================================================
// LIST VIEW VARIANT
// =====================================================

export function IntegrationListItemMinimal({
  integration,
  index = 0,
  onConnect,
  onDisconnect,
  onManage,
  isConnecting = false,
}: IntegrationCardMinimalProps) {
  const [imgError, setImgError] = useState(false);

  const isConnected = integration.status === 'connected';
  const categoryStyle = categoryStyles[integration.category] || categoryStyles.automation;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={`
        group flex items-center gap-4 px-4 py-3 rounded-lg
        bg-transparent hover:bg-card/[0.03]
        border border-transparent hover:border-white/[0.06]
        transition-all duration-150
      `}
    >
      {/* Logo */}
      <div className="w-9 h-9 rounded-lg bg-card/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
        {integration.logoUrl && !imgError ? (
          <img
            src={integration.logoUrl}
            alt=""
            className="w-5 h-5 object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <Zap className="w-4 h-4 text-white/40" />
        )}
      </div>

      {/* Name & Category */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <span className="text-sm font-medium text-white truncate">
          {integration.name}
        </span>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase border ${categoryStyle}`}>
          {integration.category}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 text-xs">
        {isConnected ? (
          <span className="flex items-center gap-1.5 text-emerald-400/80">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active</span>
          </span>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </div>

      {/* Sync Interval */}
      <div className="w-20 text-xs text-white/30 text-right">
        {integration.syncInterval || '—'}
      </div>

      {/* Action */}
      <div className="w-24 flex justify-end">
        {isConnected ? (
          <button
            onClick={onManage || onDisconnect}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Manage
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className={`
              text-xs font-medium transition-colors
              ${isConnecting ? 'text-white/30' : 'text-violet-400 hover:text-violet-300'}
            `}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default IntegrationCardMinimal;

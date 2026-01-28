'use client';

/**
 * PremiumBudgetPage - Phase 11: Apple Wallet + Stripe Sales Machine
 *
 * Ultimate FinOps UI with:
 * - Interactive EnergyLevelCircle with purchase preview
 * - Glassmorphism + radial glow backgrounds
 * - Pulse effect for low balance urgency
 * - Hover preview showing post-purchase state
 * - Premium shop cards with tangible metrics
 *
 * Design Philosophy: "Apple Wallet meets Stripe Dashboard"
 *
 * @version 9.0.0 - Sales Machine Edition
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  BarChart3,
  AlertTriangle,
  Coffee,
  Package,
  Gem,
  Star,
  Check,
  Shield,
  Bell,
  BellOff,
  Sparkles,
  Users,
  BatteryCharging,
  Lock,
  Building2,
  Activity,
  CircleDollarSign,
  FileText,
  ExternalLink,
  Rocket,
  Target,
  Flame,
} from 'lucide-react';

// Hooks
import {
  useForecastData,
  useBudgetHealth,
} from '@/hooks/useBudgetAnalytics';

// =====================================================
// GLASSMORPHISM DESIGN SYSTEM
// =====================================================

const glass = {
  // Card backgrounds with depth
  card: 'rgba(255, 255, 255, 0.02)',
  cardHover: 'rgba(255, 255, 255, 0.05)',
  cardElevated: 'rgba(255, 255, 255, 0.04)',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(255, 255, 255, 0.15)',
  borderActive: 'rgba(139, 92, 246, 0.4)',

  // Radial glows for depth
  glowViolet: 'radial-gradient(ellipse 100% 80% at 50% -30%, rgba(139, 92, 246, 0.2), transparent 70%)',
  glowEmerald: 'radial-gradient(ellipse 100% 80% at 50% -30%, rgba(16, 185, 129, 0.15), transparent 70%)',
  glowAmber: 'radial-gradient(ellipse 100% 80% at 50% -30%, rgba(245, 158, 11, 0.18), transparent 70%)',
  glowRed: 'radial-gradient(ellipse 100% 80% at 50% -30%, rgba(239, 68, 68, 0.15), transparent 70%)',

  // Shadows
  shadowSoft: '0 4px 24px rgba(0, 0, 0, 0.2)',
  shadowMedium: '0 8px 32px rgba(0, 0, 0, 0.3)',
  shadowGlow: '0 0 60px rgba(139, 92, 246, 0.2)',
  shadowPopular: '0 0 40px rgba(139, 92, 246, 0.25), 0 8px 32px rgba(0, 0, 0, 0.3)',
};

// =====================================================
// ENERGY PACKAGES (with tangible metrics)
// =====================================================

interface EnergyPackage {
  id: number;
  name: string;
  tagline: string;
  cost: number;
  tokens: string;
  tokensNum: number;
  creditsValue: number; // €-value added to balance
  icon: React.ElementType;
  requests: string;
  forWhom: string;
  gradient: string;
  ringColor: string;
  popular?: boolean;
  savings?: string;
  trustLabel?: string;
}

const ENERGY_PACKAGES: EnergyPackage[] = [
  {
    id: 1,
    name: 'Cup',
    tagline: 'Quick Start',
    cost: 10,
    tokens: '50M',
    tokensNum: 50000000,
    creditsValue: 10,
    icon: Coffee,
    requests: '~500 Agent-Anfragen',
    forWhom: 'Für schnelle Tests',
    gradient: 'from-sky-400 to-cyan-500',
    ringColor: '#0EA5E9',
  },
  {
    id: 2,
    name: 'Mug',
    tagline: 'Power Pack',
    cost: 50,
    tokens: '280M',
    tokensNum: 280000000,
    creditsValue: 50,
    icon: Package,
    requests: '~3.000 Agent-Anfragen',
    forWhom: 'Für Power-User',
    gradient: 'from-violet-500 to-purple-600',
    ringColor: '#8B5CF6',
    popular: true,
    savings: '12% mehr Wert',
    trustLabel: '500+ Teams nutzen dies',
  },
  {
    id: 3,
    name: 'Case',
    tagline: 'Enterprise',
    cost: 100,
    tokens: '600M',
    tokensNum: 600000000,
    creditsValue: 100,
    icon: Gem,
    requests: '~6.500 Agent-Anfragen',
    forWhom: 'Für Teams & Agenturen',
    gradient: 'from-amber-400 to-orange-500',
    ringColor: '#F59E0B',
    savings: '20% mehr Wert',
    trustLabel: 'Maximale Ersparnis',
  },
];

// =====================================================
// UTILITIES
// =====================================================

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const formatPrecise = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

// =====================================================
// ENERGY LEVEL CIRCLE COMPONENT
// =====================================================

interface EnergyLevelCircleProps {
  currentBalance: number;
  budgetLimit: number;
  daysRemaining: number;
  previewAmount?: number; // Amount to add for hover preview
  previewColor?: string;
  isLowBalance: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function EnergyLevelCircle({
  currentBalance,
  budgetLimit,
  daysRemaining,
  previewAmount = 0,
  previewColor,
  isLowBalance,
  size = 'lg',
}: EnergyLevelCircleProps) {
  const dimensions = {
    sm: { width: 100, radius: 42, stroke: 6 },
    md: { width: 140, radius: 58, stroke: 8 },
    lg: { width: 180, radius: 76, stroke: 10 },
  };

  const { width, radius, stroke } = dimensions[size];
  const center = width / 2;
  const circumference = 2 * Math.PI * radius;

  // Current fill percentage
  const currentPercentage = Math.min(100, Math.max(0, (currentBalance / budgetLimit) * 100));
  const currentOffset = circumference - (currentPercentage / 100) * circumference;

  // Preview fill percentage (after hypothetical purchase)
  const previewBalance = Math.min(budgetLimit, currentBalance + previewAmount);
  const previewPercentage = Math.min(100, (previewBalance / budgetLimit) * 100);
  const previewOffset = circumference - (previewPercentage / 100) * circumference;

  // Colors
  const primaryColor = isLowBalance ? '#F59E0B' : '#10B981';
  const isCritical = currentBalance / budgetLimit < 0.1;

  return (
    <div className="relative" style={{ width, height: width }}>
      {/* Pulse effect for low balance */}
      {isLowBalance && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: isCritical
              ? ['0 0 0 0 rgba(239, 68, 68, 0.4)', '0 0 0 20px rgba(239, 68, 68, 0)']
              : ['0 0 0 0 rgba(245, 158, 11, 0.3)', '0 0 0 15px rgba(245, 158, 11, 0)'],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      <svg className="w-full h-full transform -rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={stroke}
          fill="none"
        />

        {/* Preview ring (dashed, shows potential) */}
        {previewAmount > 0 && previewColor && (
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            stroke={previewColor}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${stroke * 2} ${stroke}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: previewOffset }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ opacity: 0.5 }}
          />
        )}

        {/* Current balance ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke={isCritical ? '#EF4444' : primaryColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: currentOffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />

        {/* Gradient overlay for premium feel */}
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={isCritical ? '#DC2626' : isLowBalance ? '#D97706' : '#059669'} />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`font-bold tabular-nums ${
            size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl'
          } ${isCritical ? 'text-red-400' : isLowBalance ? 'text-amber-400' : 'text-emerald-400'}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {Math.round(currentPercentage)}%
        </motion.span>

        {/* Preview indicator */}
        {previewAmount > 0 && (
          <motion.span
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-medium text-violet-400"
          >
            → {Math.round(previewPercentage)}%
          </motion.span>
        )}

        {size === 'lg' && !previewAmount && (
          <span className="text-xs text-white/40 mt-1">
            ~{daysRemaining} Tage
          </span>
        )}
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function PremiumBudgetPage() {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [hoveredPackageId, setHoveredPackageId] = useState<number | null>(null);
  const [autoRecharge, setAutoRecharge] = useState(false);
  const [lowBalanceAlert, setLowBalanceAlert] = useState(true);

  // Data Hooks
  const {
    summary,
    isLoading: forecastLoading,
    refetch: refetchForecast,
  } = useForecastData({ includeModelBreakdown: true });

  const {
    health,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useBudgetHealth();

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([refetchForecast(), refetchHealth()]);
  }, [refetchForecast, refetchHealth]);

  const handlePackageBuy = async (pkg: EnergyPackage) => {
    setSelectedPackageId(pkg.id);
    setIsProcessingTopUp(true);

    try {
      const response = await fetch('/api/stripe/checkout/top-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: `pkg_${pkg.id}`,
          amount: pkg.cost,
          tokens: pkg.tokensNum,
        }),
      });

      const result = await response.json();
      if (result.url) {
        window.location.href = result.url;
      } else {
        setIsProcessingTopUp(false);
        setSelectedPackageId(null);
      }
    } catch (e) {
      setIsProcessingTopUp(false);
      setSelectedPackageId(null);
    }
  };

  // Calculate metrics
  const budgetLimit = summary?.budgetLimit || 200;
  const currentSpend = summary?.currentSpend || 72.50;
  const availableBalance = budgetLimit - currentSpend;
  const balancePercentage = availableBalance / budgetLimit;
  const isLowBalance = balancePercentage < 0.2;
  const daysRemaining = summary?.daysRemaining || 14;

  const isLoading = forecastLoading || healthLoading;

  // Hovered package for preview
  const hoveredPackage = useMemo(
    () => ENERGY_PACKAGES.find((p) => p.id === hoveredPackageId),
    [hoveredPackageId]
  );

  return (
    <div className="min-h-full relative font-sans pb-40">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LAYERED BACKGROUND GLOWS                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: glass.glowViolet }}
        />
        {isLowBalance && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: glass.glowAmber }}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HEADER                                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header className="relative px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-3 rounded-2xl backdrop-blur-xl border"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1))',
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                  boxShadow: glass.shadowGlow,
                }}
              >
                <CircleDollarSign className="w-7 h-7 text-violet-400" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Budget & Energy
                </h1>
                <p className="text-sm text-white/50">
                  Verwalte dein Guthaben und kaufe Power-Packs
                </p>
              </div>
            </div>

            <button
              onClick={handleRefreshAll}
              disabled={isLoading}
              className="p-2.5 rounded-xl backdrop-blur-xl border transition-all hover:bg-card/10"
              style={{
                background: glass.card,
                borderColor: glass.border,
              }}
            >
              <RefreshCw className={`w-4 h-4 text-white/60 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <main className="relative max-w-6xl mx-auto px-6 lg:px-8 space-y-8">

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TOP ROW: ENERGY RING + STATS + SETTINGS                     */}
        {/* ─────────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Energy Ring Card (5 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-5 relative overflow-hidden rounded-2xl backdrop-blur-xl border"
            style={{
              background: glass.cardElevated,
              borderColor: isLowBalance ? 'rgba(245, 158, 11, 0.3)' : glass.border,
              boxShadow: glass.shadowMedium,
            }}
          >
            {/* Conditional glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: isLowBalance ? glass.glowAmber : glass.glowEmerald }}
            />

            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                    Energie-Level
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-white/60">Limit:</span>
                    <span className="text-sm font-semibold text-white">{formatCurrency(budgetLimit)}</span>
                  </div>
                </div>
                {isLowBalance && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/25">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-400">Low</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-8">
                {/* The Interactive Ring */}
                <EnergyLevelCircle
                  currentBalance={availableBalance}
                  budgetLimit={budgetLimit}
                  daysRemaining={daysRemaining}
                  previewAmount={hoveredPackage?.creditsValue}
                  previewColor={hoveredPackage?.ringColor}
                  isLowBalance={isLowBalance}
                  size="lg"
                />

                {/* Stats Stack */}
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Verfügbar</p>
                    <p className="text-3xl font-bold text-white tabular-nums mt-1">
                      {formatPrecise(availableBalance)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-card/[0.03] border border-white/5">
                      <p className="text-[10px] text-white/40 uppercase">Runway</p>
                      <p className="text-lg font-bold text-white">~{daysRemaining}d</p>
                    </div>
                    <div className="p-3 rounded-xl bg-card/[0.03] border border-white/5">
                      <p className="text-[10px] text-white/40 uppercase">Verbraucht</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(currentSpend)}</p>
                    </div>
                  </div>

                  {/* Preview hint */}
                  {hoveredPackage && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20"
                    >
                      <p className="text-xs text-violet-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Nach Kauf: {formatPrecise(availableBalance + hoveredPackage.creditsValue)}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Plan Status Card (4 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-4 relative overflow-hidden rounded-2xl backdrop-blur-xl border"
            style={{
              background: glass.card,
              borderColor: glass.border,
              boxShadow: glass.shadowSoft,
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: glass.glowViolet }}
            />

            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                  Dein Plan
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase">Aktiv</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-white">Flowent Pro</h2>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>

              <div className="space-y-2 mb-5">
                {['Unbegrenzte Agents', 'Priority Support', 'API Access'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-sm text-white/60">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => window.location.href = '/settings/subscription'}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.35)',
                }}
              >
                <Crown className="w-4 h-4" />
                Upgrade
              </button>
            </div>
          </motion.div>

          {/* Quick Settings Card (3 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-3 relative overflow-hidden rounded-2xl backdrop-blur-xl border"
            style={{
              background: glass.card,
              borderColor: glass.border,
              boxShadow: glass.shadowSoft,
            }}
          >
            <div className="p-6 h-full flex flex-col">
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-4">
                Einstellungen
              </span>

              <div className="space-y-3 flex-1">
                {/* Auto-Recharge */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-card/[0.02] border border-white/5">
                  <div className="flex items-center gap-2">
                    <BatteryCharging className={`w-4 h-4 ${autoRecharge ? 'text-violet-400' : 'text-white/30'}`} />
                    <span className="text-sm text-white/70">Auto-Recharge</span>
                  </div>
                  <button
                    onClick={() => setAutoRecharge(!autoRecharge)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      autoRecharge ? 'bg-violet-500' : 'bg-card/10'
                    }`}
                  >
                    <motion.div
                      animate={{ x: autoRecharge ? 20 : 2 }}
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-card shadow-sm"
                    />
                  </button>
                </div>

                {/* Low Balance Alert */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-card/[0.02] border border-white/5">
                  <div className="flex items-center gap-2">
                    {lowBalanceAlert ? (
                      <Bell className="w-4 h-4 text-amber-400" />
                    ) : (
                      <BellOff className="w-4 h-4 text-white/30" />
                    )}
                    <span className="text-sm text-white/70">Alarm bei 10%</span>
                  </div>
                  <button
                    onClick={() => setLowBalanceAlert(!lowBalanceAlert)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      lowBalanceAlert ? 'bg-amber-500' : 'bg-card/10'
                    }`}
                  >
                    <motion.div
                      animate={{ x: lowBalanceAlert ? 20 : 2 }}
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-card shadow-sm"
                    />
                  </button>
                </div>
              </div>

              {/* Billing History */}
              <button
                onClick={() => window.location.href = '/settings/billing'}
                className="mt-3 w-full flex items-center justify-between p-2.5 rounded-xl bg-card/[0.02] border border-white/5 hover:bg-card/[0.04] transition-all group"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-white/30" />
                  <span className="text-sm text-white/60">Rechnungen</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* ENERGY SHOP                                                 */}
        {/* ─────────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl border"
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 146, 60, 0.1))',
                  borderColor: 'rgba(245, 158, 11, 0.25)',
                }}
              >
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Energy Shop</h2>
                <p className="text-sm text-white/40">Hover über ein Paket für Vorschau</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/[0.02] border border-white/5">
              <Shield className="w-3.5 h-3.5 text-emerald-400/60" />
              <span className="text-xs text-white/40">Stripe Secure</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ENERGY_PACKAGES.map((pkg, index) => {
              const Icon = pkg.icon;
              const isSelected = selectedPackageId === pkg.id;
              const isProcessing = isProcessingTopUp && isSelected;
              const isHovered = hoveredPackageId === pkg.id;

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  onHoverStart={() => setHoveredPackageId(pkg.id)}
                  onHoverEnd={() => setHoveredPackageId(null)}
                  onClick={() => !isProcessingTopUp && handlePackageBuy(pkg)}
                  className={`relative overflow-hidden rounded-2xl backdrop-blur-xl border cursor-pointer transition-all ${
                    pkg.popular
                      ? 'border-violet-500/50'
                      : isHovered
                      ? 'border-white/20'
                      : 'border-white/10'
                  }`}
                  style={{
                    background: glass.card,
                    boxShadow: pkg.popular ? glass.shadowPopular : glass.shadowSoft,
                  }}
                >
                  {/* Popular glow */}
                  {pkg.popular && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(139, 92, 246, 0.25), transparent 60%)',
                      }}
                    />
                  )}

                  {/* Popular Badge */}
                  {pkg.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                      <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="px-4 py-1.5 rounded-b-xl shadow-lg"
                        style={{
                          background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                            Most Popular
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* Savings Badge */}
                  {pkg.savings && (
                    <div className="absolute top-4 right-4 z-10">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                        {pkg.savings}
                      </span>
                    </div>
                  )}

                  <div className={`relative p-6 ${pkg.popular ? 'pt-12' : ''}`}>
                    {/* Icon with gradient bg */}
                    <div
                      className={`p-4 rounded-2xl bg-gradient-to-br ${pkg.gradient} w-fit mb-5`}
                      style={{ boxShadow: `0 8px 24px ${pkg.ringColor}40` }}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Name & Tagline */}
                    <h3 className="text-2xl font-bold text-white mb-1">{pkg.name}</h3>
                    <p className="text-sm text-white/50 mb-5">{pkg.tagline}</p>

                    {/* Price */}
                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-4xl font-bold text-white">{formatCurrency(pkg.cost)}</span>
                    </div>

                    {/* Request count - tangible metric */}
                    <div className="flex items-center gap-2 p-3.5 rounded-xl bg-card/[0.04] border border-white/5 mb-5">
                      <Target className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-white">{pkg.requests}</span>
                    </div>

                    {/* Features */}
                    <div className="space-y-2.5 mb-6">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-white/70">{pkg.forWhom}</span>
                      </div>
                      {pkg.trustLabel && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-white/30" />
                          <span className="text-sm text-white/50">{pkg.trustLabel}</span>
                        </div>
                      )}
                    </div>

                    {/* CTA Button */}
                    <button
                      disabled={isProcessingTopUp}
                      className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                        isProcessing
                          ? 'bg-card/10 text-white/40 cursor-wait'
                          : pkg.popular
                          ? 'text-white hover:opacity-90'
                          : 'bg-card text-zinc-900 hover:bg-card/90'
                      }`}
                      style={
                        pkg.popular && !isProcessing
                          ? {
                              background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
                            }
                          : undefined
                      }
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Jetzt kaufen'
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TRUST FOOTER                                                */}
        {/* ─────────────────────────────────────────────────────────── */}
        <section className="flex flex-wrap items-center justify-center gap-6 py-6 border-t border-white/5">
          <div className="flex items-center gap-2 text-white/25">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-xs">Gesichert durch</span>
          </div>
          {['Stripe', 'Visa', 'Mastercard', 'PayPal', 'SEPA'].map((provider) => (
            <span key={provider} className="text-xs font-medium text-white/20">
              {provider}
            </span>
          ))}
          <div className="flex items-center gap-2 text-white/25">
            <Shield className="w-3.5 h-3.5 text-emerald-500/40" />
            <span className="text-xs">256-bit SSL</span>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* ADVANCED ANALYTICS (Collapsed)                              */}
        {/* ─────────────────────────────────────────────────────────── */}
        <section
          className="rounded-2xl backdrop-blur-xl border overflow-hidden"
          style={{
            background: glass.card,
            borderColor: glass.border,
          }}
        >
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full flex items-center justify-between p-5 hover:bg-card/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-card/5">
                <BarChart3 className="w-4 h-4 text-white/50" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  Erweiterte Analyse
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30">
                    Pro
                  </span>
                </h3>
                <p className="text-xs text-white/40">Prognosen & Kostenaufschlüsselung</p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: isAdvancedOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="p-1.5 rounded bg-card/5"
            >
              <ChevronDown className="w-4 h-4 text-white/40" />
            </motion.div>
          </button>

          <AnimatePresence>
            {isAdvancedOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="border-t border-white/5 p-5">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      icon={TrendingUp}
                      label="Diesen Monat"
                      value={formatPrecise(currentSpend)}
                      change="+12%"
                      changeUp
                    />
                    <StatCard
                      icon={Activity}
                      label="Prognose EOM"
                      value={formatPrecise(summary?.projectedEndOfMonth || 145)}
                      sublabel="Im Budget"
                    />
                    <StatCard
                      icon={Rocket}
                      label="Health Score"
                      value={`${health?.healthScore || 87}%`}
                      status={health?.status || 'good'}
                    />
                    <StatCard
                      icon={Building2}
                      label="Top Agent"
                      value="Dexter"
                      sublabel="42% der Kosten"
                    />
                  </div>

                  <div className="mt-5 pt-5 border-t border-white/5">
                    <button
                      onClick={() => window.location.href = '/admin/finops'}
                      className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <span>Vollständigen FinOps Report öffnen</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </main>
    </div>
  );
}

// =====================================================
// STAT CARD COMPONENT
// =====================================================

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  changeUp,
  sublabel,
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  change?: string;
  changeUp?: boolean;
  sublabel?: string;
  status?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-card/[0.02] border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-white/30" />
        <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-white mb-1">{value}</p>
      {change && (
        <div className={`flex items-center gap-1 text-xs ${changeUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {changeUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span>{change}</span>
        </div>
      )}
      {sublabel && <p className="text-[11px] text-white/40">{sublabel}</p>}
      {status && (
        <span
          className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
            status === 'excellent' || status === 'good'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-amber-500/15 text-amber-400'
          }`}
        >
          {status === 'excellent' ? 'Excellent' : status === 'good' ? 'Gut' : 'Warnung'}
        </span>
      )}
    </div>
  );
}

export default PremiumBudgetPage;

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Sparkles, TrendingUp, HelpCircle, ChevronRight, PiggyBank } from 'lucide-react';

interface SimpleSavingsProps {
  hoursSaved?: number;
  tasksAutomated?: number;
  monthlyCost?: number;
}

export function SimpleSavings({
  hoursSaved = 42,
  tasksAutomated = 847,
  monthlyCost = 199
}: SimpleSavingsProps) {
  const [showDetails, setShowDetails] = useState(false);

  const hourlyRate = 50; // 50€/Stunde als Richtwert
  const estimatedValue = hoursSaved * hourlyRate;
  const netSavings = estimatedValue - monthlyCost;

  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <PiggyBank className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Das sparst du</h2>
            <p className="text-sm text-text-muted">Dieser Monat</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Main Savings Display - BIG and clear */}
        <div className="text-center py-4">
          <p className="text-sm text-text-muted mb-2">Du hast gespart:</p>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl md:text-5xl font-bold text-green-400 mb-2"
          >
            ~{formatHoursSimple(hoursSaved)}
          </motion.div>
          <div className="flex items-center justify-center gap-2 text-text-muted">
            <span>an Arbeitszeit</span>
            <div className="relative group">
              <HelpCircle className="w-4 h-4 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-surface border border-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                <p className="text-xs text-text">
                  Wir schätzen, wie lange du für diese Aufgaben ohne
                  deine Agents gebraucht hättest.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Comparison */}
        <div className="space-y-3 p-4 bg-surface rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Deine Kosten</span>
            <span className="text-sm font-medium text-text">{formatMoney(monthlyCost)}/Monat</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Wert der gesparten Zeit</span>
            <span className="text-sm font-medium text-text">~{formatMoney(estimatedValue)}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text">Du sparst also</span>
            <span className="text-lg font-bold text-green-400">~{formatMoney(netSavings)}</span>
          </div>
        </div>

        {/* Human Comparison */}
        <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="text-xl flex-shrink-0">💡</span>
          <p className="text-sm text-text">
            Das ist so, als hättest du einen <span className="font-semibold text-primary">Teilzeit-Mitarbeiter</span>,
            der fast kostenlos arbeitet. Deine Agents haben diesen Monat{' '}
            <span className="font-semibold text-primary">{tasksAutomated.toLocaleString('de-DE')} Aufgaben</span>{' '}
            für dich erledigt.
          </p>
        </div>

        {/* Visual Comparison Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Kosten</span>
            <span>Ersparnis</span>
          </div>
          <div className="h-4 rounded-full bg-surface overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(monthlyCost / estimatedValue) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full bg-muted/500"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(netSavings / estimatedValue) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{formatMoney(monthlyCost)}</span>
            <span className="text-green-400 font-medium">+{formatMoney(netSavings)}</span>
          </div>
        </div>

        {/* Details Button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-text-muted hover:text-text transition-colors"
        >
          Details anzeigen
          <ChevronRight className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
        </button>
      </div>
    </div>
  );
}

function formatHoursSimple(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} Min`;
  if (hours < 8) return `${Math.round(hours)} Std`;
  const days = Math.round(hours / 8);
  if (days === 1) return '1 Arbeitstag';
  return `${days} Arbeitstage`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

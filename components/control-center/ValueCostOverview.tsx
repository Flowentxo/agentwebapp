'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Clock,
  TrendingUp,
  Zap,
  ChevronRight,
  PiggyBank,
  Calculator,
  Sparkles,
  Download,
} from 'lucide-react';

interface CostData {
  platformCost: number;
  aiCost: number;
  totalCost: number;
}

interface ValueData {
  hoursSaved: number;
  tasksAutomated: number;
  estimatedValue: number;
  hourlyRate: number;
}

export function ValueCostOverview() {
  const [costData, setCostData] = useState<CostData | null>(null);
  const [valueData, setValueData] = useState<ValueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setCostData({
        platformCost: 199,
        aiCost: 47.50,
        totalCost: 246.50,
      });
      setValueData({
        hoursSaved: 84,
        tasksAutomated: 1247,
        estimatedValue: 4200,
        hourlyRate: 50,
      });
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !costData || !valueData) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-surface rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const netBenefit = valueData.estimatedValue - costData.totalCost;
  const roi = ((netBenefit / costData.totalCost) * 100).toFixed(0);
  const breakEvenDays = Math.max(1, Math.ceil((costData.totalCost / valueData.estimatedValue) * 30));

  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">ROI-Report</h2>
            <p className="text-sm text-text-muted">Dieser Monat</p>
          </div>
        </div>
        <button
          className="p-2 text-text-muted hover:text-text hover:bg-surface rounded-lg transition-colors"
          title="Report herunterladen"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Investment Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium text-text-muted">Deine Investition</span>
          </div>
          <div className="space-y-2">
            <CostRow label="Plattform (Pro)" value={costData.platformCost} />
            <CostRow label="AI-Nutzung" value={costData.aiCost} />
            <div className="h-px bg-border my-2" />
            <CostRow label="Gesamt" value={costData.totalCost} highlight />
          </div>
        </div>

        {/* Value Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">Ersparnis durch Automation</span>
          </div>
          <div className="space-y-2">
            <ValueRow
              icon={Clock}
              label="Zeit gespart"
              value={`${valueData.hoursSaved}h`}
              subValue={`@ ${formatCurrency(valueData.hourlyRate)}/h`}
            />
            <ValueRow
              icon={Zap}
              label="Aufgaben automatisiert"
              value={valueData.tasksAutomated.toLocaleString('de-DE')}
            />
            <div className="h-px bg-border my-2" />
            <ValueRow
              icon={TrendingUp}
              label="Geschätzter Wert"
              value={formatCurrency(valueData.estimatedValue)}
              highlight
            />
          </div>
        </div>

        {/* Net Benefit */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text">Net Benefit</span>
            <span className="text-2xl font-bold text-green-400">
              +{formatCurrency(netBenefit)}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-text">
                ROI: <span className="font-semibold text-green-400">{roi}%</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-green-400" />
              <span className="text-sm text-text">
                Break-Even: <span className="font-semibold text-green-400">{breakEvenDays} Tage</span>
              </span>
            </div>
          </div>
        </div>

        {/* Insight */}
        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text">
            Deine Agents haben sich bereits nach <span className="font-semibold text-primary">{breakEvenDays} Tagen</span> amortisiert!
            Sie sparen dir durchschnittlich <span className="font-semibold text-primary">{(valueData.hoursSaved / 20).toFixed(1)} Stunden</span> pro Tag.
          </p>
        </div>

        {/* Details Button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-text-muted hover:text-text transition-colors"
        >
          Detaillierte Aufschlüsselung anzeigen
          <ChevronRight className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
        </button>
      </div>
    </div>
  );
}

interface CostRowProps {
  label: string;
  value: number;
  highlight?: boolean;
}

function CostRow({ label, value, highlight = false }: CostRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${highlight ? 'font-semibold text-text' : 'text-text-muted'}`}>
        {label}
      </span>
      <span className={`text-sm ${highlight ? 'font-bold text-text' : 'font-medium text-text'}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

interface ValueRowProps {
  icon: typeof Clock;
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
}

function ValueRow({ icon: Icon, label, value, subValue, highlight = false }: ValueRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-text-muted" />
        <span className={`text-sm ${highlight ? 'font-semibold text-text' : 'text-text-muted'}`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${highlight ? 'font-bold text-green-400' : 'font-medium text-text'}`}>
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-text-muted">{subValue}</span>
        )}
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

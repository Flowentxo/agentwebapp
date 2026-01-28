'use client';

/**
 * ROI CALCULATOR - Agent Revolution
 *
 * Interactive widget to calculate potential savings from agent automation
 * Shows estimated hours saved, cost savings, and payback period
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Calculator,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Zap,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Sparkles
} from 'lucide-react';

// ======================
// TYPES
// ======================

interface ROIInputs {
  tasksPerWeek: number;
  minutesPerTask: number;
  hourlyRate: number;
  teamSize: number;
}

interface ROIResults {
  hoursPerWeek: number;
  hoursPerMonth: number;
  hoursPerYear: number;
  costPerMonth: number;
  costPerYear: number;
  paybackDays: number;
  efficiency: number;
}

interface ROICalculatorProps {
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
  variant?: 'sidebar' | 'inline' | 'card';
}

// ======================
// CONSTANTS
// ======================

const AGENT_MONTHLY_COST = 49; // Estimated monthly cost for agent
const AUTOMATION_EFFICIENCY = 0.85; // 85% of tasks can be automated

const INDUSTRY_PRESETS = [
  { label: 'Vertrieb', tasksPerWeek: 150, minutesPerTask: 8, hourlyRate: 45 },
  { label: 'Support', tasksPerWeek: 200, minutesPerTask: 6, hourlyRate: 35 },
  { label: 'HR', tasksPerWeek: 50, minutesPerTask: 15, hourlyRate: 50 },
  { label: 'Finanzen', tasksPerWeek: 80, minutesPerTask: 12, hourlyRate: 60 },
  { label: 'Marketing', tasksPerWeek: 100, minutesPerTask: 10, hourlyRate: 40 }
];

// ======================
// MAIN COMPONENT
// ======================

export function ROICalculator({
  isExpanded = false,
  onToggle,
  className = '',
  variant = 'sidebar'
}: ROICalculatorProps) {
  const [inputs, setInputs] = useState<ROIInputs>({
    tasksPerWeek: 100,
    minutesPerTask: 10,
    hourlyRate: 45,
    teamSize: 1
  });
  const [showDetails, setShowDetails] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Calculate ROI
  const results = useMemo<ROIResults>(() => {
    const hoursPerWeek = (inputs.tasksPerWeek * inputs.minutesPerTask * AUTOMATION_EFFICIENCY) / 60;
    const hoursPerMonth = hoursPerWeek * 4.33;
    const hoursPerYear = hoursPerMonth * 12;
    const costPerMonth = hoursPerMonth * inputs.hourlyRate * inputs.teamSize;
    const costPerYear = costPerMonth * 12;
    const paybackDays = costPerMonth > 0 ? Math.ceil((AGENT_MONTHLY_COST / costPerMonth) * 30) : 0;
    const efficiency = Math.min(100, Math.round((costPerMonth / AGENT_MONTHLY_COST) * 100));

    return {
      hoursPerWeek: Math.round(hoursPerWeek * 10) / 10,
      hoursPerMonth: Math.round(hoursPerMonth),
      hoursPerYear: Math.round(hoursPerYear),
      costPerMonth: Math.round(costPerMonth),
      costPerYear: Math.round(costPerYear),
      paybackDays,
      efficiency
    };
  }, [inputs]);

  // Handle input changes
  const handleInputChange = useCallback((field: keyof ROIInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    setActivePreset(null);
  }, []);

  // Apply preset
  const applyPreset = useCallback((preset: typeof INDUSTRY_PRESETS[0]) => {
    setInputs({
      tasksPerWeek: preset.tasksPerWeek,
      minutesPerTask: preset.minutesPerTask,
      hourlyRate: preset.hourlyRate,
      teamSize: 1
    });
    setActivePreset(preset.label);
  }, []);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Sidebar variant (compact)
  if (variant === 'sidebar') {
    return (
      <div className={`rounded-xl border border-white/10 overflow-hidden ${className}`}
        style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
        {/* Header */}
        <button
          onClick={onToggle}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-card/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-white">ROI Rechner</div>
              <div className="text-xs text-muted-foreground">
                {formatCurrency(results.costPerMonth)}/Monat sparen
              </div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2">
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRY_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`px-2 py-1 rounded-md text-xs transition-colors ${
                    activePreset === preset.label
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                      : 'bg-card/5 text-muted-foreground border border-transparent hover:bg-card/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <InputSlider
                label="Aufgaben pro Woche"
                value={inputs.tasksPerWeek}
                min={10}
                max={500}
                step={10}
                onChange={(v) => handleInputChange('tasksPerWeek', v)}
                icon={<Zap className="h-3.5 w-3.5" />}
              />
              <InputSlider
                label="Minuten pro Aufgabe"
                value={inputs.minutesPerTask}
                min={1}
                max={60}
                step={1}
                onChange={(v) => handleInputChange('minutesPerTask', v)}
                icon={<Clock className="h-3.5 w-3.5" />}
              />
              <InputSlider
                label="Stundensatz (€)"
                value={inputs.hourlyRate}
                min={20}
                max={150}
                step={5}
                onChange={(v) => handleInputChange('hourlyRate', v)}
                icon={<DollarSign className="h-3.5 w-3.5" />}
              />
              <InputSlider
                label="Teammitglieder"
                value={inputs.teamSize}
                min={1}
                max={10}
                step={1}
                onChange={(v) => handleInputChange('teamSize', v)}
                icon={<Users className="h-3.5 w-3.5" />}
              />
            </div>

            {/* Results Summary */}
            <div className="grid grid-cols-2 gap-2">
              <ResultCard
                label="Gespart/Monat"
                value={formatCurrency(results.costPerMonth)}
                icon={<DollarSign className="h-4 w-4" />}
                highlight
              />
              <ResultCard
                label="Stunden/Monat"
                value={`${results.hoursPerMonth}h`}
                icon={<Clock className="h-4 w-4" />}
              />
            </div>

            {/* Efficiency Bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">ROI-Effizienz</span>
                <span className="text-xs font-medium text-purple-400">{results.efficiency}%</span>
              </div>
              <div className="h-2 bg-card/5 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(100, results.efficiency)}%`,
                    background: results.efficiency > 100
                      ? 'linear-gradient(90deg, #22c55e, #10b981)'
                      : 'linear-gradient(90deg, #8B5CF6, #a78bfa)'
                  }}
                />
              </div>
              {results.paybackDays > 0 && results.paybackDays < 30 && (
                <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Amortisation in {results.paybackDays} Tagen
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Card variant (larger, standalone)
  if (variant === 'card') {
    return (
      <div className={`rounded-2xl border border-white/10 p-6 ${className}`}
        style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.03) 100%)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Calculator className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">ROI-Kalkulator</h3>
            <p className="text-sm text-muted-foreground">Berechne deine potenzielle Ersparnis</p>
          </div>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Branche</label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  activePreset === preset.label
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50 shadow-lg shadow-purple-500/20'
                    : 'bg-card/5 text-muted-foreground border border-white/10 hover:bg-card/10 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <InputSlider
            label="Aufgaben pro Woche"
            value={inputs.tasksPerWeek}
            min={10}
            max={500}
            step={10}
            onChange={(v) => handleInputChange('tasksPerWeek', v)}
            icon={<Zap className="h-3.5 w-3.5" />}
            size="large"
          />
          <InputSlider
            label="Minuten pro Aufgabe"
            value={inputs.minutesPerTask}
            min={1}
            max={60}
            step={1}
            onChange={(v) => handleInputChange('minutesPerTask', v)}
            icon={<Clock className="h-3.5 w-3.5" />}
            size="large"
          />
          <InputSlider
            label="Stundensatz (€)"
            value={inputs.hourlyRate}
            min={20}
            max={150}
            step={5}
            onChange={(v) => handleInputChange('hourlyRate', v)}
            icon={<DollarSign className="h-3.5 w-3.5" />}
            size="large"
          />
          <InputSlider
            label="Teammitglieder"
            value={inputs.teamSize}
            min={1}
            max={10}
            step={1}
            onChange={(v) => handleInputChange('teamSize', v)}
            icon={<Users className="h-3.5 w-3.5" />}
            size="large"
          />
        </div>

        {/* Results */}
        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{formatCurrency(results.costPerMonth)}</div>
              <div className="text-xs text-muted-foreground">Ersparnis/Monat</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{results.hoursPerMonth}h</div>
              <div className="text-xs text-muted-foreground">Zeitersparnis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {results.paybackDays < 30 ? `${results.paybackDays}d` : '< 1 Mo'}
              </div>
              <div className="text-xs text-muted-foreground">Amortisation</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Jährliche Ersparnis</span>
              <span className="text-sm font-semibold text-purple-400">{formatCurrency(results.costPerYear)}</span>
            </div>
            <div className="h-3 bg-card/5 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-700 rounded-full relative overflow-hidden"
                style={{
                  width: `${Math.min(100, results.efficiency)}%`,
                  background: 'linear-gradient(90deg, #8B5CF6, #c4b5fd)'
                }}
              >
                <div className="absolute inset-0 animate-shimmer"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shimmer { animation: shimmer 2s infinite; }
        `}</style>
      </div>
    );
  }

  // Inline variant (minimal)
  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg bg-card/5 border border-white/10 ${className}`}>
      <Calculator className="h-5 w-5 text-purple-400" />
      <div className="flex-1 flex items-center gap-6">
        <div>
          <div className="text-xs text-muted-foreground">Monatliche Ersparnis</div>
          <div className="text-lg font-bold text-white">{formatCurrency(results.costPerMonth)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Zeitersparnis</div>
          <div className="text-lg font-bold text-white">{results.hoursPerMonth}h</div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          {showDetails ? 'Weniger' : 'Details'} →
        </button>
      </div>
    </div>
  );
}

// ======================
// SUB-COMPONENTS
// ======================

function InputSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  icon,
  size = 'small'
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  icon: React.ReactNode;
  size?: 'small' | 'large';
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={size === 'large' ? 'space-y-2' : 'space-y-1.5'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className={`font-medium ${size === 'large' ? 'text-sm' : 'text-xs'}`}>{label}</span>
        </div>
        <span className={`text-white font-medium ${size === 'large' ? 'text-sm' : 'text-xs'}`}>{value}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full appearance-none bg-transparent cursor-pointer ${
            size === 'large' ? 'h-2' : 'h-1.5'
          }`}
          style={{
            background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`,
            borderRadius: '9999px'
          }}
        />
      </div>
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: ${size === 'large' ? '16px' : '12px'};
          height: ${size === 'large' ? '16px' : '12px'};
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: transform 0.15s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: ${size === 'large' ? '16px' : '12px'};
          height: ${size === 'large' ? '16px' : '12px'};
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}

function ResultCard({
  label,
  value,
  icon,
  highlight = false
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg ${
        highlight
          ? 'bg-purple-500/20 border border-purple-500/30'
          : 'bg-card/5 border border-white/10'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className={highlight ? 'text-purple-400' : 'text-muted-foreground'}>
          {icon}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-bold ${highlight ? 'text-purple-300' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

export default ROICalculator;

'use client';

/**
 * Enterprise Budget Dashboard Component
 * Main dashboard integrating all enterprise budget management features
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Brain,
  Building2,
  FolderKanban,
  FileText,
  Download,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  Settings,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ForecastCard } from './ForecastCard';
import { CostCenterManager } from './CostCenterManager';
import { ProjectManager } from './ProjectManager';
import { AuditLogViewer } from './AuditLogViewer';

type TabId = 'overview' | 'cost-centers' | 'projects' | 'audit-logs';

interface Tab {
  id: TabId;
  label: string;
  icon: any;
  description: string;
}

const tabs: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    description: 'AI-powered forecasts and insights',
  },
  {
    id: 'cost-centers',
    label: 'Cost Centers',
    icon: Building2,
    description: 'Departmental budget allocation',
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    description: 'Granular cost tracking',
  },
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    icon: FileText,
    description: 'Compliance & monitoring',
  },
];

interface EnterpriseBudgetDashboardProps {
  className?: string;
}

export function EnterpriseBudgetDashboard({ className = '' }: EnterpriseBudgetDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportAll = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/budget/enterprise/export?type=summary&format=json');
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enterprise-budget-summary-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enterprise Header */}
      <div className="relative rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 overflow-hidden p-6">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-orange-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/40">
              <Crown className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">Enterprise Budget</h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="text-sm text-white/50 mt-1">
                Advanced cost management with AI forecasting & compliance tracking
              </p>
            </div>
          </div>

          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card/5 hover:bg-card/10 border border-white/10 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export All Data'}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="relative grid grid-cols-4 gap-4 mt-6">
          <QuickStat
            icon={Brain}
            label="AI Confidence"
            value="94%"
            trend="+2.3%"
            color="text-indigo-400"
            bgColor="bg-indigo-500/20"
          />
          <QuickStat
            icon={Building2}
            label="Cost Centers"
            value="12"
            subtext="Active"
            color="text-emerald-400"
            bgColor="bg-emerald-500/20"
          />
          <QuickStat
            icon={FolderKanban}
            label="Projects"
            value="47"
            subtext="In Progress"
            color="text-purple-400"
            bgColor="bg-purple-500/20"
          />
          <QuickStat
            icon={DollarSign}
            label="This Month"
            value="$24.5K"
            trend="-12%"
            color="text-green-400"
            bgColor="bg-green-500/20"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1 rounded-2xl bg-card/[0.02] border border-white/[0.05]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-card/10 text-white'
                  : 'text-white/50 hover:text-white/70 hover:bg-card/[0.03]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-6">
              <ForecastCard
                className="col-span-2 lg:col-span-1"
                onViewDetails={() => setActiveTab('audit-logs')}
              />

              {/* Enterprise Features Highlight */}
              <div className="rounded-3xl bg-card/[0.02] border border-white/[0.05] p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
                      Enterprise Features
                    </h3>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      Advanced capabilities
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <FeatureItem
                    icon={Brain}
                    title="AI-Powered Forecasting"
                    description="Linear regression analysis for accurate predictions"
                    color="text-indigo-400"
                  />
                  <FeatureItem
                    icon={Building2}
                    title="Cost Center Management"
                    description="Departmental budget allocation & tracking"
                    color="text-emerald-400"
                  />
                  <FeatureItem
                    icon={FolderKanban}
                    title="Project-Level Tracking"
                    description="Granular cost attribution per project"
                    color="text-purple-400"
                  />
                  <FeatureItem
                    icon={FileText}
                    title="Compliance Audit Logs"
                    description="7-year retention for regulatory compliance"
                    color="text-amber-400"
                  />
                  <FeatureItem
                    icon={TrendingUp}
                    title="Anomaly Detection"
                    description="Real-time alerts for unusual spending"
                    color="text-red-400"
                  />
                  <FeatureItem
                    icon={Download}
                    title="Data Export"
                    description="Export to JSON or CSV for reporting"
                    color="text-blue-400"
                  />
                </div>
              </div>

              {/* Recent Activity */}
              <div className="col-span-2 rounded-3xl bg-card/[0.02] border border-white/[0.05] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
                    Recent Activity
                  </h3>
                  <button
                    onClick={() => setActiveTab('audit-logs')}
                    className="text-xs text-white/40 hover:text-white flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <AuditLogViewer defaultDateRange={7} className="border-0 bg-transparent p-0" />
              </div>
            </div>
          )}

          {activeTab === 'cost-centers' && (
            <CostCenterManager
              onCostCenterSelect={(cc) => {
                setSelectedCostCenterId(cc.id);
                setActiveTab('projects');
              }}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectManager
              costCenterId={selectedCostCenterId || undefined}
              onProjectSelect={(project) => {
                console.log('Selected project:', project);
              }}
            />
          )}

          {activeTab === 'audit-logs' && <AuditLogViewer defaultDateRange={30} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Quick Stat Component
interface QuickStatProps {
  icon: any;
  label: string;
  value: string;
  trend?: string;
  subtext?: string;
  color: string;
  bgColor: string;
}

function QuickStat({ icon: Icon, label, value, trend, subtext, color, bgColor }: QuickStatProps) {
  return (
    <div className="p-4 rounded-2xl bg-card/[0.03] border border-white/[0.05]">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${bgColor}`}>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-black text-white">{value}</span>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.startsWith('+') ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {trend}
          </span>
        )}
        {subtext && <span className="text-xs text-white/40">{subtext}</span>}
      </div>
    </div>
  );
}

// Feature Item Component
interface FeatureItemProps {
  icon: any;
  title: string;
  description: string;
  color: string;
}

function FeatureItem({ icon: Icon, title, description, color }: FeatureItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-card/[0.03] transition-colors">
      <Icon className={`h-5 w-5 ${color} shrink-0 mt-0.5`} />
      <div>
        <h4 className="text-sm font-medium text-white">{title}</h4>
        <p className="text-xs text-white/40">{description}</p>
      </div>
    </div>
  );
}

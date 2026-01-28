'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Slack,
  Mail,
  Webhook,
  Phone,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  MoreVertical,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  RefreshCw,
  Activity,
  TrendingUp,
  Timer,
  DollarSign,
  AlertOctagon,
  Layers,
  X,
  Check,
  Save,
  Copy,
  History,
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import {
  useAlertRules,
  useAlertRuleMutations,
  useAlertIncidents,
  useIncidentActions,
  AlertRule,
  AlertIncident,
  AlertConditionType,
  AlertActionType,
} from '@/hooks/useOpsMetrics';

// ============================================================================
// Types
// ============================================================================

interface AlertRulesManagerProps {
  workspaceId?: string;
  className?: string;
}

type TabType = 'rules' | 'incidents';
type IncidentFilter = 'all' | 'active' | 'acknowledged' | 'resolved';

interface RuleFormData {
  name: string;
  description: string;
  conditionType: AlertConditionType;
  conditionConfig: {
    threshold?: number;
    windowMinutes?: number;
    workflowId?: string;
    queueName?: string;
    errorPattern?: string;
  };
  actions: Array<{
    type: AlertActionType;
    config: Record<string, string>;
  }>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldownMinutes: number;
  enabled: boolean;
}

const defaultFormData: RuleFormData = {
  name: '',
  description: '',
  conditionType: 'failure_rate',
  conditionConfig: {
    threshold: 5,
    windowMinutes: 10,
  },
  actions: [],
  severity: 'medium',
  cooldownMinutes: 15,
  enabled: true,
};

// ============================================================================
// Constants
// ============================================================================

const CONDITION_TYPE_OPTIONS: Array<{
  value: AlertConditionType;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    value: 'failure_count',
    label: 'Failure Count',
    description: 'Alert when failures exceed threshold in time window',
    icon: XCircle,
  },
  {
    value: 'failure_rate',
    label: 'Failure Rate',
    description: 'Alert when failure percentage exceeds threshold',
    icon: TrendingUp,
  },
  {
    value: 'duration_threshold',
    label: 'Duration Threshold',
    description: 'Alert when execution duration exceeds limit',
    icon: Timer,
  },
  {
    value: 'queue_backlog',
    label: 'Queue Backlog',
    description: 'Alert when queue waiting jobs exceed threshold',
    icon: Layers,
  },
  {
    value: 'error_pattern',
    label: 'Error Pattern',
    description: 'Alert when specific error pattern is detected',
    icon: AlertOctagon,
  },
  {
    value: 'cost_threshold',
    label: 'Cost Threshold',
    description: 'Alert when daily costs exceed budget',
    icon: DollarSign,
  },
];

const ACTION_TYPE_OPTIONS: Array<{
  value: AlertActionType;
  label: string;
  icon: React.ElementType;
  configFields: Array<{ key: string; label: string; placeholder: string }>;
}> = [
  {
    value: 'slack',
    label: 'Slack',
    icon: Slack,
    configFields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/...' },
      { key: 'channel', label: 'Channel', placeholder: '#alerts' },
    ],
  },
  {
    value: 'email',
    label: 'Email',
    icon: Mail,
    configFields: [
      { key: 'to', label: 'To', placeholder: 'team@company.com' },
      { key: 'subject', label: 'Subject Prefix', placeholder: '[ALERT]' },
    ],
  },
  {
    value: 'webhook',
    label: 'Webhook',
    icon: Webhook,
    configFields: [
      { key: 'url', label: 'URL', placeholder: 'https://api.example.com/alerts' },
      { key: 'secret', label: 'Secret (optional)', placeholder: 'hmac-secret' },
    ],
  },
  {
    value: 'pagerduty',
    label: 'PagerDuty',
    icon: Phone,
    configFields: [
      { key: 'routingKey', label: 'Routing Key', placeholder: 'your-routing-key' },
      { key: 'severity', label: 'Override Severity', placeholder: 'critical' },
    ],
  },
];

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { value: 'high', label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { value: 'critical', label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10' },
] as const;

// ============================================================================
// Utility Functions
// ============================================================================

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

function getSeverityStyles(severity: string, isDark: boolean) {
  const styles = {
    low: {
      badge: isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700',
      dot: 'bg-blue-400',
    },
    medium: {
      badge: isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700',
      dot: 'bg-yellow-400',
    },
    high: {
      badge: isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700',
      dot: 'bg-orange-400',
    },
    critical: {
      badge: isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700',
      dot: 'bg-red-400',
    },
  };
  return styles[severity as keyof typeof styles] || styles.medium;
}

function getStatusStyles(status: string, isDark: boolean) {
  const styles = {
    active: {
      badge: isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700',
      icon: AlertTriangle,
    },
    acknowledged: {
      badge: isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700',
      icon: Eye,
    },
    resolved: {
      badge: isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700',
      icon: CheckCircle,
    },
  };
  return styles[status as keyof typeof styles] || styles.active;
}

// ============================================================================
// Sub-Components
// ============================================================================

// Tab Button
function TabButton({
  active,
  onClick,
  children,
  count,
  isDark,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
        active
          ? isDark
            ? 'bg-white/10 text-white'
            : 'bg-slate-900 text-white'
          : isDark
          ? 'text-slate-400 hover:text-white hover:bg-white/5'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      )}
    >
      <span className="flex items-center gap-2">
        {children}
        {typeof count === 'number' && count > 0 && (
          <span
            className={cn(
              'px-1.5 py-0.5 text-xs rounded-full',
              active
                ? 'bg-white/20 text-white'
                : isDark
                ? 'bg-white/10 text-slate-300'
                : 'bg-slate-200 text-slate-600'
            )}
          >
            {count}
          </span>
        )}
      </span>
      {active && (
        <motion.div
          layoutId="activeTab"
          className={cn(
            'absolute bottom-0 left-2 right-2 h-0.5 rounded-full',
            isDark ? 'bg-indigo-400' : 'bg-indigo-600'
          )}
        />
      )}
    </button>
  );
}

// Rule Card Component
function RuleCard({
  rule,
  isDark,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: AlertRule;
  isDark: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const severityStyles = getSeverityStyles(rule.severity, isDark);
  const conditionOption = CONDITION_TYPE_OPTIONS.find((c) => c.value === rule.conditionType);
  const ConditionIcon = conditionOption?.icon || Activity;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'relative rounded-xl border p-4 transition-all duration-200',
        isDark
          ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm',
        !rule.enabled && 'opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
              rule.enabled
                ? isDark
                  ? 'bg-indigo-500/20'
                  : 'bg-indigo-100'
                : isDark
                ? 'bg-slate-700'
                : 'bg-slate-100'
            )}
          >
            <ConditionIcon
              className={cn(
                'w-5 h-5',
                rule.enabled
                  ? isDark
                    ? 'text-indigo-400'
                    : 'text-indigo-600'
                  : isDark
                  ? 'text-slate-500'
                  : 'text-slate-400'
              )}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={cn(
                  'font-medium truncate',
                  isDark ? 'text-white' : 'text-slate-900'
                )}
              >
                {rule.name}
              </h3>
              <span className={cn('px-2 py-0.5 text-xs rounded-full', severityStyles.badge)}>
                {rule.severity}
              </span>
            </div>

            {rule.description && (
              <p
                className={cn(
                  'text-sm mt-1 line-clamp-2',
                  isDark ? 'text-slate-400' : 'text-slate-600'
                )}
              >
                {rule.description}
              </p>
            )}

            {/* Condition Summary */}
            <div className="flex items-center gap-4 mt-3 text-xs">
              <span className={cn(isDark ? 'text-slate-500' : 'text-slate-500')}>
                {conditionOption?.label}
                {rule.conditionConfig?.threshold && ` > ${rule.conditionConfig.threshold}`}
                {rule.conditionConfig?.windowMinutes &&
                  ` in ${rule.conditionConfig.windowMinutes}m`}
              </span>

              {/* Actions Icons */}
              <div className="flex items-center gap-1">
                {rule.actions?.map((action, idx) => {
                  const ActionOption = ACTION_TYPE_OPTIONS.find((a) => a.value === action.type);
                  const ActionIcon = ActionOption?.icon || Webhook;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'w-5 h-5 rounded flex items-center justify-center',
                        isDark ? 'bg-slate-700' : 'bg-slate-100'
                      )}
                      title={ActionOption?.label}
                    >
                      <ActionIcon
                        className={cn(
                          'w-3 h-3',
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Enable/Disable Toggle */}
          <button
            onClick={onToggle}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
            )}
            title={rule.enabled ? 'Disable rule' : 'Enable rule'}
          >
            {rule.enabled ? (
              <Bell className={cn('w-4 h-4', isDark ? 'text-green-400' : 'text-green-600')} />
            ) : (
              <BellOff className={cn('w-4 h-4', isDark ? 'text-slate-500' : 'text-slate-400')} />
            )}
          </button>

          {/* More Actions */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
              )}
            >
              <MoreVertical
                className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-slate-500')}
              />
            </button>

            <AnimatePresence>
              {showActions && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActions(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      'absolute right-0 top-full mt-1 w-36 rounded-lg border shadow-lg z-20 py-1',
                      isDark
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-white border-slate-200'
                    )}
                  >
                    <button
                      onClick={() => {
                        setShowActions(false);
                        onEdit();
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
                        isDark
                          ? 'hover:bg-white/10 text-slate-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      )}
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowActions(false);
                        onDelete();
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-500',
                        isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      {rule.lastTriggeredAt && (
        <div
          className={cn(
            'mt-3 pt-3 border-t flex items-center gap-4 text-xs',
            isDark ? 'border-slate-700' : 'border-slate-100'
          )}
        >
          <span className={cn(isDark ? 'text-slate-500' : 'text-slate-500')}>
            <Clock className="w-3 h-3 inline mr-1" />
            Last triggered: {formatTimeAgo(rule.lastTriggeredAt)}
          </span>
          {rule.triggerCount && (
            <span className={cn(isDark ? 'text-slate-500' : 'text-slate-500')}>
              <Activity className="w-3 h-3 inline mr-1" />
              {rule.triggerCount} triggers total
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Incident Card Component
function IncidentCard({
  incident,
  isDark,
  onAcknowledge,
  onResolve,
  onSilence,
}: {
  incident: AlertIncident;
  isDark: boolean;
  onAcknowledge: () => void;
  onResolve: () => void;
  onSilence: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const severityStyles = getSeverityStyles(incident.severity, isDark);
  const statusStyles = getStatusStyles(incident.status, isDark);
  const StatusIcon = statusStyles.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'rounded-xl border overflow-hidden transition-all duration-200',
        isDark
          ? 'bg-slate-800/50 border-slate-700/50'
          : 'bg-white border-slate-200 shadow-sm',
        incident.status === 'active' && (isDark ? 'border-red-500/30' : 'border-red-200')
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'p-4 cursor-pointer',
          isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Severity Indicator */}
            <div
              className={cn(
                'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                severityStyles.badge
              )}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={cn(
                    'font-medium',
                    isDark ? 'text-white' : 'text-slate-900'
                  )}
                >
                  {incident.title}
                </h3>
                <span className={cn('px-2 py-0.5 text-xs rounded-full', statusStyles.badge)}>
                  <StatusIcon className="w-3 h-3 inline mr-1" />
                  {incident.status}
                </span>
              </div>

              <p
                className={cn(
                  'text-sm mt-1 line-clamp-2',
                  isDark ? 'text-slate-400' : 'text-slate-600'
                )}
              >
                {incident.message}
              </p>

              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className={cn(isDark ? 'text-slate-500' : 'text-slate-500')}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatTimeAgo(incident.triggeredAt)}
                </span>
                {incident.ruleName && (
                  <span className={cn(isDark ? 'text-slate-500' : 'text-slate-500')}>
                    <Bell className="w-3 h-3 inline mr-1" />
                    {incident.ruleName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Expand Toggle */}
          <button
            className={cn(
              'p-1 rounded',
              isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
            )}
          >
            {expanded ? (
              <ChevronDown
                className={cn('w-5 h-5', isDark ? 'text-slate-400' : 'text-slate-500')}
              />
            ) : (
              <ChevronRight
                className={cn('w-5 h-5', isDark ? 'text-slate-400' : 'text-slate-500')}
              />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className={cn(
                'px-4 pb-4 pt-0 border-t',
                isDark ? 'border-slate-700' : 'border-slate-100'
              )}
            >
              {/* Details */}
              {incident.details && (
                <div
                  className={cn(
                    'mt-3 p-3 rounded-lg text-xs font-mono',
                    isDark ? 'bg-slate-900/50' : 'bg-slate-50'
                  )}
                >
                  <pre className={cn('whitespace-pre-wrap', isDark ? 'text-slate-300' : 'text-slate-700')}>
                    {JSON.stringify(incident.details, null, 2)}
                  </pre>
                </div>
              )}

              {/* Timeline */}
              {incident.acknowledgedAt && (
                <div
                  className={cn(
                    'mt-3 text-xs',
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  )}
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  Acknowledged {formatTimeAgo(incident.acknowledgedAt)}
                  {incident.acknowledgedBy && ` by ${incident.acknowledgedBy}`}
                </div>
              )}

              {incident.resolvedAt && (
                <div
                  className={cn(
                    'mt-1 text-xs',
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  )}
                >
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Resolved {formatTimeAgo(incident.resolvedAt)}
                  {incident.resolvedBy && ` by ${incident.resolvedBy}`}
                </div>
              )}

              {/* Actions */}
              {incident.status !== 'resolved' && (
                <div className="mt-4 flex items-center gap-2">
                  {incident.status === 'active' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcknowledge();
                      }}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors',
                        isDark
                          ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      )}
                    >
                      <Eye className="w-4 h-4" />
                      Acknowledge
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolve();
                    }}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors',
                      isDark
                        ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    )}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Resolve
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSilence();
                    }}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors',
                      isDark
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    <VolumeX className="w-4 h-4" />
                    Silence 1h
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Rule Form Modal
function RuleFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isDark,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RuleFormData) => void;
  initialData?: RuleFormData;
  isDark: boolean;
  isLoading?: boolean;
}) {
  const [formData, setFormData] = useState<RuleFormData>(initialData || defaultFormData);
  const [activeActionIndex, setActiveActionIndex] = useState<number | null>(null);

  const handleConditionTypeChange = (type: AlertConditionType) => {
    const defaults: Record<AlertConditionType, RuleFormData['conditionConfig']> = {
      failure_count: { threshold: 5, windowMinutes: 10 },
      failure_rate: { threshold: 5, windowMinutes: 10 },
      duration_threshold: { threshold: 30000, windowMinutes: 5 },
      queue_backlog: { threshold: 100, queueName: '' },
      error_pattern: { errorPattern: '', windowMinutes: 10 },
      cost_threshold: { threshold: 100 },
    };

    setFormData({
      ...formData,
      conditionType: type,
      conditionConfig: defaults[type],
    });
  };

  const addAction = (type: AlertActionType) => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        { type, config: {} },
      ],
    });
    setActiveActionIndex(formData.actions.length);
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index),
    });
    if (activeActionIndex === index) {
      setActiveActionIndex(null);
    }
  };

  const updateActionConfig = (index: number, key: string, value: string) => {
    const newActions = [...formData.actions];
    newActions[index] = {
      ...newActions[index],
      config: { ...newActions[index].config, [key]: value },
    };
    setFormData({ ...formData, actions: newActions });
  };

  if (!isOpen) return null;

  const conditionOption = CONDITION_TYPE_OPTIONS.find((c) => c.value === formData.conditionType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl',
          isDark ? 'bg-slate-800' : 'bg-white'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between',
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          )}
        >
          <h2 className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
            {initialData ? 'Edit Alert Rule' : 'Create Alert Rule'}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
            )}
          >
            <X className={cn('w-5 h-5', isDark ? 'text-slate-400' : 'text-slate-500')} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label
                className={cn(
                  'block text-sm font-medium mb-2',
                  isDark ? 'text-slate-300' : 'text-slate-700'
                )}
              >
                Rule Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., High Failure Rate Alert"
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border text-sm transition-colors',
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                )}
              />
            </div>

            <div>
              <label
                className={cn(
                  'block text-sm font-medium mb-2',
                  isDark ? 'text-slate-300' : 'text-slate-700'
                )}
              >
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe when and why this alert should fire..."
                rows={2}
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border text-sm transition-colors resize-none',
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                )}
              />
            </div>
          </div>

          {/* Condition Type */}
          <div>
            <label
              className={cn(
                'block text-sm font-medium mb-3',
                isDark ? 'text-slate-300' : 'text-slate-700'
              )}
            >
              Condition Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITION_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.conditionType === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleConditionTypeChange(option.value)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      isSelected
                        ? isDark
                          ? 'bg-indigo-500/20 border-indigo-500/50'
                          : 'bg-indigo-50 border-indigo-300'
                        : isDark
                        ? 'bg-slate-900 border-slate-700 hover:border-slate-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          'w-4 h-4',
                          isSelected
                            ? isDark
                              ? 'text-indigo-400'
                              : 'text-indigo-600'
                            : isDark
                            ? 'text-slate-400'
                            : 'text-slate-500'
                        )}
                      />
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isSelected
                            ? isDark
                              ? 'text-white'
                              : 'text-slate-900'
                            : isDark
                            ? 'text-slate-300'
                            : 'text-slate-700'
                        )}
                      >
                        {option.label}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-xs mt-1',
                        isDark ? 'text-slate-500' : 'text-slate-500'
                      )}
                    >
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Condition Config */}
          <div>
            <label
              className={cn(
                'block text-sm font-medium mb-3',
                isDark ? 'text-slate-300' : 'text-slate-700'
              )}
            >
              Condition Settings
            </label>
            <div
              className={cn(
                'p-4 rounded-lg border space-y-4',
                isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
              )}
            >
              {/* Threshold */}
              {(formData.conditionType === 'failure_count' ||
                formData.conditionType === 'failure_rate' ||
                formData.conditionType === 'duration_threshold' ||
                formData.conditionType === 'queue_backlog' ||
                formData.conditionType === 'cost_threshold') && (
                <div className="flex items-center gap-3">
                  <span className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    {formData.conditionType === 'failure_rate'
                      ? 'Failure rate exceeds'
                      : formData.conditionType === 'failure_count'
                      ? 'Failure count exceeds'
                      : formData.conditionType === 'duration_threshold'
                      ? 'Duration exceeds'
                      : formData.conditionType === 'queue_backlog'
                      ? 'Backlog exceeds'
                      : 'Daily cost exceeds'}
                  </span>
                  <input
                    type="number"
                    value={formData.conditionConfig.threshold || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        conditionConfig: {
                          ...formData.conditionConfig,
                          threshold: parseFloat(e.target.value),
                        },
                      })
                    }
                    className={cn(
                      'w-24 px-3 py-1.5 rounded-lg border text-sm text-center',
                      isDark
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    )}
                  />
                  <span className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    {formData.conditionType === 'failure_rate'
                      ? '%'
                      : formData.conditionType === 'duration_threshold'
                      ? 'ms'
                      : formData.conditionType === 'cost_threshold'
                      ? 'USD'
                      : 'items'}
                  </span>
                </div>
              )}

              {/* Window */}
              {(formData.conditionType === 'failure_count' ||
                formData.conditionType === 'failure_rate' ||
                formData.conditionType === 'duration_threshold' ||
                formData.conditionType === 'error_pattern') && (
                <div className="flex items-center gap-3">
                  <span className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    Within
                  </span>
                  <input
                    type="number"
                    value={formData.conditionConfig.windowMinutes || 10}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        conditionConfig: {
                          ...formData.conditionConfig,
                          windowMinutes: parseInt(e.target.value),
                        },
                      })
                    }
                    className={cn(
                      'w-20 px-3 py-1.5 rounded-lg border text-sm text-center',
                      isDark
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    )}
                  />
                  <span className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    minutes
                  </span>
                </div>
              )}

              {/* Queue Name */}
              {formData.conditionType === 'queue_backlog' && (
                <div>
                  <label
                    className={cn(
                      'block text-xs mb-1',
                      isDark ? 'text-slate-500' : 'text-slate-500'
                    )}
                  >
                    Queue Name (optional - leave empty for all queues)
                  </label>
                  <input
                    type="text"
                    value={formData.conditionConfig.queueName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        conditionConfig: {
                          ...formData.conditionConfig,
                          queueName: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g., workflow-execution"
                    className={cn(
                      'w-full px-3 py-1.5 rounded-lg border text-sm',
                      isDark
                        ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    )}
                  />
                </div>
              )}

              {/* Error Pattern */}
              {formData.conditionType === 'error_pattern' && (
                <div>
                  <label
                    className={cn(
                      'block text-xs mb-1',
                      isDark ? 'text-slate-500' : 'text-slate-500'
                    )}
                  >
                    Error Pattern (regex supported)
                  </label>
                  <input
                    type="text"
                    value={formData.conditionConfig.errorPattern || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        conditionConfig: {
                          ...formData.conditionConfig,
                          errorPattern: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g., ECONNREFUSED|timeout"
                    className={cn(
                      'w-full px-3 py-1.5 rounded-lg border text-sm font-mono',
                      isDark
                        ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    )}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div>
            <label
              className={cn(
                'block text-sm font-medium mb-3',
                isDark ? 'text-slate-300' : 'text-slate-700'
              )}
            >
              Notification Channels
            </label>

            {/* Added Actions */}
            {formData.actions.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.actions.map((action, index) => {
                  const ActionOption = ACTION_TYPE_OPTIONS.find((a) => a.value === action.type);
                  if (!ActionOption) return null;
                  const Icon = ActionOption.icon;
                  const isActive = activeActionIndex === index;

                  return (
                    <div
                      key={index}
                      className={cn(
                        'rounded-lg border overflow-hidden',
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                      )}
                    >
                      <div
                        className={cn(
                          'px-4 py-3 flex items-center justify-between cursor-pointer',
                          isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                        )}
                        onClick={() => setActiveActionIndex(isActive ? null : index)}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              'w-5 h-5',
                              isDark ? 'text-indigo-400' : 'text-indigo-600'
                            )}
                          />
                          <span className={cn('text-sm', isDark ? 'text-white' : 'text-slate-900')}>
                            {ActionOption.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAction(index);
                            }}
                            className={cn(
                              'p-1 rounded',
                              isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-50'
                            )}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                          {isActive ? (
                            <ChevronDown
                              className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-slate-500')}
                            />
                          ) : (
                            <ChevronRight
                              className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-slate-500')}
                            />
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                          >
                            <div
                              className={cn(
                                'px-4 pb-4 space-y-3 border-t',
                                isDark ? 'border-slate-700' : 'border-slate-100'
                              )}
                            >
                              {ActionOption.configFields.map((field) => (
                                <div key={field.key} className="pt-3">
                                  <label
                                    className={cn(
                                      'block text-xs mb-1',
                                      isDark ? 'text-slate-500' : 'text-slate-500'
                                    )}
                                  >
                                    {field.label}
                                  </label>
                                  <input
                                    type="text"
                                    value={action.config[field.key] || ''}
                                    onChange={(e) =>
                                      updateActionConfig(index, field.key, e.target.value)
                                    }
                                    placeholder={field.placeholder}
                                    className={cn(
                                      'w-full px-3 py-1.5 rounded-lg border text-sm',
                                      isDark
                                        ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
                                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                    )}
                                  />
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {ACTION_TYPE_OPTIONS.filter(
                (option) => !formData.actions.some((a) => a.type === option.value)
              ).map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => addAction(option.value)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors',
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity & Cooldown */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className={cn(
                  'block text-sm font-medium mb-2',
                  isDark ? 'text-slate-300' : 'text-slate-700'
                )}
              >
                Severity
              </label>
              <div className="flex gap-2">
                {SEVERITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, severity: option.value })}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      formData.severity === option.value
                        ? cn(option.bg, option.color, 'ring-2 ring-offset-2', isDark ? 'ring-offset-slate-800' : 'ring-offset-white')
                        : isDark
                        ? 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                className={cn(
                  'block text-sm font-medium mb-2',
                  isDark ? 'text-slate-300' : 'text-slate-700'
                )}
              >
                Cooldown (minutes)
              </label>
              <input
                type="number"
                value={formData.cooldownMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) })
                }
                min={1}
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border text-sm',
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                )}
              />
              <p className={cn('text-xs mt-1', isDark ? 'text-slate-500' : 'text-slate-500')}>
                Minimum time between alerts
              </p>
            </div>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className={cn('text-sm font-medium', isDark ? 'text-slate-300' : 'text-slate-700')}>
                Enable Rule
              </span>
              <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
                Rule will start monitoring immediately when enabled
              </p>
            </div>
            <button
              onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                formData.enabled
                  ? isDark
                    ? 'bg-indigo-500'
                    : 'bg-indigo-600'
                  : isDark
                  ? 'bg-slate-700'
                  : 'bg-slate-300'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  formData.enabled ? 'translate-x-6' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className={cn(
            'sticky bottom-0 px-6 py-4 border-t flex items-center justify-end gap-3',
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          )}
        >
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isDark
                ? 'text-slate-300 hover:bg-white/10'
                : 'text-slate-700 hover:bg-slate-100'
            )}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.name || formData.actions.length === 0 || isLoading}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
              isDark
                ? 'bg-indigo-500 text-white hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400'
            )}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {initialData ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AlertRulesManager({ workspaceId, className }: AlertRulesManagerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [incidentFilter, setIncidentFilter] = useState<IncidentFilter>('all');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // Data hooks
  const { data: rulesData, isLoading: rulesLoading, refetch: refetchRules } = useAlertRules({
    workspaceId,
  });
  const { data: incidentsData, isLoading: incidentsLoading, refetch: refetchIncidents } = useAlertIncidents({
    workspaceId,
    status: incidentFilter === 'all' ? undefined : incidentFilter,
    pollingInterval: 10000, // Poll every 10 seconds
  });
  const { createRule, updateRule, deleteRule, isCreating, isUpdating, isDeleting } = useAlertRuleMutations();
  const { acknowledge, resolve, silence, isAcknowledging, isResolving } = useIncidentActions();

  // Filtered data
  const filteredRules = useMemo(() => {
    if (!rulesData?.rules) return [];
    if (!searchQuery) return rulesData.rules;
    const query = searchQuery.toLowerCase();
    return rulesData.rules.filter(
      (rule) =>
        rule.name.toLowerCase().includes(query) ||
        rule.description?.toLowerCase().includes(query)
    );
  }, [rulesData?.rules, searchQuery]);

  const filteredIncidents = useMemo(() => {
    if (!incidentsData?.incidents) return [];
    if (!searchQuery) return incidentsData.incidents;
    const query = searchQuery.toLowerCase();
    return incidentsData.incidents.filter(
      (incident) =>
        incident.title.toLowerCase().includes(query) ||
        incident.message?.toLowerCase().includes(query) ||
        incident.ruleName?.toLowerCase().includes(query)
    );
  }, [incidentsData?.incidents, searchQuery]);

  const activeIncidentsCount = useMemo(() => {
    if (!incidentsData?.incidents) return 0;
    return incidentsData.incidents.filter((i) => i.status === 'active').length;
  }, [incidentsData?.incidents]);

  // Handlers
  const handleCreateRule = useCallback(
    async (data: RuleFormData) => {
      await createRule({
        ...data,
        workspaceId,
      });
      setShowRuleForm(false);
      refetchRules();
    },
    [createRule, workspaceId, refetchRules]
  );

  const handleUpdateRule = useCallback(
    async (data: RuleFormData) => {
      if (!editingRule) return;
      await updateRule({
        id: editingRule.id,
        ...data,
      });
      setEditingRule(null);
      refetchRules();
    },
    [updateRule, editingRule, refetchRules]
  );

  const handleDeleteRule = useCallback(
    async (ruleId: string) => {
      if (!confirm('Are you sure you want to delete this rule?')) return;
      await deleteRule(ruleId);
      refetchRules();
    },
    [deleteRule, refetchRules]
  );

  const handleToggleRule = useCallback(
    async (rule: AlertRule) => {
      await updateRule({
        id: rule.id,
        enabled: !rule.enabled,
      });
      refetchRules();
    },
    [updateRule, refetchRules]
  );

  const handleAcknowledge = useCallback(
    async (incidentId: string) => {
      await acknowledge(incidentId);
      refetchIncidents();
    },
    [acknowledge, refetchIncidents]
  );

  const handleResolve = useCallback(
    async (incidentId: string) => {
      await resolve(incidentId);
      refetchIncidents();
    },
    [resolve, refetchIncidents]
  );

  const handleSilence = useCallback(
    async (incidentId: string) => {
      await silence({ incidentId, durationMinutes: 60 });
      refetchIncidents();
    },
    [silence, refetchIncidents]
  );

  const isLoading = rulesLoading || incidentsLoading;
  const isMutating = isCreating || isUpdating || isDeleting || isAcknowledging || isResolving;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div
        className={cn(
          'flex-shrink-0 px-6 py-4 border-b',
          isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={cn('text-xl font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
              Alerts & Rules
            </h1>
            <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
              Configure alerting rules and manage incidents
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                refetchRules();
                refetchIncidents();
              }}
              disabled={isLoading}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
              )}
            >
              <RefreshCw
                className={cn(
                  'w-5 h-5',
                  isLoading && 'animate-spin',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}
              />
            </button>

            <button
              onClick={() => setShowRuleForm(true)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
                isDark
                  ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              )}
            >
              <Plus className="w-4 h-4" />
              Create Rule
            </button>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TabButton
              active={activeTab === 'rules'}
              onClick={() => setActiveTab('rules')}
              count={rulesData?.rules?.length}
              isDark={isDark}
            >
              <Bell className="w-4 h-4" />
              Rules
            </TabButton>
            <TabButton
              active={activeTab === 'incidents'}
              onClick={() => setActiveTab('incidents')}
              count={activeIncidentsCount}
              isDark={isDark}
            >
              <AlertTriangle className="w-4 h-4" />
              Incidents
            </TabButton>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search
                className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
                  isDark ? 'text-slate-500' : 'text-slate-400'
                )}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className={cn(
                  'w-64 pl-9 pr-4 py-2 rounded-lg border text-sm',
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                )}
              />
            </div>

            {/* Incident Filter */}
            {activeTab === 'incidents' && (
              <div className="flex items-center gap-1">
                {(['all', 'active', 'acknowledged', 'resolved'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setIncidentFilter(filter)}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-lg transition-colors capitalize',
                      incidentFilter === filter
                        ? isDark
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-900 text-white'
                        : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-white/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'rules' && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {filteredRules.length === 0 ? (
                <div
                  className={cn(
                    'text-center py-12 rounded-xl border',
                    isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                  )}
                >
                  <Bell
                    className={cn(
                      'w-12 h-12 mx-auto mb-4',
                      isDark ? 'text-slate-600' : 'text-slate-300'
                    )}
                  />
                  <h3 className={cn('text-lg font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                    No alert rules yet
                  </h3>
                  <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    Create your first rule to start monitoring
                  </p>
                  <button
                    onClick={() => setShowRuleForm(true)}
                    className={cn(
                      'mt-4 px-4 py-2 rounded-lg text-sm font-medium',
                      isDark
                        ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    )}
                  >
                    Create Rule
                  </button>
                </div>
              ) : (
                filteredRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    isDark={isDark}
                    onEdit={() => setEditingRule(rule)}
                    onDelete={() => handleDeleteRule(rule.id)}
                    onToggle={() => handleToggleRule(rule)}
                  />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'incidents' && (
            <motion.div
              key="incidents"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {filteredIncidents.length === 0 ? (
                <div
                  className={cn(
                    'text-center py-12 rounded-xl border',
                    isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                  )}
                >
                  <CheckCircle
                    className={cn(
                      'w-12 h-12 mx-auto mb-4',
                      isDark ? 'text-green-500' : 'text-green-500'
                    )}
                  />
                  <h3 className={cn('text-lg font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                    {incidentFilter === 'all' ? 'No incidents' : `No ${incidentFilter} incidents`}
                  </h3>
                  <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    All systems are operating normally
                  </p>
                </div>
              ) : (
                filteredIncidents.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    isDark={isDark}
                    onAcknowledge={() => handleAcknowledge(incident.id)}
                    onResolve={() => handleResolve(incident.id)}
                    onSilence={() => handleSilence(incident.id)}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rule Form Modal */}
      <AnimatePresence>
        {(showRuleForm || editingRule) && (
          <RuleFormModal
            isOpen={showRuleForm || !!editingRule}
            onClose={() => {
              setShowRuleForm(false);
              setEditingRule(null);
            }}
            onSave={editingRule ? handleUpdateRule : handleCreateRule}
            initialData={
              editingRule
                ? {
                    name: editingRule.name,
                    description: editingRule.description || '',
                    conditionType: editingRule.conditionType,
                    conditionConfig: editingRule.conditionConfig || {},
                    actions: editingRule.actions || [],
                    severity: editingRule.severity as any,
                    cooldownMinutes: editingRule.cooldownMinutes || 15,
                    enabled: editingRule.enabled,
                  }
                : undefined
            }
            isDark={isDark}
            isLoading={isMutating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

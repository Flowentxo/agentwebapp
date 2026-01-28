'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Activity,
  Settings,
  Globe,
  Brain,
  Code2,
  Thermometer,
  Clock,
  TrendingUp,
  DollarSign,
  Zap,
  CheckCircle,
  XCircle,
  FileText,
  Database,
  File,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  useDashboardStore,
  DashboardAgent,
  useFiles,
  type KnowledgeFileState,
} from '@/store/useDashboardStore';
import type { AgentConfig, AgentCapabilities } from '@/components/dashboard/types';

// ============================================================================
// AGENT DRAWER COMPONENT
// ============================================================================

interface AgentDrawerProps {
  agent: DashboardAgent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentDrawer({ agent, isOpen, onClose }: AgentDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');

  if (!agent) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${agent.color}20` }}
            >
              <div
                className="w-6 h-6 rounded-lg"
                style={{ backgroundColor: agent.color }}
              />
            </div>
            <div>
              <SheetTitle>{agent.name}</SheetTitle>
              <p className="text-sm text-zinc-400">{agent.role}</p>
            </div>
          </div>
          <SheetClose onClose={onClose} />
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="overview" className="flex-1 gap-2">
                <Activity className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="flex-1 gap-2">
                <Database className="w-4 h-4" />
                Knowledge
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab agent={agent} />
            </TabsContent>

            <TabsContent value="knowledge">
              <KnowledgeTab agent={agent} />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsTab agent={agent} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ agent }: { agent: DashboardAgent }) {
  const stats = [
    {
      icon: Activity,
      label: 'Requests (24h)',
      value: agent.requests24h.toLocaleString(),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Success Rate',
      value: `${agent.successRate24h}%`,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: Clock,
      label: 'Avg Response',
      value: `${(agent.avgResponseTime / 1000).toFixed(1)}s`,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: Zap,
      label: 'Tokens (24h)',
      value: agent.tokensUsed24h.toLocaleString(),
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
    },
    {
      icon: DollarSign,
      label: 'Cost Today',
      value: `$${agent.costToday.toFixed(2)}`,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Status:</span>
        <StatusBadge status={agent.status} />
      </div>

      {/* Current Task */}
      {agent.currentTask && (
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <p className="text-xs text-zinc-500 mb-1">Current Task</p>
          <p className="text-sm text-white font-medium">{agent.currentTask}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
              <span className="text-xs text-zinc-500">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-white tabular-nums">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Last Activity */}
      {agent.lastActivity && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Last Activity</span>
          <span className="text-zinc-400">
            {formatRelativeTime(agent.lastActivity)}
          </span>
        </div>
      )}

      {/* Current Config Summary */}
      <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
        <h4 className="text-sm font-medium text-white mb-3">Configuration</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Temperature</span>
            <span className="text-zinc-300">{agent.config.temperature}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Internet Access</span>
            <CapabilityIndicator enabled={agent.config.capabilities.internetAccess} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Long-term Memory</span>
            <CapabilityIndicator enabled={agent.config.capabilities.longTermMemory} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Code Execution</span>
            <CapabilityIndicator enabled={agent.config.capabilities.codeExecution} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS TAB
// ============================================================================

function SettingsTab({ agent }: { agent: DashboardAgent }) {
  const updateAgentConfig = useDashboardStore((state) => state.updateAgentConfig);
  const addToast = useDashboardStore((state) => state.addToast);

  const [localTemperature, setLocalTemperature] = useState(agent.config.temperature);

  const handleTemperatureChange = useCallback(
    (value: number) => {
      setLocalTemperature(value);
    },
    []
  );

  const handleTemperatureCommit = useCallback(() => {
    updateAgentConfig(agent.id, { temperature: localTemperature });
    addToast({
      message: `${agent.name}'s temperature updated to ${localTemperature}`,
      type: 'success',
    });
  }, [agent.id, agent.name, localTemperature, updateAgentConfig, addToast]);

  const handleCapabilityToggle = useCallback(
    (capability: keyof AgentCapabilities) => {
      const newValue = !agent.config.capabilities[capability];
      updateAgentConfig(agent.id, {
        capabilities: { [capability]: newValue },
      });
      addToast({
        message: `${getCapabilityLabel(capability)} ${newValue ? 'enabled' : 'disabled'} for ${agent.name}`,
        type: 'info',
      });
    },
    [agent.id, agent.name, agent.config.capabilities, updateAgentConfig, addToast]
  );

  return (
    <div className="space-y-8">
      {/* Temperature Control */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10">
            <Thermometer className="w-4 h-4 text-orange-400" />
          </div>
          <h4 className="text-sm font-medium text-white">Temperature</h4>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Creativity Level</span>
            <span className="text-sm font-mono text-white bg-zinc-800 px-2 py-0.5 rounded">
              {localTemperature.toFixed(1)}
            </span>
          </div>

          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localTemperature}
              onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
              onMouseUp={handleTemperatureCommit}
              onTouchEnd={handleTemperatureCommit}
              className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right,
                  hsl(220, 90%, 50%) 0%,
                  hsl(220, 90%, 50%) ${localTemperature * 100}%,
                  hsl(220, 10%, 20%) ${localTemperature * 100}%,
                  hsl(220, 10%, 20%) 100%)`,
              }}
            />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-zinc-600">Precise</span>
              <span className="text-[10px] text-zinc-600">Creative</span>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            {localTemperature <= 0.3
              ? 'Low temperature: More focused, deterministic responses.'
              : localTemperature <= 0.7
                ? 'Balanced: Good mix of accuracy and creativity.'
                : 'High temperature: More creative, varied responses.'}
          </p>
        </div>
      </div>

      {/* Capability Toggles */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-white">Capabilities</h4>

        <div className="space-y-3">
          <CapabilityToggle
            icon={Globe}
            label="Internet Access"
            description="Allow agent to search and browse the web"
            enabled={agent.config.capabilities.internetAccess}
            onToggle={() => handleCapabilityToggle('internetAccess')}
            color="text-blue-400"
            bgColor="bg-blue-500/10"
          />

          <CapabilityToggle
            icon={Brain}
            label="Long-term Memory"
            description="Remember context across conversations"
            enabled={agent.config.capabilities.longTermMemory}
            onToggle={() => handleCapabilityToggle('longTermMemory')}
            color="text-violet-400"
            bgColor="bg-violet-500/10"
          />

          <CapabilityToggle
            icon={Code2}
            label="Code Execution"
            description="Execute code snippets and scripts"
            enabled={agent.config.capabilities.codeExecution}
            onToggle={() => handleCapabilityToggle('codeExecution')}
            color="text-emerald-400"
            bgColor="bg-emerald-500/10"
          />
        </div>
      </div>

      {/* Advanced Settings Preview */}
      <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
        <h4 className="text-sm font-medium text-white mb-3">Advanced Settings</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Max Tokens</span>
            <span className="text-zinc-400">{agent.config.maxTokensPerRequest?.toLocaleString() || '4,000'}</span>
          </div>
          {agent.config.systemPromptOverride && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Custom Prompt</span>
              <span className="text-emerald-400 text-xs">Active</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// KNOWLEDGE TAB - Level 5: Agent Knowledge Access
// ============================================================================

function KnowledgeTab({ agent }: { agent: DashboardAgent }) {
  const files = useFiles();
  const toggleFileAccess = useDashboardStore((state) => state.toggleFileAccess);
  const addToast = useDashboardStore((state) => state.addToast);

  // Get files that are ready (not uploading or errored)
  const readyFiles = files.filter((f) => f.status === 'ready');

  // Count files this agent has access to
  const accessibleCount = readyFiles.filter((f) =>
    f.accessibleBy.includes(agent.id)
  ).length;

  const handleToggleAccess = useCallback(
    (file: KnowledgeFileState) => {
      toggleFileAccess(file.id, agent.id);
      const hasAccess = file.accessibleBy.includes(agent.id);
      addToast({
        message: hasAccess
          ? `Removed ${file.name} access from ${agent.name}`
          : `Granted ${file.name} access to ${agent.name}`,
        type: 'info',
      });
    },
    [agent.id, agent.name, toggleFileAccess, addToast]
  );

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return FileText;
      case 'csv':
        return FileSpreadsheet;
      case 'md':
      case 'txt':
        return FileCode;
      default:
        return File;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <Database className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Knowledge Access</p>
            <p className="text-xs text-violet-400/70">
              {accessibleCount} of {readyFiles.length} documents
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-violet-400">{accessibleCount}</p>
          <p className="text-[10px] text-violet-400/50 uppercase">Files</p>
        </div>
      </div>

      {/* Info Text */}
      <p className="text-xs text-zinc-500">
        Toggle which knowledge files this agent can access during conversations.
        Files with access will be used for RAG (Retrieval Augmented Generation).
      </p>

      {/* File List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white mb-3">Available Documents</h4>

        {readyFiles.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents in knowledge base</p>
            <p className="text-xs mt-1">Upload files via the Knowledge Manager</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {readyFiles.map((file, index) => {
              const FileIcon = getFileIcon(file.type);
              const hasAccess = file.accessibleBy.includes(agent.id);

              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    hasAccess
                      ? 'bg-violet-500/5 border-violet-500/20'
                      : 'bg-zinc-800/30 border-zinc-800 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        hasAccess ? 'bg-violet-500/20' : 'bg-zinc-800'
                      }`}
                    >
                      <FileIcon
                        className={`w-4 h-4 ${
                          hasAccess ? 'text-violet-400' : 'text-zinc-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          hasAccess ? 'text-white' : 'text-zinc-400'
                        }`}
                      >
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{file.chunks || 0} chunks</span>
                      </div>
                    </div>
                  </div>

                  <Switch
                    checked={hasAccess}
                    onChange={() => handleToggleAccess(file)}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Access Summary */}
      {accessibleCount > 0 && (
        <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-800">
          <p className="text-xs text-zinc-500">
            <span className="text-violet-400 font-medium">{agent.name}</span> has access to{' '}
            <span className="text-white font-medium">{accessibleCount}</span> document
            {accessibleCount !== 1 ? 's' : ''} totaling{' '}
            <span className="text-white font-medium">
              {readyFiles
                .filter((f) => f.accessibleBy.includes(agent.id))
                .reduce((sum, f) => sum + (f.chunks || 0), 0)
                .toLocaleString()}
            </span>{' '}
            chunks for context retrieval.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: DashboardAgent['status'] }) {
  const statusConfig = {
    idle: { label: 'Idle', color: 'bg-zinc-500', textColor: 'text-zinc-300' },
    working: { label: 'Working', color: 'bg-blue-500', textColor: 'text-blue-300' },
    paused: { label: 'Paused', color: 'bg-amber-500', textColor: 'text-amber-300' },
    offline: { label: 'Offline', color: 'bg-zinc-700', textColor: 'text-zinc-400' },
    error: { label: 'Error', color: 'bg-red-500', textColor: 'text-red-300' },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.textColor}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.color} ${status === 'working' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}

function CapabilityIndicator({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="flex items-center gap-1 text-emerald-400">
      <CheckCircle className="w-3.5 h-3.5" />
      <span className="text-xs">On</span>
    </span>
  ) : (
    <span className="flex items-center gap-1 text-zinc-500">
      <XCircle className="w-3.5 h-3.5" />
      <span className="text-xs">Off</span>
    </span>
  );
}

interface CapabilityToggleProps {
  icon: React.ElementType;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  color: string;
  bgColor: string;
}

function CapabilityToggle({
  icon: Icon,
  label,
  description,
  enabled,
  onToggle,
  color,
  bgColor,
}: CapabilityToggleProps) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
        enabled
          ? 'bg-muted/50 border-border'
          : 'bg-card border-border'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={enabled}
        onChange={() => onToggle()}
      />
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getCapabilityLabel(capability: keyof AgentCapabilities): string {
  const labels: Record<keyof AgentCapabilities, string> = {
    internetAccess: 'Internet Access',
    longTermMemory: 'Long-term Memory',
    codeExecution: 'Code Execution',
  };
  return labels[capability];
}

export default AgentDrawer;
